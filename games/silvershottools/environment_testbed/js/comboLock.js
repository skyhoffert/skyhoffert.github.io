// Combination locks: any object prefixed "COMBOLOCK_" (see constants.js's COMBOLOCK_PREFIX)
// becomes a focus-mode puzzle - pressing F on it (like a door/switch/drawer) enters puzzle.js's
// focus mode instead of doing anything by itself, and from then on the scroll wheel turns
// whichever of its own "DIAL_" children (any number - a lock's dial count is however many it has,
// not a fixed constant) is under the crosshair, one digit (0-9) per notch. Every dial change
// re-checks the combo (see the map's JSON sidecar, keyed by object name) and logs the result, but
// nothing unlocks yet - the check that actually matters happens the moment the player leaves
// focus (F again, Escape, or losing pointer lock - see beginComboLock()'s enterPuzzle() callback):
// if every dial reads cfg.combo at that instant, the paired door and/or drawer (cfg.door/
// cfg.drawer - door.js's unlockDoor()/drawer.js's unlockDrawer(), at least one expected) unlocks,
// same as a real combination padlock only actually opening once you pull on it. The lock object
// itself lingers a moment longer than that to play its "PIN" child's slide/rotate/shrink retract
// animation (see startSolve()/updatePinAnimation()) before being torn down and removed from the
// world - there's nothing left to click.
//
// Each dial's *target* rotation is tracked unwrapped (can grow past a full turn, or go negative)
// rather than wrapped to [0, 2*PI) - scrolling past digit 9 back to 0 should read as the dial
// clicking one more notch forward, not spinning almost all the way back around, and an unwrapped
// target plus updateComboLocks()'s door.js-style per-frame easing (always chasing a target at
// most one notch away) gets that for free.
//
// While focused, the whole lock object is pulled out of the world and placed at a fixed point in
// world space right in front of wherever the camera was looking the instant focus began (see
// focusLock()) - close, centered, and scaled up so its dials actually read - then handed back to
// wherever it was (same parent, same local position/rotation/scale) the moment focus ends (see
// unfocusLock()), solved or not. It's a one-time snapshot, not a live attachment to the camera
// (unlike wield.js's camera.add(instance) for held items) - the object itself doesn't move again
// until unfocusLock(), so the player can turn their head afterward to look at whichever dial they
// actually want, rather than it staying pinned dead-center no matter which way they look. That
// means a COMBOLOCK_ object needs to be modeled facing its own local -Z at whatever its neutral
// (identity local rotation) pose is - focusLock() matches the camera's orientation at that
// instant rather than preserving whatever angle it happened to be sitting at in the world, so it
// always presents face-on to the player at the moment they focus it.
//
// A COMBOLOCK_ object is a real visible prop (unlike LOCK_'s invisible click target - see
// lock.js's module comment) - don't give it a COLL_ child for clip-prevention, since there's no
// way yet to tear down a static physics body once this object's removed on solve (see
// finishSolve() below); it'd leave an invisible wall behind.

import * as THREE from "three";
import { scene, camera } from "./scene.js";
import { registerInteractable, unregisterInteractable } from "./interaction.js";
import { enterPuzzle } from "./puzzle.js";
import { unlockDoor } from "./door.js";
import { unlockDrawer } from "./drawer.js";
import { listener, audioLoader, playOneShot } from "./audio.js";
import { registerSound, unregisterSound } from "./settings.js";
import { disposeObject3D } from "./util.js";
import { playerStats } from "./playerConfig.js";
import {
  SWITCH_SOUND_REF_DISTANCE,
  COMBOLOCK_DIAL_PREFIX,
  COMBOLOCK_DIAL_AXIS,
  COMBOLOCK_DIAL_SPEED,
  COMBOLOCK_PIN_NAME,
  COMBOLOCK_PIN_SLIDE_AXIS,
  COMBOLOCK_PIN_SLIDE_DISTANCE,
  COMBOLOCK_PIN_SLIDE_SPEED,
  COMBOLOCK_PIN_ROTATE_AXIS,
  COMBOLOCK_PIN_ROTATE_ANGLE,
  COMBOLOCK_PIN_ROTATE_SPEED,
  COMBOLOCK_PIN_SHRINK_DURATION,
  COMBOLOCK_CLICK_VOLUME,
  COMBOLOCK_UNLOCK_VOLUME,
  COMBOLOCK_FOCUS_DISTANCE,
  COMBOLOCK_FOCUS_DROP,
  COMBOLOCK_FOCUS_SIDE,
  COMBOLOCK_FOCUS_SCALE,
} from "./constants.js";

