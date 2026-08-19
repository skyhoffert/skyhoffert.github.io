// Object library (objects.glb) and spawning (SPAWN_ markers in the map). Templates are kept
// out of the live scene and cloned per spawn; each clone gets a cannon-es body and becomes a
// holdable interactable.

import * as THREE from "three";
import { scene } from "./scene.js";
import { world, physicsObjects, buildPropBody } from "./physics.js";
import { registerInteractable } from "./interaction.js";
import { shuffleAndTake, disposeObject3D } from "./util.js";
import {
  OBJECT_PREFIX,
  SPAWN_PREFIX,
  COLLISION_PREFIX,
  ATTACK_SWING_TIME,
  ATTACK_COOLDOWN_TIME,
  ATTACK_SWING_ARC,
  ATTACK_SWING_LUNGE,
} from "./constants.js";

const WORLD_UP = new THREE.Vector3(0, 1, 0);

const objectLibrary = new Map(); // bare OBJ_ name -> template Object3D from objects.glb (not in the live scene)
let objectLibraryRoot = null; // the objects.glb scene templates are cloned from, kept only to dispose it on rebuild
let weaponStats = {}; // bare OBJ_ name -> stats loaded from weapons.json - see weaponStatsFor()

function hideCollisionChildren(root) {
  root.traverse((child) => {
    if (child.name.startsWith(COLLISION_PREFIX)) child.visible = false;
  });
}

// weapons is the parsed contents of weapons.json (see constants.js's WEAPONS_URL) - passed in
// here rather than fetched directly so this module doesn't own any network/loading concerns of
// its own, consistent with how mapScene/spawnConfig arrive as plain data too.
export function buildObjectLibrary(objectsScene, weapons) {
  // Rebuilding (e.g. after returning to the main menu and pressing Play again) would otherwise
  // leak the previous cycle's GPU buffers - they're never added to the live scene, so nothing
  // else disposes them.
  if (objectLibraryRoot) disposeObject3D(objectLibraryRoot);
  objectLibraryRoot = objectsScene;
  objectLibrary.clear();
  weaponStats = weapons || {};

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
  console.log(`Object library loaded (${objectLibrary.size}): ${[...objectLibrary.keys()].join(", ")}`);
}

