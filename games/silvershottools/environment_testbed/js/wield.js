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
import { cloneObjectTemplate, computeLocalCenterOffset, weaponStatsFor, configureInstanceLights } from "./objects.js";
import { playerStats } from "./playerConfig.js";

const wielded = { handL: null, handR: null, twoHand: null }; // slot id -> the camera-child instance currently shown, or null
// slot id -> the { targetPositionFn, rotationFn, centerOffset } an occupied slot was last
// equipped with, kept around only so reposeWielded() can redrive position/rotation from live
// playerStats values (e.g. while wieldDebug.js's tuning panel is open) without rebuilding the
// instance. centerOffset is captured once at equip time rather than recomputed on every repose -
// computeLocalCenterOffset() measures via the instance's *world* matrix, which only equals its
// local offset while it's still unparented (true at equip, before camera.add() below); calling
// it again after that would pick up the camera's own world position/rotation and throw the
// offset off by that entire amount.
const wieldPoseFns = { handL: null, handR: null, twoHand: null };

const wieldTarget = new THREE.Vector3();
const wieldQuat = new THREE.Quaternion();
const rotatedCenterOffset = new THREE.Vector3();
const twoHandBaseQuat = new THREE.Quaternion();
const twoHandTiltQuat = new THREE.Quaternion();
const TWOHAND_TILT_AXIS = new THREE.Vector3(0, 0, 1); // camera-local forward/back axis

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

// A two-handed item is posed differently depending on its weapons.json type (see
// objects.js's weaponStatsFor()) - a gun (playerStats.wield.twoHandGun) points forward like
// something aimed down its sights, while everything else (playerStats.wield.twoHand) lies
// across the view like something carried at the ready. Falls back to twoHand for "melee"/"prop"
// and anything else not specifically "gun".
function twoHandConfig(type) {
  return type === "gun" ? playerStats.wield.twoHandGun : playerStats.wield.twoHand;
}

// sideOffset mirrors the same way the rotation does (see twoHandRotation() below) - a
// two-handed item only has one instance, not a separate left/right one like oneHandTargetPosition,
// so shifting it off-center has to flip along with everything else on a hand-swap or it'd
// visibly jump sideways instead of just changing which end faces which hand.
function twoHandTargetPosition(type, mirrored) {
  const twoHand = twoHandConfig(type);
  const sign = mirrored ? -1 : 1;
  return wieldTarget.set(twoHand.sideOffset * sign, -twoHand.downOffset, -twoHand.distance);
}

// mirrored flips which end (e.g. a shovel's blade, or a gun's cant) ends up over which hand -
// lets a two-handed item be held left-to-right or right-to-left, per inventory.js's
// syncHandsFromGrid() (which direction maps to mirrored is arbitrary but consistent - see its
// comment). Negating the roll (Z) is the same trick oneHandRotation() uses to mirror between
// handL/handR.
//
// tiltAngle is applied as a separate roll around the camera's own forward axis, composed on
// top of (not folded into) that base orientation - since the item already spans left-to-right
// across the view at this point, rolling the whole thing around the axis pointing straight
// out of the screen is what actually tips one end up and the other down (mixing it into one of
// the base Euler angles instead turned out to mostly spin the item around its own long axis,
// which doesn't look like a slope at all). Mirrors the same way the base rotation does, so the
// upward angle flips along with everything else rather than needing separate tuning per side.
// (twoHandGun's tiltAngle is 0 - a forward-pointing item has no "which end is up" to slope.)
function twoHandRotation(type, mirrored) {
  const twoHand = twoHandConfig(type);
  const sign = mirrored ? -1 : 1;
  twoHandBaseQuat.setFromEuler(new THREE.Euler(twoHand.rotationX, twoHand.rotationY, twoHand.rotationZ * sign));
  twoHandTiltQuat.setFromAxisAngle(TWOHAND_TILT_AXIS, twoHand.tiltAngle * sign);
  return wieldQuat.multiplyQuaternions(twoHandTiltQuat, twoHandBaseQuat);
}

// Held by its visual center, same reasoning as hold.js's carried props - otherwise an object
// whose pivot isn't centered would appear to float off to one side. The offset has to be
// rotated into the wield tilt too, or it'd still be measured pre-tilt and the item would drift
// off-target as soon as the rotation is non-zero. Shared by equipSlot() (first pose) and
// reposeWielded() (every subsequent re-pose against live playerStats values) - centerOffset is
// passed in rather than recomputed here, see wieldPoseFns's comment above for why.
function applyPose(slotId, instance, targetPositionFn, rotationFn, centerOffset) {
  instance.quaternion.copy(rotationFn(slotId));
  rotatedCenterOffset.copy(centerOffset).applyQuaternion(instance.quaternion);
  instance.position.copy(targetPositionFn(slotId)).sub(rotatedCenterOffset);
}