const DIGIT_ANGLE = (Math.PI * 2) / 10; // radians per digit - 10 digits (0-9) around a full turn

let comboLocks = []; // [{ object, axisKey, speed, dials, combo, doorName, drawerName, clickSound, unlockSound, solved, pin, pinAnim }]
let activeLock = null; // whichever lock is currently focused (see puzzle.js), or null

const dialRaycaster = new THREE.Raycaster();
const dialForward = new THREE.Vector3();

// Scratch for focusLock()'s one-time snapshot of the camera's current orientation - reused, not
// per-call, since focusLock() is never reentrant with itself.
const focusQuat = new THREE.Quaternion();
const focusForward = new THREE.Vector3();
const focusUp = new THREE.Vector3();
const focusRight = new THREE.Vector3();
const focusWorldScale = new THREE.Vector3();

// Which of activeLock's own dials (if any) is directly under the crosshair right now - scoped to
// just this lock's own dial meshes, not the global interactables list, since once focused the
// player's aiming at a sub-part of one object rather than picking a new interactable.
function hoveredDial(lock) {
  camera.getWorldDirection(dialForward);
  dialRaycaster.set(camera.position, dialForward);
  dialRaycaster.far = playerStats.interactRadius;
  const hits = dialRaycaster.intersectObjects(
    lock.dials.map((d) => d.mesh),
    false // each DIAL_ mesh is expected to carry its own geometry directly, not on some nested child
  );
  if (hits.length === 0) return null;
  return lock.dials.find((d) => d.mesh === hits[0].object);
}

// Pulls lock.object out of wherever it's sitting in the map and places it at a fixed point in
// front of the camera's current position/orientation, close/centered/scaled up - see the module
// comment. lock.saved* remembers where it actually belongs so unfocusLock() can put it back
// exactly.
function focusLock(lock) {
  lock.savedParent = lock.object.parent;
  lock.savedPosition.copy(lock.object.position);
  lock.savedQuaternion.copy(lock.object.quaternion);
  lock.savedScale.copy(lock.object.scale);
  // The object's *world* scale, not its own local .scale - it may sit under a parent (furniture,
  // an export-scale root, ...) that isn't itself scale 1, and reparenting to the scene root below
  // drops that inherited scale, so local scale alone would come out wrong-sized once focused.
  // Same gotcha physics.js's worldInverseNoScale() calls out for door/drawer colliders. Reads
  // lock.object.matrixWorld, which is already current - nothing's moved it since the last render.
  lock.object.getWorldScale(focusWorldScale);

  // One-time snapshot of the camera's current position/orientation - see the module comment on
  // why this isn't a live camera.add() like wield.js's held items.
  camera.getWorldQuaternion(focusQuat);
  camera.getWorldDirection(focusForward);
  focusUp.set(0, 1, 0).applyQuaternion(focusQuat);
  focusRight.set(1, 0, 0).applyQuaternion(focusQuat);

  scene.add(lock.object); // reparented to the scene root, not camera - local === world from here
  lock.object.position
    .copy(camera.position)
    .addScaledVector(focusForward, COMBOLOCK_FOCUS_DISTANCE)
    .addScaledVector(focusUp, -COMBOLOCK_FOCUS_DROP)
    .addScaledVector(focusRight, COMBOLOCK_FOCUS_SIDE);
  lock.object.quaternion.copy(focusQuat);
  lock.object.scale.copy(focusWorldScale).multiplyScalar(COMBOLOCK_FOCUS_SCALE);
  // Forces matrixWorld current right away rather than waiting for the next render() - without
  // this, a wheel event arriving before that render (unlikely, but possible) would raycast
  // against this object's stale pre-focus matrixWorld. Same reasoning as door.js/drawer.js's own
  // updateMatrixWorld(true) call right after positioning, just for a raycast instead of physics.
  lock.object.updateMatrixWorld(true);
}