// Offset (in the instance's own unrotated local space) from its origin/pivot to its actual
// geometric center, found by zeroing rotation, measuring, then restoring it. Used to hold
// an object by its visual center rather than wherever its pivot happens to be.
export function computeLocalCenterOffset(instance) {
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

// Emoji shown in inventory slots and the drag preview in place of a text label - keyed by the
// bare (no OBJ_ prefix) name, same as objectLibrary. Add an entry here for every new object in
// objects.glb; anything missing falls back to DEFAULT_OBJECT_EMOJI rather than showing blank.
const OBJECT_EMOJI = {
  butcher_knife: "\u{1F52A}", // 🔪
  book_a: "\u{1F4D6}", // 📖
  shovel: "\u{26CF}\u{FE0F}", // ⛏️
  revolver: "\u{1F52B}", // 🔫
  shotgun: "\u{1F52B}", // 🔫 - no distinct shotgun emoji in Unicode, same as revolver
  flashlight: "\u{1F526}", // 🔦
  key_armoire: "\u{1F511}", // 🔑
};
const DEFAULT_OBJECT_EMOJI = "\u{1F4E6}"; // 📦

export function objectEmoji(name) {
  return OBJECT_EMOJI[name.slice(OBJECT_PREFIX.length)] || DEFAULT_OBJECT_EMOJI;
}

// Footprint (in inventory grid cells, {w,h}) an object occupies in its default (unrotated)
// orientation - keyed the same way as OBJECT_EMOJI. Anything missing is a plain 1x1, same as
// every object before inventory.js grew multi-cell items.
const OBJECT_SIZE = {
  shovel: { w: 1, h: 2 }, // tall enough that it has to rotate to 2x1 to fit across both hand slots
  shotgun: { w: 1, h: 2 }, // same deal - a two-handed gun
};
const DEFAULT_OBJECT_SIZE = { w: 1, h: 1 };

export function objectSize(name) {
  return OBJECT_SIZE[name.slice(OBJECT_PREFIX.length)] || DEFAULT_OBJECT_SIZE;
}

// What a wielded object does when attacked with (see attack.js's tryAttack()), and the stats
// that govern it - all loaded from weapons.json (see buildObjectLibrary()) rather than defined
// here, so tuning or adding a weapon never needs a source change. "type" is one of:
// - "prop": nothing - can't be attacked with (e.g. a book). The default for anything not
//   listed in weapons.json at all, so a new object never swings/fires until it's added there
//   on purpose.
// - "melee": swings on a timer - cooldownTime/swingTime/swingArc/swingLunge.
// - "gun": fired on a timer - cooldownTime, plus ammoCapacity (not consumed anywhere yet - see
//   attack.js's tryAttack(), which currently just flashes "BANG").
// - "light": toggled on/off (no cooldown) - range, applied to whatever THREE.Light is found
//   under the instance (see wield.js's equipSlot()) as its .distance, since an exported
//   KHR_lights_punctual light has no such falloff limit by default (same issue map.js's own
//   lights have - see its setupMap()) and would otherwise dimly light the whole level.
// Anything a weapon's own entry doesn't specify falls back to these - keeps weapons.json
// entries short (most props won't even have one) without a weapon silently ending up with a
// zero/undefined swingTime etc. if a field's forgotten.
const DEFAULT_MELEE_STATS = { cooldownTime: ATTACK_COOLDOWN_TIME, swingTime: ATTACK_SWING_TIME, swingArc: ATTACK_SWING_ARC, swingLunge: ATTACK_SWING_LUNGE };
const DEFAULT_GUN_STATS = { cooldownTime: ATTACK_COOLDOWN_TIME, ammoCapacity: 6 };
const DEFAULT_LIGHT_STATS = { range: 8 };
const DEFAULT_TYPE = "prop";

// The full stats object for a weapon (type plus whatever fields apply to it, defaults filled
// in), or just { type: "prop" } for anything not in weapons.json. Used by wield.js to tag a
// wielded instance once at equip time - see its userData.weaponStats.
export function weaponStatsFor(name) {
  const entry = weaponStats[name.slice(OBJECT_PREFIX.length)];
  const type = (entry && entry.type) || DEFAULT_TYPE;
  if (type === "prop") return { type };
  const defaults = type === "gun" ? DEFAULT_GUN_STATS : type === "light" ? DEFAULT_LIGHT_STATS : DEFAULT_MELEE_STATS;
  return { ...defaults, ...entry, type };
}

// Clones a template by its full OBJ_-prefixed name (as stored in an inventory slot - see
// inventory.js), with no physics body or interactable registration - for wield.js's
// camera-attached viewmodels, which aren't part of the physics/interaction world at all.
export function cloneObjectTemplate(fullName) {
  const template = objectLibrary.get(fullName.slice(OBJECT_PREFIX.length));
  return template ? template.clone(true) : null;
}

// Clamps range, starts off, and fixes up aim direction for every point/spot light a
// freshly-cloned instance carries, returning the last one found (this codebase only ever puts
// one light on an item, so "last" is "the" light) for a caller that needs to hang onto it - see
// wield.js's equipSlot(), which stores it to toggle on/off later. Starts off regardless of
// whatever Blender/GLTFLoader exported (on, at whatever intensity) - a flashlight shouldn't
// already be lit before anyone's turned it on, whether it's just been equipped or is still
// sitting out in the world (e.g. spawned via a SPAWN_ marker) waiting to be picked up.
//
// "Off" here means intensity 0 with userData.baseIntensity stashed for wield.js's
// toggleWieldedLight() to restore - not child.visible = false, even though the light is
// invisible either way. A THREE.Light's shader contribution is baked into every currently-lit
// material's compiled program by *count* (however many point/spot lights are visible right now,
// regardless of intensity) - so a light that flips .visible true for the first time forces a
// fresh shader variant for everything that program touches, a real (if one-time) stall, right at
// the moment the player first turns it on. Leaving it always visible and just zeroing its
// intensity keeps it counted from the instant it's cloned, so that variant's already compiled
// (see menu.js's loadWorld(), which calls renderer.compileAsync() right after every spawn - this
// is what lets that warm-up actually cover the "on" state too) well before anyone flips it on.
// map.js's own map lights already worked this way (see updateLightFlicker()) for unrelated
// reasons (flicker) - this just brings a wielded item's light in line with the same convention.
//
// Two clone(true) gotchas this papers over, both only visible once an instance actually rotates
// (equipped and swung, or physically tumbled/kicked - not just sitting statically where it
// spawned, which is why this can look fine until then):
// - Blender doesn't export a glTF light range, so a point/spot light's distance falls off to
//   zero only asymptotically by default - without clamping it, it dimly lights (and shadows)
//   the whole map instead of just nearby (same issue map.js's own map lights have).
// - A spot/directional light's .target is a *separate* property, not a normal scene-graph
//   child - clone(true) clones ordinary children (so the light's own position/rotation always
//   correctly follows the model), but SpotLight.copy() clones .target as a freestanding object
//   never re-parented into the new hierarchy, so the beam's aim direction (computed from
//   light.position -> target.position) stays wherever the target happened to end up instead of
//   rotating with the model. Fixed by re-parenting target directly under the light itself,
//   pointing local -Z (glTF's own punctual-light convention), so its world position - and thus
//   the beam's aim - is always rigidly locked to the light's own transform.
export function configureInstanceLights(instance) {
  let found = null;
  instance.traverse((child) => {
    if (!child.isLight) return;
    found = child;
    child.userData.baseIntensity = child.intensity;
    child.intensity = 0;
    const range = weaponStatsFor(instance.name).range;
    if (typeof range === "number" && (child.isPointLight || child.isSpotLight)) child.distance = range;
    if (child.target) {
      child.target.position.set(0, 0, -1);
      child.add(child.target);
    }
  });
  return found;
}

// Wires up a freshly-spawned instance: shadows on its visible geometry, its light(s) configured
// (see configureInstanceLights() above), a cannon-es rigid body built from its
// COLL_BOX_/COLL_SPHERE_/COLL_CYLINDER_ children, and registers it as a holdable interactable.
function setupPhysicsObject(instance) {
  instance.traverse((child) => {
    if (child.isMesh && !child.name.startsWith(COLLISION_PREFIX)) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  configureInstanceLights(instance);

  const body = buildPropBody(instance);
  world.addBody(body);
  // settleTimer: seconds this body's linear speed has continuously stayed under
  // PROP_SETTLE_LINEAR_SPEED - see physics.js's stepPhysics(), which drives its actual sleeping.
  physicsObjects.set(instance, { body, centerOffset: computeLocalCenterOffset(instance), settleTimer: 0 });

  const displayName = objectDisplayName(instance.name);
  registerInteractable(instance, {
    promptText: () => `[Click] Hold ${displayName} - [F] Pick up`,
    holdable: true,
  });
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
    // "count" distinct ones from (defaults to 1). A marker can carry other spawn kinds too (e.g.
    // "creatures" - see creatures.js's spawnCreatures(), called the same way from menu.js) - only
    // a marker missing a config entry entirely is actually worth flagging here, not one that
    // simply isn't configured for *this* kind of spawn.
    const cfg = spawnConfig[marker.name];
    if (!cfg) {
      console.warn(`${marker.name} has no spawn config.`);
      return;
    }
    if (!Array.isArray(cfg.objects) || cfg.objects.length === 0) return;
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

const probeBox = new THREE.Box3();
const probeSphere = new THREE.Sphere();

// Local-space bounding-sphere radius of a fresh, untransformed clone of fullName - used to
// offset a dropped item off of whatever surface it lands on (see dropObjectOnSurface()) so it
// doesn't clip through regardless of how it ends up oriented to rest on that surface.
function boundingRadius(instance) {
  instance.position.set(0, 0, 0);
  instance.quaternion.identity();
  instance.updateMatrixWorld(true);
  return probeBox.setFromObject(instance).getBoundingSphere(probeSphere).radius;
}

// Drops a fresh instance of a library template against a surface - offset off of hitPoint
// along hitNormal (in world space) by the instance's own bounding radius, and tilted so its
// local up axis lines up with the surface normal (so it rests flush whether that surface is a
// floor, a wall, or a slope). Used by inventory.js when an item's dragged out of the inventory
// panel and dropped somewhere in the world.
export function dropObjectOnSurface(fullName, hitPoint, hitNormal) {
  const instance = cloneObjectTemplate(fullName);
  if (!instance) return null;

  const radius = boundingRadius(instance);
  instance.quaternion.setFromUnitVectors(WORLD_UP, hitNormal);
  instance.position.copy(hitPoint).addScaledVector(hitNormal, radius);

  scene.add(instance);
  setupPhysicsObject(instance);
  spawnedInstances.push(instance);
  return instance;
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
