// Doors: any object prefixed "DOOR_" (see constants.js's DOOR_PREFIX) becomes its own
// independent open/close state machine plus its own kinematic collision body and positional
// open/close sounds. Wired up by map.js once the map's loaded and each door's COLL_ children
// are found - one setupDoor() call per door object.

import * as THREE from "three";
import * as CANNON from "../../vendor/cannon-es.js";
import { world, colliderToShape } from "./physics.js";
import { registerInteractable } from "./interaction.js";
import { listener, audioLoader, playOneShot } from "./audio.js";
import { registerSound, unregisterSound } from "./settings.js";
import { worldStats } from "./worldConfig.js";
import { DOOR_SOUND_REF_DISTANCE } from "./constants.js";

let doors = []; // [{ object, closedAngle, openAngle, target, isOpen, settled, body, openSound, closeSound }]

function toggleDoor(door) {
  door.isOpen = !door.isOpen;
  door.target = door.isOpen ? door.openAngle : door.closedAngle;
  door.settled = false;
  // door_open reads fine starting immediately, like a push/creak; door_close is a latch/thud
  // and only makes sense once the door has actually finished swinging shut - see updateDoors().
  if (door.isOpen) playOneShot(door.openSound);
}

// Called once per DOOR_-prefixed object from map.js's setupMap(), with that door's object and
// its (possibly empty) COLL_ children, found during the map traversal.
export function setupDoor(doorObj, doorColliders) {
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
    openAngle: closedAngle + worldStats.doorOpenAngle,
    target: closedAngle,
    isOpen: false,
    settled: true, // starts already at rest in the closed position - no sound on load
    body: null,
    openSound,
    closeSound,
  };
  doors.push(door);

  registerInteractable(doorObj, {
    promptText: () => (door.isOpen ? "[F] Close door" : "[F] Open door"),
    onActivate: () => toggleDoor(door),
  });

  if (doorColliders.length > 0) {
    // Kinematic rather than static: its transform is driven by updateDoors() each frame
    // instead of by the solver, but it still generates real contact against dynamic props.
    doorObj.updateMatrixWorld(true);
    const doorWorldInverse = new THREE.Matrix4().copy(doorObj.matrixWorld).invert();
    const doorBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
    doorColliders.forEach((collider) => {
      const result = colliderToShape(collider, doorWorldInverse);
      if (result) doorBody.addShape(result.shape, result.position, result.quaternion);
    });
    if (doorBody.shapes.length > 0) {
      doorBody.position.copy(doorObj.position);
      doorBody.quaternion.copy(doorObj.quaternion);
      world.addBody(doorBody);
      door.body = doorBody;
    }
  }
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
      obj.rotation.y += Math.sign(diff) * Math.min(Math.abs(diff), worldStats.doorSpeed * dt);
    } else if (!door.settled) {
      obj.rotation.y = door.target;
      door.settled = true;
      if (!door.isOpen) playOneShot(door.closeSound);
    }
    // Kinematic bodies aren't touched by the solver, so its collision box has to be driven
    // by hand - position never changes (it rotates around its own hinge/origin), only rotation.
    if (door.body) door.body.quaternion.copy(obj.quaternion);
  });
}