function unfocusLock(lock) {
  lock.savedParent.add(lock.object); // detaches from the scene root automatically, same as above
  lock.object.position.copy(lock.savedPosition);
  lock.object.quaternion.copy(lock.savedQuaternion);
  lock.object.scale.copy(lock.savedScale);
}

function beginComboLock(lock) {
  if (lock.solved) return; // shouldn't happen - finishSolve() removes the object from the world
  activeLock = lock;
  focusLock(lock);
  enterPuzzle(() => {
    unfocusLock(lock);
    activeLock = null;
    // The actual solve check - see the module comment on why this happens here rather than the
    // instant every dial happens to line up mid-scroll.
    if (comboMatches(lock)) startSolve(lock);
  });
}

function comboMatches(lock) {
  return lock.dials.every((dial, i) => dial.digit === lock.combo[i]);
}

// "x"/"y"/"z", optionally "-" prefixed for the opposite direction - same convention as
// drawer.js's own axis fields, just duplicated here since only the pin animation below needs it.
function parseSignedAxis(axisStr) {
  const s = String(axisStr).trim().toLowerCase();
  const sign = s.startsWith("-") ? -1 : 1;
  return { key: s.replace(/^[+-]/, ""), sign };
}

function finishSolve(lock) {
  unregisterInteractable(lock.object);
  lock.object.removeFromParent();
  disposeObject3D(lock.object);
}

// Called once (from beginComboLock()'s enterPuzzle() callback above) the instant the player
// leaves focus with every dial reading lock.combo. Unlocks the paired door/drawer and plays the
// unlock sound right away, but if this lock has a "PIN" child (see constants.js's
// COMBOLOCK_PIN_NAME - optional, so an older/simpler lock without one just disappears instantly)
// the lock prop itself lingers a moment longer to play that pin's slide/rotate/shrink retract
// animation (see updatePinAnimation(), driven from updateComboLocks() below) before finishSolve()
// actually tears it down.
function startSolve(lock) {
  lock.solved = true;
  if (lock.doorName) unlockDoor(lock.doorName);
  if (lock.drawerName) unlockDrawer(lock.drawerName);
  playOneShot(lock.unlockSound);

  if (!lock.pin) {
    finishSolve(lock);
    return;
  }

  const slide = parseSignedAxis(COMBOLOCK_PIN_SLIDE_AXIS);
  const rotate = parseSignedAxis(COMBOLOCK_PIN_ROTATE_AXIS);
  lock.pinAnim = {
    phase: "slide", // "slide" -> "rotate" -> "shrink" -> finishSolve()
    slideAxisKey: slide.key,
    slideTarget: lock.pin.position[slide.key] + slide.sign * COMBOLOCK_PIN_SLIDE_DISTANCE,
    rotateAxisKey: rotate.key,
    rotateTarget: lock.pin.rotation[rotate.key] + rotate.sign * COMBOLOCK_PIN_ROTATE_ANGLE,
  };
}

