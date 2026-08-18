// Attacking: clicking with a hand that's currently wielding something (see wield.js) attacks
// with it, per its weapons.json stats (see objects.js's weaponStatsFor()) - a "melee" item gets
// a timed swing-and-cooldown animation using its own cooldownTime/swingTime/swingArc/swingLunge
// (no hit detection yet), a "gun" flashes "BANG" on screen on its own cooldownTime (no
// ammo/reload modeling yet - see showBang()), a "light" flips its light on/off with no cooldown
// at all (see wield.js's toggleWieldedLight()), and a "prop" does nothing (can't be attacked
// with). Clicking with an empty hand still does the old pickup/carry click instead (see
// hold.js's tryPickUp(), which declines to fire while that hand's wielding).
//
// A two-handed item (wield.js's "twoHand" slot) has no independent per-hand state - clicking
// either mouse button attacks with the same shared instance, so both route to the "twoHand"
// slot instead of "handL"/"handR" whenever one's equipped.

import * as THREE from "three";
import { canvas } from "./dom.js";
import { getWielded, getWieldedStats, toggleWieldedLight } from "./wield.js";
import { puzzleActive } from "./puzzle.js";
import { BANG_TEXT_TIME } from "./constants.js";

const bangEl = document.getElementById("bangText");
let bangTimer = null;

function showBang() {
  bangEl.classList.add("visible");
  clearTimeout(bangTimer);
  bangTimer = setTimeout(() => bangEl.classList.remove("visible"), BANG_TEXT_TIME * 1000);
}

const SLOTS = ["handL", "handR", "twoHand"];

function slotState() {
  return {
    instance: null, // the wielded instance this state's base pose was captured from
    stats: null, // that instance's weapons.json stats (see wield.js's getWieldedStats())
    basePosition: new THREE.Vector3(),
    baseQuaternion: new THREE.Quaternion(),
    swinging: false,
    swingT: 0, // seconds into the current swing
    cooldownT: 0, // seconds left before another swing can start
  };
}

const states = { handL: slotState(), handR: slotState(), twoHand: slotState() };
const SWING_AXIS = new THREE.Vector3(1, 0, 0); // the item's own local X - a downward chop
const LOCAL_FORWARD = new THREE.Vector3(0, 0, -1); // "forward" in the item's camera-local space
const swingQuat = new THREE.Quaternion();

function tryAttack(handId) {
  if (document.pointerLockElement !== canvas || puzzleActive) return; // hands are busy with a puzzle - see puzzle.js
  const slotId = getWielded("twoHand") ? "twoHand" : handId;
  const stats = getWieldedStats(slotId);
  if (!stats || stats.type === "prop") return; // nothing wielded, or can't be attacked with (e.g. a book)

  // No cooldown gate at all - unlike a swing/shot, toggling a light on/off should never be
  // rate-limited, and there's no per-slot "busy" animation state for it to conflict with either.
  if (stats.type === "light") {
    toggleWieldedLight(slotId);
    return;
  }

  const state = states[slotId];
  if (state.cooldownT > 0) return;

  if (stats.type === "gun") {
    showBang();
    state.cooldownT = stats.cooldownTime;
    return;
  }

  if (state.swinging) return;
  state.swinging = true;
  state.swingT = 0;
}

document.addEventListener("mousedown", (evt) => {
  if (evt.button === 0) tryAttack("handL");
  else if (evt.button === 2) tryAttack("handR");
});

// Must run every frame - see main.js's animate(). Re-baselines a hand's pose whenever its
// wielded instance changes (equipped/un-equipped/swapped - see wield.js) and, while swinging,
// layers a chop-and-return rotation plus a small forward lunge on top of that base pose.
export function updateAttacks(dt) {
  for (const slotId of SLOTS) {
    const state = states[slotId];
    const instance = getWielded(slotId);

    if (instance !== state.instance) {
      state.instance = instance;
      state.stats = getWieldedStats(slotId); // captured once per equip, not read fresh every frame
      state.swinging = false;
      state.swingT = 0;
      state.cooldownT = 0;
      if (instance) {
        state.basePosition.copy(instance.position);
        state.baseQuaternion.copy(instance.quaternion);
      }
    }
    if (!instance) continue;

    if (state.cooldownT > 0) state.cooldownT = Math.max(0, state.cooldownT - dt);

    if (state.swinging) {
      state.swingT += dt;
      if (state.swingT >= state.stats.swingTime) {
        state.swinging = false;
        state.swingT = 0;
        state.cooldownT = state.stats.cooldownTime;
        instance.position.copy(state.basePosition);
        instance.quaternion.copy(state.baseQuaternion);
        continue;
      }
      const curve = Math.sin((state.swingT / state.stats.swingTime) * Math.PI); // 0 -> 1 -> 0 across the swing
      const swingSign = slotId === "handR" ? -1 : 1; // mirrors the chop for the right hand, like an opposite wrist twist
      swingQuat.setFromAxisAngle(SWING_AXIS, curve * state.stats.swingArc * swingSign);
      instance.quaternion.copy(state.baseQuaternion).multiply(swingQuat);
      instance.position.copy(state.basePosition).addScaledVector(LOCAL_FORWARD, curve * state.stats.swingLunge);
    }
  }
}
