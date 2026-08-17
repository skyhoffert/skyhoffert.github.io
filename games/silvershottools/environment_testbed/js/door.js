// Doors: any object prefixed "DOOR_" (see constants.js's DOOR_PREFIX) becomes its own
// independent open/close state machine plus its own kinematic collision body and positional
// open/close sounds. Wired up by map.js once the map's loaded and each door's COLL_ children
// are found - one setupDoor() call per door object, each with its own openAngle/speed from the
// map's JSON sidecar (falling back to constants.js's DOOR_OPEN_ANGLE/DOOR_SPEED for whatever it
// doesn't customize).
//
// A door can optionally start locked (doorCfg.locked) - while locked, F does nothing (see
// toggleDoor() below). Nothing in this module ever clears .locked itself; that's lock.js's job -
// a paired LOCK_ object (see its own module comment) unlocks this door by name once the player
// clicks it while wielding the right key. Once cleared, a door behaves exactly like one that was
// never locked - there's no re-lock mechanic.

import * as THREE from "three";
import * as CANNON from "../../vendor/cannon-es.js";
import { world, colliderToShape, worldInverseNoScale } from "./physics.js";
import { registerInteractable } from "./interaction.js";
import { listener, audioLoader, playOneShot } from "./audio.js";
import { registerSound, unregisterSound } from "./settings.js";
import { DOOR_SOUND_REF_DISTANCE, DOOR_OPEN_ANGLE, DOOR_SPEED } from "./constants.js";

let doors = []; // [{ object, closedAngle, openAngle, speed, target, isOpen, settled, body, openSound, closeSound, locked }]

// Scratch vectors for reading a door's *world* position/rotation - cannon-es only understands
// world space, but a DOOR_ object's own .position/.quaternion are local to whatever it's
// parented under, so copying them directly into the body is only correct for a door sitting
// unparented at the scene root. Reused (not per-call) since setupDoor()/updateDoors() are never
// reentrant with each other.
const doorWorldPos = new THREE.Vector3();
const doorWorldQuat = new THREE.Quaternion();

function toggleDoor(door) {
  if (door.locked) return; // still locked - only unlockDoor() (called by lock.js) can clear this
  door.isOpen = !door.isOpen;
  door.target = door.isOpen ? door.openAngle : door.closedAngle;
  door.settled = false;
  // door_open reads fine starting immediately, like a push/creak; door_close is a latch/thud
  // and only makes sense once the door has actually finished swinging shut - see updateDoors().
  if (door.isOpen) playOneShot(door.openSound);
}

