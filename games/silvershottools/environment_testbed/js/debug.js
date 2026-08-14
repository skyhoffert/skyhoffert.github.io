// Collision debug view (V to toggle). Draws every cannon-es shape currently in the world as a
// wireframe - green for static map colliders, orange for dynamic prop colliders - so
// mis-scaled/misplaced collision boxes are obvious at a glance rather than something you have
// to infer from behavior.

import * as THREE from "three";
import * as CANNON from "../../vendor/cannon-es.js";
import { scene } from "./scene.js";
import { canvas } from "./dom.js";
import { world } from "./physics.js";
import { CYLINDER_SEGMENTS, DEBUG_COLOR_STATIC, DEBUG_COLOR_DYNAMIC } from "./constants.js";

export let debugViewOn = false;
const debugGroup = new THREE.Group();
debugGroup.visible = false;
scene.add(debugGroup);
const debugMeshes = new Map(); // CANNON.Body -> THREE.Group (one wireframe mesh per shape)

window.addEventListener("keydown", (evt) => {
  if (evt.code !== "KeyV" || evt.repeat) return;
  if (document.pointerLockElement !== canvas) return;
  debugViewOn = !debugViewOn;
  debugGroup.visible = debugViewOn;
});

function shapeDebugMesh(shape, color) {
  let geometry;
  if (shape instanceof CANNON.Box) {
    geometry = new THREE.BoxGeometry(shape.halfExtents.x * 2, shape.halfExtents.y * 2, shape.halfExtents.z * 2);
  } else if (shape instanceof CANNON.Sphere) {
    geometry = new THREE.SphereGeometry(shape.radius, 12, 8);
  } else if (shape instanceof CANNON.Cylinder) {
    geometry = new THREE.CylinderGeometry(shape.radiusTop, shape.radiusBottom, shape.height, CYLINDER_SEGMENTS);
  } else {
    geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1); // marker for an unexpected shape type
  }
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color, wireframe: true }));
}

function buildDebugGroupForBody(body) {
  const group = new THREE.Group();
  const color = body.mass === 0 ? DEBUG_COLOR_STATIC : DEBUG_COLOR_DYNAMIC;
  body.shapes.forEach((shape, i) => {
    const mesh = shapeDebugMesh(shape, color);
    mesh.userData.shapeOffset = body.shapeOffsets[i];
    mesh.userData.shapeOrientation = body.shapeOrientations[i];
    group.add(mesh);
  });
  return group;
}

const debugBodyQuat = new THREE.Quaternion();
const debugShapeOffset = new THREE.Vector3();
const debugShapeQuat = new THREE.Quaternion();

export function updateDebugView() {
  // Diff against world.bodies each frame so removed bodies (e.g. a picked-up prop, whose
  // body is pulled out of the world entirely) drop their wireframe immediately, and newly
  // spawned/added ones pick one up without needing to re-toggle.
  const activeBodies = new Set(world.bodies);

  for (const [body, group] of debugMeshes) {
    if (activeBodies.has(body)) continue;
    debugGroup.remove(group);
    debugMeshes.delete(body);
  }

  activeBodies.forEach((body) => {
    if (debugMeshes.has(body)) return;
    const group = buildDebugGroupForBody(body);
    debugMeshes.set(body, group);
    debugGroup.add(group);
  });

  for (const [body, group] of debugMeshes) {
    debugBodyQuat.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    group.children.forEach((mesh) => {
      const so = mesh.userData.shapeOffset;
      debugShapeOffset.set(so.x, so.y, so.z).applyQuaternion(debugBodyQuat);
      mesh.position.set(
        body.position.x + debugShapeOffset.x,
        body.position.y + debugShapeOffset.y,
        body.position.z + debugShapeOffset.z
      );
      const sq = mesh.userData.shapeOrientation;
      debugShapeQuat.set(sq.x, sq.y, sq.z, sq.w);
      mesh.quaternion.copy(debugBodyQuat).multiply(debugShapeQuat);
    });
  }
}
