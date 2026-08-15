// Holding / carrying objects (OBJ_). Left click holds/carries something in a hold point
// slightly left of center, right click slightly right - independently, so both hands can each
// be carrying a different item at once. Holding ctrl rotates whatever's currently held (both
// items together, if both hands are full) instead of looking around (see pointerlock.js).

import * as THREE from "three";
import { camera } from "./scene.js";
import { canvas, interactPromptEl } from "./dom.js";
import { physicsObjects } from "./physics.js";
import { activeInteractable } from "./interaction.js";
import { isHandBusy } from "./wield.js";
import { worldStats } from "./worldConfig.js";
import { playerStats } from "./playerConfig.js";

export let ctrlDown = false;
window.addEventListener("keydown", (evt) => {
  if (evt.code === "ControlLeft" || evt.code === "ControlRight") ctrlDown = true;
});
window.addEventListener("keyup", (evt) => {
  if (evt.code === "ControlLeft" || evt.code === "ControlRight") ctrlDown = false;
});

// Right-click is a real control now (holding with the right hand), not a context-menu trigger.
canvas.addEventListener("contextmenu", (evt) => evt.preventDefault());

export let heldLeft = null; // { object } carried on left-click, or null
export let heldRight = null; // { object } carried on right-click, or null

document.addEventListener("mousedown", (evt) => {
  if (evt.button === 0) tryPickUp("left");
  else if (evt.button === 2) tryPickUp("right");
});
document.addEventListener("mouseup", (evt) => {
  if (evt.button === 0) dropHand("left");
  else if (evt.button === 2) dropHand("right");
});

function tryPickUp(hand) {
  if (document.pointerLockElement !== canvas) return;
  // That hand's wielding something from the inventory (see wield.js) - clicking it attacks
  // instead (see attack.js), rather than reaching out to grab a world prop.
  if (isHandBusy(hand === "left" ? "handL" : "handR")) return;
  if (!activeInteractable || !activeInteractable.holdable) return;
  const obj = activeInteractable.object;
  // Not already being carried by the other hand.
  if ((heldLeft && heldLeft.object === obj) || (heldRight && heldRight.object === obj)) return;
  if (hand === "left" ? heldLeft : heldRight) return; // that hand's already full

  pickUpObject(hand, obj);
}

// Directly starts hand carrying obj, without tryPickUp()'s "is there a holdable
// activeInteractable in front of me, and is that hand free" gating - callers that already know
// both are true (tryPickUp itself, and inventory.js's drag-out-into-a-free-hand flow) use this
// so the actual pickup logic only lives in one place.
export function pickUpObject(hand, obj) {
  if (hand === "left") heldLeft = { object: obj };
  else heldRight = { object: obj };

  const phys = physicsObjects.get(obj);
  if (phys) phys.body.wakeUp(); // stays in the world and fully dynamic the whole time it's held
  interactPromptEl.classList.remove("visible");
}

function dropHand(hand) {
  // The body already has whatever velocity/angular velocity the hold spring left it with -
  // that's the throw. Nothing else to do.
  if (hand === "left") heldLeft = null;
  else heldRight = null;
}

const holdForward = new THREE.Vector3();
const holdTargetPos = new THREE.Vector3();
const holdCenterOffset = new THREE.Vector3();
const holdForce = new THREE.Vector3();
const holdSideDir = new THREE.Vector3();
const holdRight = new THREE.Vector3();
const holdRotDelta = new THREE.Quaternion();
const holdCurrentQuat = new THREE.Quaternion();
const WORLD_UP = new THREE.Vector3(0, 1, 0);

// Spring-damper pulling the held body's geometric center toward a point out in front of the
// camera (offset left/right of center per hand), rather than pinning its position directly -
// so it can still be blocked by walls, sags/lags realistically behind fast camera motion,
// and carries real momentum into a throw. sideOffset is negative for the left hand, positive
// for the right.
function applyHoldForce(body, centerOffset, sideOffset) {
  camera.getWorldDirection(holdForward);
  holdTargetPos.copy(camera.position).addScaledVector(holdForward, playerStats.hold.distance);

  holdSideDir.set(1, 0, 0).applyQuaternion(camera.quaternion);
  holdTargetPos.addScaledVector(holdSideDir, sideOffset);

  // The spring pulls the body's origin, but we want the object's *center* at the hold point,
  // so shift the target back by the origin-to-center offset (rotated into its current frame).
  holdCenterOffset.copy(centerOffset).applyQuaternion(body.quaternion);
  holdTargetPos.sub(holdCenterOffset);

  holdForce.set(
    (holdTargetPos.x - body.position.x) * playerStats.hold.springStiffness - body.velocity.x * playerStats.hold.springDamping,
    (holdTargetPos.y - body.position.y) * playerStats.hold.springStiffness - body.velocity.y * playerStats.hold.springDamping,
    (holdTargetPos.z - body.position.z) * playerStats.hold.springStiffness - body.velocity.z * playerStats.hold.springDamping
  );
  if (holdForce.length() > playerStats.hold.maxForce) holdForce.setLength(playerStats.hold.maxForce);

  body.force.x += holdForce.x;
  // Cancel gravity outright so the spring only has to chase the target rather than also hold
  // the object up - otherwise it settles into a permanent sag (mass*|gravity|/stiffness) below
  // the target rather than actually reaching it.
  body.force.y += holdForce.y - body.mass * worldStats.gravity;
  body.force.z += holdForce.z;
}

// See menu.js's return-to-main-menu flow. The held bodies themselves are torn down by
// physics.js's resetPhysicsWorld() - this just forgets the hands were holding anything.
export function resetHold() {
  heldLeft = null;
  heldRight = null;
  ctrlDown = false;
}

// Applies the hold spring to whichever hand(s) are currently full. Must run before
// physics.js's stepPhysics() each frame - see main.js's animate().
export function applyHeldForces() {
  if (heldLeft) {
    const phys = physicsObjects.get(heldLeft.object);
    if (phys) applyHoldForce(phys.body, phys.centerOffset, -playerStats.hold.sideOffset);
  }
  if (heldRight) {
    const phys = physicsObjects.get(heldRight.object);
    if (phys) applyHoldForce(phys.body, phys.centerOffset, playerStats.hold.sideOffset);
  }
}

// Direct rotation control (used while ctrl is held, see pointerlock.js's mousemove handler)
// rather than torque, so it stays precise/responsive instead of fighting physical spin.
export function rotateHeldBody(phys, movementX, movementY) {
  if (!phys) return;
  const body = phys.body;
  holdRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
  holdCurrentQuat.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
  holdRotDelta.setFromAxisAngle(WORLD_UP, -movementX * playerStats.hold.rotateSensitivity);
  holdCurrentQuat.premultiply(holdRotDelta);
  holdRotDelta.setFromAxisAngle(holdRight, -movementY * playerStats.hold.rotateSensitivity);
  holdCurrentQuat.premultiply(holdRotDelta);
  body.quaternion.set(holdCurrentQuat.x, holdCurrentQuat.y, holdCurrentQuat.z, holdCurrentQuat.w);
  body.angularVelocity.set(0, 0, 0); // don't let leftover spin fight the direct rotation control
}
