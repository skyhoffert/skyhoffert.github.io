// WASD/arrow movement, jump, crouch, and raycast-based collision against COLL_ meshes.

import * as THREE from "three";
import { camera } from "./scene.js";
import { canvas } from "./dom.js";
import { collisionMeshes } from "./map.js";
import { yaw } from "./pointerlock.js";
import {
  EYE_HEIGHT,
  CROUCH_EYE_HEIGHT,
  CROUCH_SPEED_MULT,
  CROUCH_TRANSITION_SPEED,
  WALK_SPEED,
  RUN_MULT,
  GRAVITY,
  JUMP_SPEED,
  WORLD_BOUND,
  PLAYER_RADIUS,
  WALL_CHECK_HEIGHTS_STAND,
  WALL_CHECK_HEIGHTS_CROUCH,
  GROUND_PROBE_UP,
  GROUND_PROBE_DOWN,
} from "./constants.js";

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
let currentEyeHeight = EYE_HEIGHT; // smoothly lerps toward EYE_HEIGHT/CROUCH_EYE_HEIGHT

const groundRaycaster = new THREE.Raycaster();
const groundRayOrigin = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0);

// Highest collision surface directly below (x, fromY, z), or null if there is none within
// reach (e.g. no COLL_ floor under the point). Shared by the player and physics objects.
function groundHeightBelow(x, z, fromY) {
  groundRayOrigin.set(x, fromY + GROUND_PROBE_UP, z);
  groundRaycaster.set(groundRayOrigin, DOWN);
  groundRaycaster.far = GROUND_PROBE_UP + GROUND_PROBE_DOWN;
  const hits = groundRaycaster.intersectObjects(collisionMeshes, false);
  return hits.length ? hits[0].point.y : null;
}

const wallRaycaster = new THREE.Raycaster();
const wallRayOrigin = new THREE.Vector3();
const wallRayDir = new THREE.Vector3();

// How far the player can actually move along a single world axis (+/-X or +/-Z) before a
// COLL_ mesh gets in the way, checked at a couple of heights so both low obstacles and
// full walls block. `axisIsX` picks which axis `delta` is along.
function clampAxisMove(delta, axisIsX, feetY, checkHeights) {
  if (delta === 0) return 0;
  const sign = Math.sign(delta);
  wallRayDir.set(axisIsX ? sign : 0, 0, axisIsX ? 0 : sign);
  let allowed = Math.abs(delta);
  for (let i = 0; i < checkHeights.length; i++) {
    wallRayOrigin.set(camera.position.x, feetY + checkHeights[i], camera.position.z);
    wallRaycaster.set(wallRayOrigin, wallRayDir);
    wallRaycaster.far = allowed + PLAYER_RADIUS;
    const hits = wallRaycaster.intersectObjects(collisionMeshes, false);
    if (hits.length) allowed = Math.min(allowed, Math.max(0, hits[0].distance - PLAYER_RADIUS));
  }
  return sign * allowed;
}

// See menu.js's return-to-main-menu flow - puts the player back at spawn for the next round.
export function resetPlayer() {
  camera.position.set(0, EYE_HEIGHT, 0);
  verticalVelocity = 0;
  grounded = true;
  currentEyeHeight = EYE_HEIGHT;
  crouching = false;
  keys.clear();
}

export function updateMovement(dt) {
  if (document.pointerLockElement !== canvas) return;

  // Ground-snapping below (which runs every frame, not just while actively falling) settles
  // camera.position.y to feet+currentEyeHeight each frame, so smoothly stepping this value
  // alone is enough to make standing/crouching animate - no separate camera tween needed.
  const eyeTarget = crouching ? CROUCH_EYE_HEIGHT : EYE_HEIGHT;
  const eyeDiff = eyeTarget - currentEyeHeight;
  if (Math.abs(eyeDiff) > 0.001) {
    currentEyeHeight += Math.sign(eyeDiff) * Math.min(Math.abs(eyeDiff), CROUCH_TRANSITION_SPEED * dt);
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
    WALK_SPEED * (crouching ? CROUCH_SPEED_MULT : keys.has("ShiftLeft") || keys.has("ShiftRight") ? RUN_MULT : 1);

  if (moveDir.lengthSq() > 0) {
    moveDir.normalize().multiplyScalar(speed * dt);
    const feetY = camera.position.y - currentEyeHeight;
    const checkHeights = crouching ? WALL_CHECK_HEIGHTS_CROUCH : WALL_CHECK_HEIGHTS_STAND;
    camera.position.x += clampAxisMove(moveDir.x, true, feetY, checkHeights);
    camera.position.z += clampAxisMove(moveDir.z, false, feetY, checkHeights);
  }

  if (keys.has("Space") && grounded) {
    verticalVelocity = JUMP_SPEED;
    grounded = false;
  }

  verticalVelocity += GRAVITY * dt;
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

  camera.position.x = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, camera.position.x));
  camera.position.z = Math.max(-WORLD_BOUND, Math.min(WORLD_BOUND, camera.position.z));
}