// Rebuilds one wielded slot from scratch - simpler than diffing, and cheap enough given this
// runs from inventory.js's drag-and-drop/pickup flow, never per-frame - except
// syncHandsFromGrid() calls this after *every* inventory action, not just one that actually
// touches this slot, so without the same-item check below, moving some unrelated item around
// the grid would silently rebuild both hands from scratch on every click - discarding any
// runtime state a wielded instance had accumulated (e.g. a flashlight's on/off, see
// toggleWieldedLight()) even though nothing about what's wielded there actually changed.
function equipSlot(slotId, item, targetPositionFn, rotationFn) {
  const existing = wielded[slotId];

  // Same item still in this slot - just repose it (a two-handed item's mirrored direction can
  // still change without the item itself changing) rather than tearing it down and re-cloning a
  // fresh instance that would reset to its default state.
  if (existing && item && existing.userData.sourceItem === item) {
    const centerOffset = wieldPoseFns[slotId].centerOffset;
    applyPose(slotId, existing, targetPositionFn, rotationFn, centerOffset);
    wieldPoseFns[slotId] = { targetPositionFn, rotationFn, centerOffset };
    return;
  }

  if (existing) {
    // Not disposeObject3D()'d - clone(true) shares geometry/material with the library
    // template (and any other live clone of the same prop), so freeing them here would
    // corrupt everything else still using them. Those are only ever torn down together, by
    // objects.js's buildObjectLibrary()/resetSpawnedObjects() on a full scene reset.
    camera.remove(existing);
    wielded[slotId] = null;
    wieldPoseFns[slotId] = null;
  }
  if (!item) return;

  const instance = cloneObjectTemplate(item.name);
  if (!instance) return;
  instance.userData.sourceItem = item; // so a later equipSlot() call can tell this hasn't actually changed - see above
  instance.userData.weaponStats = weaponStatsFor(item.name); // read by attack.js's getWieldedStats()

  instance.traverse((child) => {
    if (child.isMesh) child.castShadow = true;
  });
  // A "light"-type item (see objects.js's weaponStatsFor()) carries a real THREE.Light exported
  // straight from Blender (KHR_lights_punctual) - configureInstanceLights() clamps its range,
  // starts it off, and fixes up its aim direction (see its own comment for why that's needed at
  // all), and hands back the light itself so toggleWieldedLight() below has something to flip
  // on/off later. Not shadow-casting (left at its GLTFLoader default of off) - fine for a
  // handheld beam, and a lot cheaper than a live shadow map recomputed every frame for
  // something the player carries everywhere.
  const light = configureInstanceLights(instance);
  instance.userData.light = light;

  // Must happen before camera.add() below, while instance is still unparented - see
  // wieldPoseFns's comment above.
  const centerOffset = computeLocalCenterOffset(instance);
  applyPose(slotId, instance, targetPositionFn, rotationFn, centerOffset);

  camera.add(instance);
  wielded[slotId] = instance;
  wieldPoseFns[slotId] = { targetPositionFn, rotationFn, centerOffset };
}

// Redrives every occupied slot's position/rotation from the current targetPositionFn/rotationFn
// (which read playerStats.wield/.twoHand/.twoHandGun live) without rebuilding the instance -
// called by wieldDebug.js's tuning panel after each slider/number-input edit so the change is
// visible immediately, without needing to unequip/re-equip anything.
export function reposeWielded() {
  for (const slotId in wielded) {
    const instance = wielded[slotId];
    const poseFns = wieldPoseFns[slotId];
    if (instance && poseFns) applyPose(slotId, instance, poseFns.targetPositionFn, poseFns.rotationFn, poseFns.centerOffset);
  }
}

// Called by inventory.js whenever the hand grid's contents change. Exactly one of
// (handL and/or handR) or twoHand is ever non-null at a time - a two-handed item occupies both
// hand cells, so inventory.js never reports both shapes from the same grid state.
export function syncHands({ handL, handR, twoHand, twoHandMirrored }) {
  equipSlot("handL", handL, oneHandTargetPosition, oneHandRotation);
  equipSlot("handR", handR, oneHandTargetPosition, oneHandRotation);
  const twoHandType = twoHand ? weaponStatsFor(twoHand.name).type : null;
  equipSlot(
    "twoHand",
    twoHand,
    () => twoHandTargetPosition(twoHandType, twoHandMirrored),
    () => twoHandRotation(twoHandType, twoHandMirrored)
  );
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

// Flips a "light"-type wielded item's light on/off - see objects.js's weaponStatsFor() and
// attack.js's tryAttack(), which calls this instead of swinging/firing for that type. A no-op
// if nothing's wielded in that slot, or what's there isn't a "light" (no light was found to
// store on .userData.light at equip time - see equipSlot()).
export function toggleWieldedLight(slotId) {
  const instance = wielded[slotId];
  if (instance && instance.userData.light) instance.userData.light.visible = !instance.userData.light.visible;
}
