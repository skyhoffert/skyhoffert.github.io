// Q/E peek-lean. camera.position doubles as the player's tracked body position (movement.js
// runs its wall/ground checks directly against it), so the lean offset can't just be added
// permanently - it's re-applied fresh every frame and retracted at the start of the next one,
// via retractLean()/applyLean() bracketing updateMovement() in main.js's animate(). That keeps
// movement's collision checks working off the real body position while still letting the
// camera visually peek past it.

import * as THREE from "three";
import { camera } from "./scene.js";
import { canvas } from "./dom.js";
import { yaw } from "./pointerlock.js";
import { collisionMeshes } from "./map.js";
import { playerStats } from "./playerConfig.js";

const keys = new Set();
window.addEventListener("keydown", (evt) => {
  if (evt.code === "KeyQ" || evt.code === "KeyE") keys.add(evt.code);
});
window.addEventListener("keyup", (evt) => keys.delete(evt.code));

let leanAmount = 0; // -1 (fully left) .. 1 (fully right), eased toward the target each frame
export let leanRoll = 0; // radians of camera roll for this frame - see main.js's camera.rotation.set

const appliedOffset = new THREE.Vector3(); // this frame's visual position offset, so it can be subtracted back out exactly
const forwardDir = new THREE.Vector3();
const rightDir = new THREE.Vector3();
const wallRaycaster = new THREE.Raycaster();
const wallRayDir = new THREE.Vector3();

// See menu.js's return-to-main-menu flow.
export function resetLean() {
  camera.position.sub(appliedOffset);
  appliedOffset.set(0, 0, 0);
  leanAmount = 0;
  leanRoll = 0;
  keys.clear();
}

// Call before updateMovement() each frame.
export function retractLean() {
  camera.position.sub(appliedOffset);
  appliedOffset.set(0, 0, 0);
}

// Call after updateMovement() each frame, before the camera's rotation is set for render.
export function applyLean(dt) {
  const locked = document.pointerLockElement === canvas;
  const target = locked ? (keys.has("KeyE") ? 1 : 0) - (keys.has("KeyQ") ? 1 : 0) : 0;

  const diff = target - leanAmount;
  if (Math.abs(diff) > 0.001) leanAmount += Math.sign(diff) * Math.min(Math.abs(diff), playerStats.leanSpeed * dt);
  else leanAmount = target;

  forwardDir.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  rightDir.set(-forwardDir.z, 0, forwardDir.x);

  // Clamp how far the lean can actually shift the camera against COLL_ meshes - same
  // raycast-vs-typed-collision approach as movement.js's wall clamp, but a single ray at eye
  // height is enough here since a lean only ever moves that one point.
  let leanDist = Math.abs(leanAmount) * playerStats.leanDistance;
  if (leanDist > 0) {
    const sign = Math.sign(leanAmount);
    wallRayDir.copy(rightDir).multiplyScalar(sign);
    wallRaycaster.set(camera.position, wallRayDir);
    wallRaycaster.far = leanDist + playerStats.leanClearance;
    const hits = wallRaycaster.intersectObjects(collisionMeshes, false);
    if (hits.length) leanDist = Math.min(leanDist, Math.max(0, hits[0].distance - playerStats.leanClearance));
  }

  appliedOffset.copy(rightDir).multiplyScalar(Math.sign(leanAmount) * leanDist);
  camera.position.add(appliedOffset);
  leanRoll = -leanAmount * playerStats.leanTilt;
}
