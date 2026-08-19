// Locks: any object prefixed "LOCK_" (see constants.js's LOCK_PREFIX) is a clickable lock
// mechanism, paired with a door and a required key (bare OBJ_ name) via the map's JSON sidecar.
// Unlike every other interactable in the game, a lock isn't activated with F - it still becomes
// the crosshair's activeInteractable the same way a door/switch/prop does (see
// interaction.js's updateInteractables()), so its promptText shows up same as anything else, but
// registerInteractable's onActivate is a deliberate no-op here. The actual unlock instead routes
// off its own mousedown listener below, gated on which hand clicked AND that hand currently
// wielding (see wield.js) the exact key this lock asks for - same "own mousedown listener,
// early-return unless my specific condition's met" pattern attack.js (swinging) and hold.js
// (picking up a world prop) each already use for routing a click by hand.
//
// Once unlocked (door.js's unlockDoor()), a lock has nothing left to do - the paired door just
// opens/closes normally off its own F prompt from then on, and clicking the lock again (with or
// without the key) is a silent no-op.

import * as THREE from "three";
import { canvas } from "./dom.js";
import { registerInteractable, activeInteractable } from "./interaction.js";
import { getWielded } from "./wield.js";
import { unlockDoor } from "./door.js";
import { listener, audioLoader, playOneShot } from "./audio.js";
import { registerSound, unregisterSound } from "./settings.js";
import { SWITCH_SOUND_REF_DISTANCE, OBJECT_PREFIX, LOCK_UNLOCK_VOLUME } from "./constants.js";

let locks = []; // [{ object, doorName, keyName, unlockSound }]

// Whether lock's required key is currently wielded in any slot (see wield.js) - checked against
// all three (not just handL/handR) since a key could in principle occupy the twoHand slot too
// (nothing stops a future 2-cell key), even though nothing in objects.js sizes one that way today.
function hasKeyWielded(lock) {
  return ["handL", "handR", "twoHand"].some((slotId) => {
    const instance = getWielded(slotId);
    return instance && instance.name === OBJECT_PREFIX + lock.keyName;
  });
}

function tryUnlock(handId) {
  if (document.pointerLockElement !== canvas) return;
  if (!activeInteractable) return;
  const lock = locks.find((l) => l.object === activeInteractable.object);
  if (!lock || lock.unlocked) return; // looking at something else, or this one's already done

  const slotId = getWielded("twoHand") ? "twoHand" : handId;
  const instance = getWielded(slotId);
  if (!instance || instance.name !== OBJECT_PREFIX + lock.keyName) return; // wrong (or no) key in that hand

  lock.unlocked = true;
  unlockDoor(lock.doorName);
  playOneShot(lock.unlockSound);
}

document.addEventListener("mousedown", (evt) => {
  if (evt.button === 0) tryUnlock("handL");
  else if (evt.button === 2) tryUnlock("handR");
});

// Called once per LOCK_-prefixed object from map.js's setupMap(), with its config from the map's
// JSON sidecar ({ door, key }, keyed by object name) - both required (a lock with neither would
// never unlock anything), so unlike door/drawer/light config nothing here falls back to a
// constants.js default.
export function setupLock(lockObj, lockCfg) {
  if (!lockCfg.door || !lockCfg.key) {
    console.warn(`"${lockObj.name}" is missing "door" and/or "key" in the map's JSON sidecar - it'll never unlock anything.`);
  }
  // interaction.js's updateInteractables() targets a lock the same way as everything else -
  // Box3.setFromObject() for proximity plus a raycast for the crosshair, both of which need real
  // geometry somewhere in this object's subtree. A LOCK_ modeled as a bare Blender Empty (no mesh
  // child) has none, so it can never become the activeInteractable at all - no prompt, no click,
  // nothing - which looks identical to a config problem but isn't one.
  let hasMesh = false;
  lockObj.traverse((child) => {
    if (child.isMesh) hasMesh = true;
  });
  if (!hasMesh) {
    console.warn(`"${lockObj.name}" has no mesh geometry (itself or nested) - it can never be looked at/clicked. Give it (or a child) an actual mesh, even a small invisible one.`);
  }

  const unlockSound = new THREE.PositionalAudio(listener);
  unlockSound.setRefDistance(SWITCH_SOUND_REF_DISTANCE);
  registerSound(unlockSound, "sfx", LOCK_UNLOCK_VOLUME);
  audioLoader.load("assets/sounds/DmMaj7.wav", (buffer) => unlockSound.setBuffer(buffer));
  lockObj.add(unlockSound);

  const lock = { object: lockObj, doorName: lockCfg.door, keyName: lockCfg.key, unlockSound, unlocked: false };
  locks.push(lock);

  registerInteractable(lockObj, {
    promptText: () => {
      if (lock.unlocked) return "[Click] Unlocked";
      return hasKeyWielded(lock) ? "[Click] Unlock" : "[Locked] Requires a key in hand";
    },
    onActivate: () => {}, // F does nothing here - see module comment
  });
}

// See menu.js's return-to-main-menu flow. setupLock() builds fresh ones on the next load.
export function resetLocks() {
  locks.forEach((lock) => unregisterSound(lock.unlockSound));
  locks = [];
}