// Called once per DOOR_-prefixed object from map.js's setupMap(), with that door's object, its
// (possibly empty) COLL_ children found during the map traversal, and its config from the map's
// JSON sidecar ({ openAngle?, speed?, locked? }, keyed by object name) - openAngle/speed each
// fall back to the matching DOOR_* constant if omitted; locked defaults to false, so a door only
// needs an entry at all for whatever it wants to customize.
export function setupDoor(doorObj, doorColliders, doorCfg) {
  // Positional audio can only ever have one parent, so each door needs its own open/close
  // sound instances rather than sharing one - same reasoning as map.js's per-switch click sound.
  const openSound = new THREE.PositionalAudio(listener);
  const closeSound = new THREE.PositionalAudio(listener);
  [openSound, closeSound].forEach((sound) => {
    sound.setRefDistance(DOOR_SOUND_REF_DISTANCE);
    registerSound(sound, "sfx", 1);
  });
  audioLoader.load("assets/sounds/door_open.wav", (buffer) => openSound.setBuffer(buffer));
  audioLoader.load("assets/sounds/door_close.wav", (buffer) => closeSound.setBuffer(buffer));
  doorObj.add(openSound);
  doorObj.add(closeSound);

  const closedAngle = doorObj.rotation.y;
  const door = {
    object: doorObj,
    closedAngle,
    openAngle: closedAngle + (doorCfg.openAngle ?? DOOR_OPEN_ANGLE),
    speed: doorCfg.speed ?? DOOR_SPEED,
    target: closedAngle,
    isOpen: false,
    settled: true, // starts already at rest in the closed position - no sound on load
    body: null,
    openSound,
    closeSound,
    locked: !!doorCfg.locked,
  };
  doors.push(door);

  registerInteractable(doorObj, {
    promptText: () => (door.locked ? "[F] Locked" : door.isOpen ? "[F] Close door" : "[F] Open door"),
    onActivate: () => toggleDoor(door),
  });

  if (doorColliders.length === 0) {
    console.warn(`"${doorObj.name}" has no COLL_ children (none found nested under it in the scene graph) - it won't block anything physically.`);
  } else {
    // Kinematic rather than static: its transform is driven by updateDoors() each frame
    // instead of by the solver, but it still generates real contact against dynamic props.
    doorObj.updateMatrixWorld(true);
    const doorWorldInverse = worldInverseNoScale(doorObj);
    const doorBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
    doorColliders.forEach((collider) => {
      const result = colliderToShape(collider, doorWorldInverse);
      if (result) doorBody.addShape(result.shape, result.position, result.quaternion);
      else console.warn(`"${collider.name}" on "${doorObj.name}" doesn't match COLL_BOX_/COLL_SPHERE_/COLL_CYLINDER_; skipping.`);
    });
    if (doorBody.shapes.length > 0) {
      // doorObj.matrixWorld is already current - updateMatrixWorld(true) ran a few lines up.
      doorObj.getWorldPosition(doorWorldPos);
      doorObj.getWorldQuaternion(doorWorldQuat);
      doorBody.position.set(doorWorldPos.x, doorWorldPos.y, doorWorldPos.z);
      doorBody.quaternion.set(doorWorldQuat.x, doorWorldQuat.y, doorWorldQuat.z, doorWorldQuat.w);
      world.addBody(doorBody);
      door.body = doorBody;
    } else {
      console.warn(`"${doorObj.name}" had COLL_ children but none produced a usable shape.`);
    }
  }
}

// Called by lock.js's tryUnlock() once it's confirmed the player clicked this door's paired
// LOCK_ object while wielding the exact key it asks for - clears .locked so a plain F now opens
// the door normally. A no-op (beyond the warning) if doorName doesn't match any known door - e.g.
// a lock's "door" field in the map's JSON sidecar typo'd or pointing at a door that was renamed.
export function unlockDoor(doorName) {
  const door = doors.find((d) => d.object.name === doorName);
  if (!door) {
    console.warn(`unlockDoor: no door named "${doorName}" (check the lock's "door" field in the map's JSON sidecar).`);
    return;
  }
  door.locked = false;
}

// See menu.js's return-to-main-menu flow. setupDoor() builds fresh ones on the next load.
export function resetDoors() {
  doors.forEach((door) => {
    unregisterSound(door.openSound);
    unregisterSound(door.closeSound);
  });
  doors = [];
}

export function updateDoors(dt) {
  doors.forEach((door) => {
    const obj = door.object;
    const diff = door.target - obj.rotation.y;
    if (Math.abs(diff) > 0.001) {
      obj.rotation.y += Math.sign(diff) * Math.min(Math.abs(diff), door.speed * dt);
    } else if (!door.settled) {
      obj.rotation.y = door.target;
      door.settled = true;
      if (!door.isOpen) playOneShot(door.closeSound);
    }
    // Kinematic bodies aren't touched by the solver, so its collision box has to be driven
    // by hand - position never changes (it rotates around its own hinge/origin), only rotation.
    // Same local-vs-world distinction as setupDoor() above: obj.rotation just changed, so
    // obj.matrixWorld needs a refresh (cheap - no moving parent, so no need to force the whole
    // ancestor chain) before reading the door's actual world rotation back out of it.
    if (door.body) {
      obj.updateMatrixWorld();
      obj.getWorldQuaternion(doorWorldQuat);
      door.body.quaternion.set(doorWorldQuat.x, doorWorldQuat.y, doorWorldQuat.z, doorWorldQuat.w);
    }
  });
}
