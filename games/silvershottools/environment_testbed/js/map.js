// Loads and wires up the map (testbed_map_a.glb): static/player collision, doors, drawers,
// light switches, and per-light flicker state. See objects.js for the separate object library/
// spawning that populates the map with holdable props.

import * as THREE from "three";
import { scene } from "./scene.js";
import { isDescendantOf, disposeObject3D } from "./util.js";
import { hasTypedCollisionPrefix, buildStaticColliderBody } from "./physics.js";
import { registerInteractable } from "./interaction.js";
import { listener, audioLoader, playOneShot } from "./audio.js";
import { registerSound, unregisterSound } from "./settings.js";
import { setupDoor } from "./door.js";
import { setupDrawer } from "./drawer.js";
import {
  DOOR_PREFIX,
  DRAWER_PREFIX,
  COLLISION_PREFIX,
  SWITCH_PREFIX,
  LIGHT_GROUP_PREFIX,
  SWITCH_SOUND_REF_DISTANCE,
  LIGHT_RANGE,
  LIGHT_FLICKER_MIN,
  LIGHT_FLICKER_CHANGE_MIN,
  LIGHT_FLICKER_CHANGE_MAX,
  LIGHT_FLICKER_SPEED,
} from "./constants.js";

export const collisionMeshes = []; // populated with COLL_-prefixed meshes once the map loads
// The subset of collisionMeshes with a typed BOX_/SPHERE_/CYLINDER_ prefix (see physics.js's
// hasTypedCollisionPrefix()) - real physical surfaces (shelves, tables, floors, ...), unlike a
// plain untyped "COLL_" mesh, which is a player-only movement blocker with no actual shape
// (e.g. a bookcase's clip-prevention collider) and shouldn't be a valid place to rest an item.
export const typedCollisionMeshes = [];
export const mapLights = []; // populated with the map's point/spot lights once it loads

let mapRoot = null; // the loaded gltf.scene currently in the THREE scene, or null
let switchSounds = []; // clickSound instances created below, so resetMapState() can unregister them

// A switch has no on/off state of its own - each light already owns its own starting on/off
// (cfg.on in the per-light setup below), so a switch just flips whatever its matching lights'
// current state already is, independently per light. That means a group's lights don't have to
// start in sync (one can start on, another off), and after a toggle they still might not be -
// this is a light switch, not a light state.
function wireSwitches(switches) {
  switches.forEach((switchObj) => {
    const group = switchObj.name.slice(SWITCH_PREFIX.length);
    const groupPrefix = LIGHT_GROUP_PREFIX + group + "_";
    const groupLights = mapLights.filter((l) => l.name.startsWith(groupPrefix));

    const clickSound = new THREE.PositionalAudio(listener);
    clickSound.setRefDistance(SWITCH_SOUND_REF_DISTANCE);
    registerSound(clickSound, "sfx", 1);
    switchSounds.push(clickSound);
    switchObj.add(clickSound);
    audioLoader.load("assets/sounds/click.wav", (buffer) => clickSound.setBuffer(buffer));

    registerInteractable(switchObj, {
      promptText: () => "[F] Toggle lights",
      onActivate: () => {
        groupLights.forEach((l) => {
          l.userData.on = !l.userData.on;
        });
        playOneShot(clickSound);
      },
    });
  });
}

