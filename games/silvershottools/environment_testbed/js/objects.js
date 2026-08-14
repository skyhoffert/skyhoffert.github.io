// Object library (objects.glb) and spawning (SPAWN_ markers in the map). Templates are kept
// out of the live scene and cloned per spawn; each clone gets a cannon-es body and becomes a
// holdable interactable.

import * as THREE from "three";
import { scene } from "./scene.js";
import { world, physicsObjects, buildPropBody } from "./physics.js";
import { registerInteractable } from "./interaction.js";
import { shuffleInPlace, disposeObject3D } from "./util.js";
import { OBJECT_PREFIX, SPAWN_PREFIX, COLLISION_PREFIX } from "./constants.js";

const objectLibrary = new Map(); // bare OBJ_ name -> template Object3D from objects.glb (not in the live scene)
let objectLibraryRoot = null; // the objects.glb scene templates are cloned from, kept only to dispose it on rebuild

function hideCollisionChildren(root) {
  root.traverse((child) => {
    if (child.name.startsWith(COLLISION_PREFIX)) child.visible = false;
  });
}

export function buildObjectLibrary(objectsScene) {
  // Rebuilding (e.g. after returning to the main menu and pressing Play again) would otherwise
  // leak the previous cycle's GPU buffers - they're never added to the live scene, so nothing
  // else disposes them.
  if (objectLibraryRoot) disposeObject3D(objectLibraryRoot);
  objectLibraryRoot = objectsScene;
  objectLibrary.clear();

  const templates = [];
  objectsScene.traverse((obj) => {
    if (obj.name.startsWith(OBJECT_PREFIX)) templates.push(obj);
  });
  templates.forEach((obj) => {
    // Hidden once here, on the template - clone() copies .visible, so every future spawned
    // instance inherits its collision child already hidden with no extra work per-instance.
    hideCollisionChildren(obj);
    objectLibrary.set(obj.name.slice(OBJECT_PREFIX.length), obj);
  });
}

// Offset (in the instance's own unrotated local space) from its origin/pivot to its actual
// geometric center, found by zeroing rotation, measuring, then restoring it. Used to hold
// an object by its visual center rather than wherever its pivot happens to be.
function computeLocalCenterOffset(instance) {
  const savedQuat = instance.quaternion.clone();
  instance.quaternion.identity();
  instance.updateMatrixWorld(true);
  const offset = new THREE.Box3().setFromObject(instance).getCenter(new THREE.Vector3()).sub(instance.position);
  instance.quaternion.copy(savedQuat);
  instance.updateMatrixWorld(true);
  return offset;
}

export function objectDisplayName(name) {
  return name.slice(OBJECT_PREFIX.length).replace(/_/g, " ");
}

// Wires up a freshly-spawned instance: shadows on its visible geometry, a cannon-es rigid
// body built from its COLL_BOX_/COLL_SPHERE_/COLL_CYLINDER_ children, and registers it as a
// holdable interactable.
function setupPhysicsObject(instance) {
  instance.traverse((child) => {
    if (child.isMesh && !child.name.startsWith(COLLISION_PREFIX)) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  const body = buildPropBody(instance);
  world.addBody(body);
  physicsObjects.set(instance, { body, centerOffset: computeLocalCenterOffset(instance) });

  const displayName = objectDisplayName(instance.name);
  registerInteractable(instance, {
    promptText: () => `[Click] Hold ${displayName} - [E] Pick up`,
    holdable: true,
  });
}

function shuffleAndTake(arr, count) {
  return shuffleInPlace(arr.slice()).slice(0, count);
}

const spawnedInstances = []; // every instance spawnObjects() has added to the scene, for reset

const spawnWorldPos = new THREE.Vector3();
const spawnWorldQuat = new THREE.Quaternion();

export function spawnObjects(mapScene, spawnConfig) {
  const markers = [];
  mapScene.traverse((obj) => {
    if (obj.name.startsWith(SPAWN_PREFIX)) markers.push(obj);
  });

  markers.forEach((marker) => {
    // Config keyed by marker name, from the map's JSON sidecar: { objects: string[], count?: number }.
    // "objects" is the pool of candidate object names (bare, no OBJ_ prefix) to randomly pick
    // "count" distinct ones from (defaults to 1).
    const cfg = spawnConfig[marker.name];
    if (!cfg || !Array.isArray(cfg.objects) || cfg.objects.length === 0) {
      console.warn(`${marker.name} has no spawn config (expected an "objects" array).`);
      return;
    }
    const count = Number.isFinite(cfg.count) && cfg.count > 0 ? Math.floor(cfg.count) : 1;

    marker.getWorldPosition(spawnWorldPos);
    marker.getWorldQuaternion(spawnWorldQuat);

    shuffleAndTake(cfg.objects, count).forEach((name) => {
      const template = objectLibrary.get(name);
      if (!template) {
        console.warn(`${marker.name} references unknown object "${name}".`);
        return;
      }
      const instance = template.clone(true);
      instance.position.copy(spawnWorldPos);
      instance.quaternion.copy(spawnWorldQuat);
      scene.add(instance);
      setupPhysicsObject(instance);
      spawnedInstances.push(instance);
    });
  });
}

// See menu.js's return-to-main-menu flow. Each instance's cannon-es body is torn down
// separately by physics.js's resetPhysicsWorld() - this only handles the THREE side.
export function resetSpawnedObjects() {
  spawnedInstances.forEach((instance) => {
    scene.remove(instance);
    disposeObject3D(instance);
  });
  spawnedInstances.length = 0;
}