// Advances lock.pinAnim by one frame - called from updateComboLocks() instead of that lock's
// usual dial-easing once it's solved. slide/rotate chase their target the same min-step-per-frame
// way door.js/drawer.js/this file's own dial easing already does, applied to just the pin's
// position/rotation; shrink then scales the *whole* lock.object (dials, pin, body and all) away,
// not just the pin, so the entire prop disappears rather than leaving a shrunken pin sitting in a
// full-sized lock.
function updatePinAnimation(lock, dt) {
  const anim = lock.pinAnim;
  const pin = lock.pin;
  if (anim.phase === "slide") {
    const current = pin.position[anim.slideAxisKey];
    const diff = anim.slideTarget - current;
    if (Math.abs(diff) > 0.0005) {
      pin.position[anim.slideAxisKey] = current + Math.sign(diff) * Math.min(Math.abs(diff), COMBOLOCK_PIN_SLIDE_SPEED * dt);
      return;
    }
    pin.position[anim.slideAxisKey] = anim.slideTarget;
    anim.phase = "rotate";
    return;
  }
  if (anim.phase === "rotate") {
    const current = pin.rotation[anim.rotateAxisKey];
    const diff = anim.rotateTarget - current;
    if (Math.abs(diff) > 0.001) {
      pin.rotation[anim.rotateAxisKey] = current + Math.sign(diff) * Math.min(Math.abs(diff), COMBOLOCK_PIN_ROTATE_SPEED * dt);
      return;
    }
    pin.rotation[anim.rotateAxisKey] = anim.rotateTarget;
    anim.phase = "shrink";
    anim.shrinkStartScale = lock.object.scale.x; // whatever the lock's current (focus-restored) scale happens to be - shrinks from there to 0 over a fixed duration rather than a fixed units/sec speed, since that scale can be tiny (a units/sec shrink finished in a couple frames)
    anim.shrinkElapsed = 0;
    return;
  }
  // phase === "shrink" - assumes the lock's modeled scale is uniform (x/y/z alike), same as the
  // COMBOLOCK_FOCUS_SCALE assumption elsewhere in this file.
  anim.shrinkElapsed += dt;
  if (anim.shrinkElapsed < COMBOLOCK_PIN_SHRINK_DURATION) {
    const scale = anim.shrinkStartScale * (1 - anim.shrinkElapsed / COMBOLOCK_PIN_SHRINK_DURATION);
    lock.object.scale.setScalar(scale);
    return;
  }
  lock.pinAnim = null;
  finishSolve(lock);
}

document.addEventListener(
  "wheel",
  (evt) => {
    if (!activeLock) return; // only ever set while puzzle.js's focus mode is active - see beginComboLock()
    const dial = hoveredDial(activeLock);
    if (!dial) return;
    evt.preventDefault();

    const dir = evt.deltaY > 0 ? 1 : -1;
    dial.digit = ((dial.digit + dir) % 10 + 10) % 10;
    dial.rotation += dir * DIGIT_ANGLE;
    playOneShot(activeLock.clickSound);
  },
  { passive: false }
);