// config is the map's JSON sidecar (see menu.js's loadWorld()) - doors/drawers/lights are all
// keyed by object name, each entry optional and itself allowed to omit any field, falling back
// to the matching DOOR_*/DRAWER_*/LIGHT_* constant (see setupDoor()/setupDrawer()/the per-light
// setup below and updateLightFlicker()) for anything not customized there. Switches have no
// config of their own - see wireSwitches().
export function setupMap(gltf, { doors: doorConfig = {}, drawers: drawerConfig = {}, lights: lightConfig = {} } = {}) {
  // Needed before reading any mesh's matrixWorld below (e.g. for baking static collision
  // geometry into world space) - nothing has been rendered yet, so it isn't current otherwise.
  gltf.scene.updateMatrixWorld(true);

  // Objects prefixed "_" are Blender-side authoring aids (scale references, layout
  // guides, etc.) and shouldn't appear in the game.
  const hidden = [];
  gltf.scene.traverse((obj) => {
    if (obj.name.startsWith("_")) hidden.push(obj);
  });
  hidden.forEach((obj) => obj.removeFromParent());

  // Found up front so the traversal below can tell a door/drawer-mounted collider apart from a
  // static one - each door/drawer's own COLL_ children need to move with it, not get baked in
  // once. Any number of either is fine - every DOOR_/DRAWER_-prefixed object becomes its own
  // door/drawer (see door.js/drawer.js).
  const doorObjs = [];
  const drawerObjs = [];
  gltf.scene.traverse((obj) => {
    if (obj.name.startsWith(DOOR_PREFIX)) doorObjs.push(obj);
    else if (obj.name.startsWith(DRAWER_PREFIX)) drawerObjs.push(obj);
  });
  const doorColliders = new Map(); // door object -> its COLL_ children
  doorObjs.forEach((d) => doorColliders.set(d, []));
  const drawerColliders = new Map(); // drawer object -> its COLL_ children
  drawerObjs.forEach((d) => drawerColliders.set(d, []));

  const switches = [];

  gltf.scene.traverse((obj) => {
    if (obj.name.startsWith(COLLISION_PREFIX)) {
      // Collision meshes are authoring geometry only (primitive cubes/cylinders/spheres
      // standing in for walls, floors, etc.) - hide them, but leave them in the scene
      // graph so their matrixWorld keeps updating for raycasting against them.
      obj.visible = false;
      if (obj.isMesh) {
        collisionMeshes.push(obj); // player's own raycast-based collision, always
        if (hasTypedCollisionPrefix(obj.name)) typedCollisionMeshes.push(obj);
        const ownerDoor = doorObjs.find((d) => isDescendantOf(obj, d));
        const ownerDrawer = ownerDoor ? null : drawerObjs.find((d) => isDescendantOf(obj, d));
        if (ownerDoor) {
          doorColliders.get(ownerDoor).push(obj); // wired up as a kinematic body after its door, below
        } else if (ownerDrawer) {
          drawerColliders.get(ownerDrawer).push(obj); // wired up as a kinematic body after its drawer, below
        } else if (hasTypedCollisionPrefix(obj.name)) {
          buildStaticColliderBody(obj); // static body for props to physically land on
        }
        // A plain "COLL_" with no BOX_/SPHERE_/CYLINDER_ type is player-only by design: it
        // blocks the player's raycast movement above, but deliberately gets no cannon-es
        // body, so props pass straight through it (e.g. a fence/barrier the player can't
        // cross but a thrown/dropped prop shouldn't be stopped by).
      }
    } else if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      if (obj.name.startsWith(SWITCH_PREFIX)) switches.push(obj);
    } else if (obj.isLight) {
      mapLights.push(obj);
      // Per-light config from the map's JSON sidecar, keyed by object name - any field it
      // omits (or omitting the entry entirely) falls back to the matching LIGHT_* constant, so
      // a light only needs an entry at all for whatever it wants to customize.
      const cfg = lightConfig[obj.name] || {};
      const range = cfg.range ?? LIGHT_RANGE;

      // Logical on/off (its own starting state, cfg.on - a switch just toggles whatever this
      // already is, see wireSwitches()) is kept separate from the displayed intensity, which
      // updateLightFlicker() recomputes every frame from these - that way flicker and switches
      // don't fight over who gets to set .intensity. cfg.intensity overrides the
      // Blender-exported intensity outright, rather than being yet another fallback field -
      // there's no sensible map-wide "default brightness".
      obj.userData.baseIntensity = cfg.intensity ?? obj.intensity;
      obj.userData.on = cfg.on ?? true;
      obj.userData.flickerCurrent = 1;
      obj.userData.flickerTarget = 1;
      obj.userData.flickerTimer = 0;
      obj.userData.flickerMin = cfg.flickerMin ?? LIGHT_FLICKER_MIN;
      obj.userData.flickerChangeMin = cfg.flickerChangeMin ?? LIGHT_FLICKER_CHANGE_MIN;
      obj.userData.flickerChangeMax = cfg.flickerChangeMax ?? LIGHT_FLICKER_CHANGE_MAX;
      obj.userData.flickerSpeed = cfg.flickerSpeed ?? LIGHT_FLICKER_SPEED;
      if (obj.shadow) {
        // GLTFLoader creates lights from KHR_lights_punctual with shadows off by default.
        // mapSize is set separately by graphicsSettings.js's applyShadowQuality(), called again
        // once setupMap() returns - see menu.js's loadWorld().
        obj.castShadow = true;
        // normalBias (offsets along the surface normal) instead of a large plain bias avoids
        // shadow acne without peter-panning the shadow off thin walls and letting light leak
        // through them.
        obj.shadow.bias = -0.0002;
        obj.shadow.normalBias = 0.05;
        obj.shadow.camera.near = 0.1;
        obj.shadow.camera.far = range;
        // Blender doesn't export a glTF light range, so without this point/spot lights
        // fall off to zero only asymptotically and end up lighting (and shadowing) the
        // whole map.
        if (obj.isPointLight || obj.isSpotLight) obj.distance = range;
      }
    }
  });
  scene.add(gltf.scene);
  mapRoot = gltf.scene;

  if (doorObjs.length > 0) {
    doorObjs.forEach((doorObj) => setupDoor(doorObj, doorColliders.get(doorObj), doorConfig[doorObj.name] || {}));
  } else {
    console.warn(`No objects prefixed "${DOOR_PREFIX}" found in the loaded map.`);
  }
  drawerObjs.forEach((drawerObj) => setupDrawer(drawerObj, drawerColliders.get(drawerObj), drawerConfig[drawerObj.name] || {}));

  wireSwitches(switches);
}

// See menu.js's return-to-main-menu flow. Static collision bodies are torn down separately by
// physics.js's resetPhysicsWorld() and doors by door.js's resetDoors() - this only handles
// the map's own THREE geometry and the arrays this module owns.
export function resetMapState() {
  if (mapRoot) {
    scene.remove(mapRoot);
    disposeObject3D(mapRoot);
    mapRoot = null;
  }
  switchSounds.forEach(unregisterSound);
  switchSounds = [];
  collisionMeshes.length = 0;
  typedCollisionMeshes.length = 0;
  mapLights.length = 0;
}

// Each light independently wanders toward a randomly-chosen target intensity and smoothly
// chases it, rather than jumping every frame - that reads as a flicker instead of jitter. The
// flicker* characteristics themselves are per-light (set up in setupMap() above, from the map's
// JSON sidecar with a constants.js fallback), so different lights can flicker differently.
export function updateLightFlicker(dt) {
  mapLights.forEach((l) => {
    const d = l.userData;
    d.flickerTimer -= dt;
    if (d.flickerTimer <= 0) {
      d.flickerTarget = d.flickerMin + Math.random() * (1 - d.flickerMin);
      d.flickerTimer = d.flickerChangeMin + Math.random() * (d.flickerChangeMax - d.flickerChangeMin);
    }
    d.flickerCurrent += (d.flickerTarget - d.flickerCurrent) * Math.min(1, d.flickerSpeed * dt);
    l.intensity = d.on ? d.baseIntensity * d.flickerCurrent : 0;
  });
}
