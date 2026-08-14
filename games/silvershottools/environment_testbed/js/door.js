// The one fixed door_a object: open/close state machine plus its kinematic collision body.
// Wired up by map.js once the map's loaded and the door object + its COLL_ children are found.

import * as THREE from "three";
import * as CANNON from "../../vendor/cannon-es.js";
import { world, colliderToShape } from "./physics.js";
import { registerInteractable } from "./interaction.js";
import { doorOpenSound, doorCloseSound, playOneShot } from "./audio.js";
import { DOOR_OPEN_ANGLE, DOOR_SPEED } from "./constants.js";

let door = null; // { object, closedAngle, openAngle, target, isOpen, settled, body }

function toggleDoor() {
  if (!door) return;
  door.isOpen = !door.isOpen;
  door.target = door.isOpen ? door.openAngle : door.closedAngle;
  door.settled = false;
  // door_open reads fine starting immediately, like a push/creak; door_close is a latch/thud
  // and only makes sense once the door has actually finished swinging shut - see updateDoor().
  if (door.isOpen) playOneShot(doorOpenSound);
}

// Called once from map.js's setupMap() with the door object and its (possibly empty) COLL_
// children, found during the map traversal.
export function setupDoor(doorObj, doorColliders) {
  doorObj.add(doorOpenSound);
  doorObj.add(doorCloseSound);

  const closedAngle = doorObj.rotation.y;
  door = {
    object: doorObj,
    closedAngle,
    openAngle: closedAngle + DOOR_OPEN_ANGLE,
    target: closedAngle,
    isOpen: false,
    settled: true, // starts already at rest in the closed position - no sound on load
    body: null,
  };
  registerInteractable(doorObj, {
    promptText: () => (door.isOpen ? "[E] Close door" : "[E] Open door"),
    onActivate: toggleDoor,
  });

  if (doorColliders.length > 0) {
    // Kinematic rather than static: its transform is driven by updateDoor() each frame
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

// See menu.js's return-to-main-menu flow. setupDoor() builds a fresh one on the next load.
export function resetDoor() {
  door = null;
}

export function updateDoor(dt) {
  if (!door) return;
  const obj = door.object;
  const diff = door.target - obj.rotation.y;
  if (Math.abs(diff) > 0.001) {
    obj.rotation.y += Math.sign(diff) * Math.min(Math.abs(diff), DOOR_SPEED * dt);
  } else if (!door.settled) {
    obj.rotation.y = door.target;
    door.settled = true;
    if (!door.isOpen) playOneShot(doorCloseSound);
  }
  // Kinematic bodies aren't touched by the solver, so its collision box has to be driven
  // by hand - position never changes (it rotates around its own hinge/origin), only rotation.
  if (door.body) door.body.quaternion.copy(obj.quaternion);
}