// Called once per COMBOLOCK_-prefixed object from map.js's setupMap(), with its config from the
// map's JSON sidecar ({ combo: [n, n, ...], door?, drawer?, axis?, dialSpeed? }, keyed by object
// name) - combo's length is expected to match however many DIAL_ children this object actually
// has; axis/dialSpeed fall back to constants.js's COMBOLOCK_DIAL_AXIS/COMBOLOCK_DIAL_SPEED, same
// as door/drawer's own per-instance overrides.
export function setupComboLock(lockObj, cfg) {
  const dialObjs = [];
  lockObj.traverse((child) => {
    if (child !== lockObj && child.name.startsWith(COMBOLOCK_DIAL_PREFIX)) dialObjs.push(child);
  });
  dialObjs.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  if (dialObjs.length === 0) {
    console.warn(`"${lockObj.name}" has no "${COMBOLOCK_DIAL_PREFIX}" children - it has no dials to turn.`);
  }
  if (!Array.isArray(cfg.combo) || cfg.combo.length !== dialObjs.length) {
    console.warn(`"${lockObj.name}"'s combo (map's JSON sidecar) has ${Array.isArray(cfg.combo) ? cfg.combo.length : 0} digit(s) but it has ${dialObjs.length} dial(s) - they'll never line up.`);
  }
  if (!cfg.door && !cfg.drawer) {
    console.warn(`"${lockObj.name}" has no "door" or "drawer" in the map's JSON sidecar - solving it won't unlock anything.`);
  }

  let pin = null;
  lockObj.traverse((child) => {
    if (child !== lockObj && child.name === COMBOLOCK_PIN_NAME) pin = child;
  });
  if (!pin) {
    console.warn(`"${lockObj.name}" has no "${COMBOLOCK_PIN_NAME}" child - solving it won't play the pin-retract animation, it'll just disappear.`);
  }

  const axisKey = String(cfg.axis ?? COMBOLOCK_DIAL_AXIS).replace(/^-/, "");
  // baseRotation anchors "digit 0" to whatever the mesh's own modeled rotation already is on the
  // spin axis, rather than assuming it's exactly 0 - a dial's neutral/digit-0 pose is whatever
  // Blender authored it as, and the mesh shouldn't visibly snap away from that the moment the
  // scene loads just because the baked rotation isn't precisely zero.
  const dials = dialObjs.map((mesh) => ({ mesh, digit: 0, rotation: 0, baseRotation: mesh.rotation[axisKey] }));

  // Reuses the switch's click sound for a dial notch - a combination lock turning over reads
  // close enough to that existing asset that there's no need for a dedicated one yet.
  const clickSound = new THREE.PositionalAudio(listener);
  const unlockSound = new THREE.PositionalAudio(listener);
  clickSound.setRefDistance(SWITCH_SOUND_REF_DISTANCE);
  unlockSound.setRefDistance(SWITCH_SOUND_REF_DISTANCE);
  registerSound(clickSound, "sfx", COMBOLOCK_CLICK_VOLUME); // quieter than unlockSound - every dial notch plays it, so full volume gets grating fast
  registerSound(unlockSound, "sfx", COMBOLOCK_UNLOCK_VOLUME);
  audioLoader.load("assets/sounds/click.wav", (buffer) => clickSound.setBuffer(buffer));
  audioLoader.load("assets/sounds/Dm_Inversion.wav", (buffer) => unlockSound.setBuffer(buffer));
  lockObj.add(clickSound);
  lockObj.add(unlockSound);

  const lock = {
    object: lockObj,
    axisKey,
    speed: cfg.dialSpeed ?? COMBOLOCK_DIAL_SPEED,
    dials,
    combo: Array.isArray(cfg.combo) ? cfg.combo : [],
    doorName: cfg.door || null,
    drawerName: cfg.drawer || null,
    clickSound,
    unlockSound,
    solved: false,
    pin, // the "PIN" child, if any - see startSolve()/updatePinAnimation()
    pinAnim: null, // non-null while that retract animation is playing - see updateComboLocks()
    // Where lock.object actually lives in the map - captured fresh each time focusLock() pulls
    // it onto the camera, restored by unfocusLock(). Preallocated (not reassigned) so
    // focus/unfocus never needs to allocate.
    savedParent: null,
    savedPosition: new THREE.Vector3(),
    savedQuaternion: new THREE.Quaternion(),
    savedScale: new THREE.Vector3(),
  };
  comboLocks.push(lock);

  registerInteractable(lockObj, {
    promptText: () => "[F] Try combination",
    onActivate: () => beginComboLock(lock),
  });
}

// See menu.js's return-to-main-menu flow. setupComboLock() builds fresh ones on the next load.
export function resetComboLocks() {
  comboLocks.forEach((lock) => {
    unregisterSound(lock.clickSound);
    unregisterSound(lock.unlockSound);
  });
  comboLocks = [];
  activeLock = null;
}

export function updateComboLocks(dt) {
  comboLocks.forEach((lock) => {
    if (lock.pinAnim) {
      updatePinAnimation(lock, dt);
      return;
    }
    if (lock.solved) return; // no pin (or its animation already finished) - object's already been removed from the scene
    lock.dials.forEach((dial) => {
      const diff = dial.baseRotation + dial.rotation - dial.mesh.rotation[lock.axisKey];
      if (Math.abs(diff) > 0.001) {
        dial.mesh.rotation[lock.axisKey] += Math.sign(diff) * Math.min(Math.abs(diff), lock.speed * dt);
      }
    });
  });
}
