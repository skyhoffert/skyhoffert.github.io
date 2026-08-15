// Wielding: whatever sits in the inventory's hand grid (see inventory.js) is shown attached to
// the camera - a fixed viewmodel, unlike a hand-carried prop (see hold.js) which has a real
// physics body and can lag, collide, or be thrown. There's no separate equip/holster action - a
// hand slot's contents and what's wielded are always in sync, driven entirely by inventory.js
// calling syncHands() whenever the hand grid's contents change.
//
// A one-handed item sits in a single hand slot (handL/handR), offset to that side. A
// two-handed item spans both hand cells at once (see inventory.js's grid) and is wielded as one
// centered instance instead - see the "twoHand" slot below.

import * as THREE from "three";
import { camera } from "./scene.js";
import { cloneObjectTemplate, computeLocalCenterOffset, weaponStatsFor } from "./objects.js";
import { playerStats } from "./playerConfig.js";

const wielded = { handL: null, handR: null, twoHand: null }; // slot id -> the camera-child instance currently shown, or null

const wieldTarget = new THREE.Vector3();
const wieldQuat = new THREE.Quaternion();
const rotatedCenterOffset = new THREE.Vector3();

function oneHandTargetPosition(slotId) {
  const wield = playerStats.wield;
  return wieldTarget.set(slotId === "handL" ? -wield.sideOffset : wield.sideOffset, -wield.downOffset, -wield.distance);
}

// handL gets the roll (Z) negated - see playerConfig.js.
function oneHandRotation(slotId) {
  const wield = playerStats.wield;
  const zSign = slotId === "handL" ? -1 : 1;
  return wieldQuat.setFromEuler(new THREE.Euler(wield.rotationX, wield.rotationY, wield.rotationZ * zSign));
}

function twoHandTargetPosition() {
  const twoHand = playerStats.wield.twoHand;
  return wieldTarget.set(0, -twoHand.downOffset, -twoHand.distance);
}

function twoHandRotation() {
  const twoHand = playerStats.wield.twoHand;
  return wieldQuat.setFromEuler(new THREE.Euler(twoHand.rotationX, twoHand.rotationY, twoHand.rotationZ));
}

// Rebuilds one wielded slot from scratch - simpler than diffing, and cheap enough given this
// only ever runs from inventory.js's drag-and-drop/pickup flow, never per-frame.
function equipSlot(slotId, item, targetPositionFn, rotationFn) {
  const existing = wielded[slotId];
  if (existing) {
    // Not disposeObject3D()'d - clone(true) shares geometry/material with the library
    // template (and any other live clone of the same prop), so freeing them here would
    // corrupt everything else still using them. Those are only ever torn down together, by
    // objects.js's buildObjectLibrary()/resetSpawnedObjects() on a full scene reset.
    camera.remove(existing);
    wielded[slotId] = null;
  }
  if (!item) return;

  const instance = cloneObjectTemplate(item.name);
  if (!instance) return;
  instance.userData.weaponStats = weaponStatsFor(item.name); // read by attack.js's getWieldedStats()

  instance.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });

  // Held by its visual center, same reasoning as hold.js's carried props - otherwise an
  // object whose pivot isn't centered would appear to float off to one side. The offset has
  // to be rotated into the wield tilt too, or it'd still be measured pre-tilt and the item
  // would drift off-target as soon as the rotation is non-zero.
  const centerOffset = computeLocalCenterOffset(instance);
  instance.quaternion.copy(rotationFn(slotId));
  rotatedCenterOffset.copy(centerOffset).applyQuaternion(instance.quaternion);
  instance.position.copy(targetPositionFn(slotId)).sub(rotatedCenterOffset);

  camera.add(instance);
  wielded[slotId] = instance;
}

// Called by inventory.js whenever the hand grid's contents change. Exactly one of
// (handL and/or handR) or twoHand is ever non-null at a time - a two-handed item occupies both
// hand cells, so inventory.js never reports both shapes from the same grid state.
export function syncHands({ handL, handR, twoHand }) {
  equipSlot("handL", handL, oneHandTargetPosition, oneHandRotation);
  equipSlot("handR", handR, oneHandTargetPosition, oneHandRotation);
  equipSlot("twoHand", twoHand, twoHandTargetPosition, twoHandRotation);
}

// The instance currently wielded in handL/handR/twoHand, or null - used by attack.js to know
// whether a click should swing (something's wielded) or fall through to hold.js's pickup/carry.
export function getWielded(slotId) {
  return wielded[slotId];
}

// The full weapons.json stats (see objects.js's weaponStatsFor()) of whatever's wielded in a
// slot, or null if nothing is.
export function getWieldedStats(slotId) {
  const instance = wielded[slotId];
  return instance ? instance.userData.weaponStats : null;
}

// Whether a hand is unavailable for hand-carrying a world prop (see hold.js's tryPickUp) -
// true if that hand has its own one-handed item, or a two-handed item has both hands busy.
export function isHandBusy(handId) {
  return !!wielded.twoHand || !!wielded[handId];
}
