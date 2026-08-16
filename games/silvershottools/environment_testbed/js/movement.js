// WASD/arrow movement, jump, crouch, and raycast-based collision against COLL_ meshes.

import * as THREE from "three";
import { camera } from "./scene.js";
import { canvas } from "./dom.js";
import { collisionMeshes } from "./map.js";
import { yaw } from "./pointerlock.js";
import { playerStats } from "./playerConfig.js";
import { worldStats } from "./worldConfig.js";

const keys = new Set();
window.addEventListener("keydown", (evt) => keys.add(evt.code));
window.addEventListener("keyup", (evt) => keys.delete(evt.code));

let crouching = false;
window.addEventListener("keydown", (evt) => {
  if (evt.code !== "KeyC" || evt.repeat) return;
  if (document.pointerLockElement !== canvas) return;
  crouching = !crouching;
});

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const moveDir = new THREE.Vector3();

let verticalVelocity = 0;
let grounded = true;
let currentEyeHeight = playerStats.eyeHeight; // smoothly lerps toward playerStats.eyeHeight/crouchEyeHeight

const groundRaycaster = new THREE.Raycaster();
const groundRayOrigin = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0);

// Highest collision surface directly below (x, fromY, z), or null if there is none within
// reach (e.g. no COLL_ floor under the point). Shared by the player and physics objects.
function groundHeightBelow(x, z, fromY) {
  groundRayOrigin.set(x, fromY + playerStats.groundProbeUp, z);
  groundRaycaster.set(groundRayOrigin, DOWN);
  groundRaycaster.far = playerStats.groundProbeUp + playerStats.groundProbeDown;
  const hits = groundRaycaster.intersectObjects(collisionMeshes, false);
  return hits.length ? hits[0].point.y : null;
}

const wallRaycaster = new THREE.Raycaster();
const wallRayOrigin = new THREE.Vector3();
const wallRayDir = new THREE.Vector3();

// How far the player can actually move along a single world axis (+/-X or +/-Z) before a
// COLL_ mesh gets in the way, checked at a handful of heights (playerStats.wallCheckHeightsStand/
// Crouch) so both low obstacles and full walls block. A thin horizontal obstacle (a desktop, a
// shelf) only occupies a narrow slice of that range, so it's only ever actually caught if one of
// the configured heights happens to land inside it - hence those arrays being densely sampled
// rather than just a couple of representative heights. `axisIsX` picks which axis `delta` is
// along.
function clampAxisMove(delta, axisIsX, feetY, checkHeights) {
  if (delta === 0) return 0;
  const sign = Math.sign(delta);
  wallRayDir.set(axisIsX ? sign : 0, 0, axisIsX ? 0 : sign);
  let allowed = Math.abs(delta);
  for (let i = 0; i < checkHeights.length; i++) {
    wallRayOrigin.set(camera.position.x, feetY + checkHeights[i], camera.position.z);
    wallRaycaster.set(wallRayOrigin, wallRayDir);
    wallRaycaster.far = allowed + playerStats.radius;
    const hits = wallRaycaster.intersectObjects(collisionMeshes, false);
    if (hits.length) allowed = Math.min(allowed, Math.max(0, hits[0].distance - playerStats.radius));
  }
  return sign * allowed;
}

// See menu.js's return-to-main-menu flow - puts the player back at spawn for the next round.
export function resetPlayer() {
  camera.position.set(0, playerStats.eyeHeight, 0);
  verticalVelocity = 0;
  grounded = true;
  currentEyeHeight = playerStats.eyeHeight;
  crouching = false;
  keys.clear();
}

export function updateMovement(dt) {
  if (document.pointerLockElement !== canvas) return;

  // Ground-snapping below (which runs every frame, not just while actively falling) settles
  // camera.position.y to feet+currentEyeHeight each frame, so smoothly stepping this value
  // alone is enough to make standing/crouching animate - no separate camera tween needed.
  const eyeTarget = crouching ? playerStats.crouchEyeHeight : playerStats.eyeHeight;
  const eyeDiff = eyeTarget - currentEyeHeight;
  if (Math.abs(eyeDiff) > 0.001) {
    currentEyeHeight += Math.sign(eyeDiff) * Math.min(Math.abs(eyeDiff), playerStats.crouchTransitionSpeed * dt);
  } else {
    currentEyeHeight = eyeTarget;
  }

  forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  right.set(-forward.z, 0, forward.x);

  moveDir.set(0, 0, 0);
  if (keys.has("KeyW") || keys.has("ArrowUp")) moveDir.add(forward);
  if (keys.has("KeyS") || keys.has("ArrowDown")) moveDir.sub(forward);
  if (keys.has("KeyD") || keys.has("ArrowRight")) moveDir.add(right);
  if (keys.has("KeyA") || keys.has("ArrowLeft")) moveDir.sub(right);

  const speed =
    playerStats.walkSpeed *
    (crouching ? playerStats.crouchSpeedMult : keys.has("ShiftLeft") || keys.has("ShiftRight") ? playerStats.runMult : 1);

  if (moveDir.lengthSq() > 0) {
    moveDir.normalize().multiplyScalar(speed * dt);
    const feetY = camera.position.y - currentEyeHeight;
    const checkHeights = crouching ? playerStats.wallCheckHeightsCrouch : playerStats.wallCheckHeightsStand;
    camera.position.x += clampAxisMove(moveDir.x, true, feetY, checkHeights);
    camera.position.z += clampAxisMove(moveDir.z, false, feetY, checkHeights);
  }

  if (keys.has("Space") && grounded && !crouching) {
    verticalVelocity = playerStats.jumpSpeed;
    grounded = false;
  }

  verticalVelocity += worldStats.gravity * dt;
  camera.position.y += verticalVelocity * dt;

  const feetY = camera.position.y - currentEyeHeight;
  const groundY = groundHeightBelow(camera.position.x, camera.position.z, feetY);
  if (groundY !== null && feetY <= groundY) {
    camera.position.y = groundY + currentEyeHeight;
    verticalVelocity = 0;
    grounded = true;
  } else {
    grounded = false;
  }

  camera.position.x = Math.max(-worldStats.worldBound, Math.min(worldStats.worldBound, camera.position.x));
  camera.position.z = Math.max(-worldStats.worldBound, Math.min(worldStats.worldBound, camera.position.z));
}
