// Loads and wires up the map (testbed_map_a.glb): static/player collision, doors, drawers,
// locks, light switches, and per-light flicker state. See objects.js for the separate object
// library/spawning that populates the map with holdable props.

import * as THREE from "three";
import { scene } from "./scene.js";
import { isDescendantOf, disposeObject3D } from "./util.js";
import { hasTypedCollisionPrefix, buildStaticColliderBody } from "./physics.js";
import { registerInteractable } from "./interaction.js";
import { listener, audioLoader, playOneShot } from "./audio.js";
import { registerSound, unregisterSound } from "./settings.js";
import { setupDoor } from "./door.js";
import { setupDrawer } from "./drawer.js";
import { setupLock } from "./lock.js";
import { setupComboLock } from "./comboLock.js";
import {
  DOOR_PREFIX,
  DRAWER_PREFIX,
  LOCK_PREFIX,
  COMBOLOCK_PREFIX,
  COLLISION_PREFIX,
  SWITCH_PREFIX,
  LIGHT_GROUP_PREFIX,
  SWITCH_SOUND_REF_DISTANCE,
  SWITCH_CLICK_VOLUME,
  SWITCH_CREEPY_DELAY,
  SWITCH_CREEPY_VOLUME,
  LIGHT_SHADOW_NEAR,
  LIGHT_SHADOW_FAR,
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
    registerSound(clickSound, "sfx", SWITCH_CLICK_VOLUME);
    switchSounds.push(clickSound);
    switchObj.add(clickSound);
    audioLoader.load("assets/sounds/click.wav", (buffer) => clickSound.setBuffer(buffer));

    // A creepy sting that follows the very first time this switch turns its group's lights on -
    // SWITCH_CREEPY_DELAY after the click, and never again after that first time (even if the
    // lights go off and back on later). Plain THREE.Audio, not PositionalAudio - same as
    // audio.js's ambiance track, this plays the same everywhere rather than coming from the
    // switch's location, so it reads as being "in the player's head" instead of the room.
    const creepySound = new THREE.Audio(listener);
    registerSound(creepySound, "sfx", SWITCH_CREEPY_VOLUME);
    switchSounds.push(creepySound);
    audioLoader.load("assets/sounds/creepy.wav", (buffer) => creepySound.setBuffer(buffer));
    let creepyPlayed = false;

    registerInteractable(switchObj, {
      promptText: () => "[F] Toggle lights",
      onActivate: () => {
        groupLights.forEach((l) => {
          l.userData.on = !l.userData.on;
        });
        playOneShot(clickSound);
        // groupLights don't have to stay in sync with each other (see the comment above), but a
        // single switch flip is judged "turned on" if it left every one of its lights on.
        const turnedOn = groupLights.length > 0 && groupLights.every((l) => l.userData.on);
        if (turnedOn && !creepyPlayed) {
          creepyPlayed = true; // set now, not once the timeout fires, so a rapid re-toggle can't sneak in a second play
          setTimeout(() => playOneShot(creepySound), SWITCH_CREEPY_DELAY * 1000);
        }
      },
    });
  });
}

// config is the map's JSON sidecar (see menu.js's loadWorld()) - doors/drawers/lights/locks/
// comboLocks are all keyed by object name, each entry optional and itself allowed to omit any
// field, falling back to the matching DOOR_*/DRAWER_*/LIGHT_*/COMBOLOCK_* constant (see
// setupDoor()/setupDrawer()/the per-light setup below/updateLightFlicker()/setupComboLock()) for
// anything not customized there - locks are the one exception, since "door"/"key" have no
// sensible constants.js default (see setupLock()). Switches have no config of their own - see
// wireSwitches().
export function setupMap(
  gltf,
  { doors: doorConfig = {}, drawers: drawerConfig = {}, lights: lightConfig = {}, locks: lockConfig = {}, comboLocks: comboLockConfig = {} } = {}
) {
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
  const lockObjs = [];
  const comboLockObjs = [];
  gltf.scene.traverse((obj) => {
    if (obj.name.startsWith(DOOR_PREFIX)) doorObjs.push(obj);
    else if (obj.name.startsWith(DRAWER_PREFIX)) drawerObjs.push(obj);
    else if (obj.name.startsWith(LOCK_PREFIX)) {
      // A lock is a click/raycast target only - the visible keyhole/padlock is modeled as part
      // of the door/furniture itself, same reasoning as hiding COLL_ authoring geometry below.
      // Left in the scene graph (not removed) so it keeps updating its matrixWorld and stays
      // raycastable - interaction.js's crosshair raycast already runs against invisible COLL_
      // meshes the exact same way (see typedCollisionMeshes, populated further down).
      obj.visible = false;
      lockObjs.push(obj);
    } else if (obj.name.startsWith(COMBOLOCK_PREFIX)) {
      // Unlike LOCK_, a combo lock IS the visible prop (its own dials), so it stays visible -
      // see comboLock.js's module comment.
      comboLockObjs.push(obj);
    }
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
      // a light only needs an entry at all for whatever it wants to customize. "shadow" is the
      // one exception (no LIGHT_* constant - see below), defaulting to true.
      const cfg = lightConfig[obj.name] || {};
      const shadowNear = cfg.shadowNear ?? LIGHT_SHADOW_NEAR;
      const shadowFar = cfg.shadowFar ?? LIGHT_SHADOW_FAR;
      const castsShadow = cfg.shadow ?? true;

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
        // mapSize/bias/normalBias are set separately by graphicsSettings.js's
        // applyShadowQuality(), called again once setupMap() returns (see menu.js's loadWorld())
        // - bias in particular has to scale with mapSize (a coarser map has bigger texels, so
        // needs a bigger offset to avoid self-shadowing acne), so it lives with mapSize in one
        // place rather than a fixed guess here that only suited one specific resolution.
        obj.castShadow = castsShadow;
        if (castsShadow) {
          obj.shadow.camera.near = shadowNear;
          obj.shadow.camera.far = shadowFar;
        }
        // Blender doesn't export a glTF light range, so without this point/spot lights fall
        // off to zero only asymptotically and end up lighting (and shadowing) the whole map -
        // unconditional on castsShadow above since this governs the light's actual illumination
        // falloff, not just its shadow camera's far plane. Also why shadowFar (not a separate
        // "range") drives distance too: three.js re-forces a point light's shadow camera far to
        // light.distance every frame regardless of what's set above, so for point lights that's
        // the only value that actually sticks; reusing it for spot lights as well just keeps a
        // single knob instead of two that overlap in practice for point lights and would drift
        // into confusing states for spot lights.
        if (obj.isPointLight || obj.isSpotLight) obj.distance = shadowFar;
      }
    }
  });
  scene.add(gltf.scene);
  mapRoot = gltf.scene;

  // Locks wired up before doors: a lock mesh sitting exactly flush with its door's own surface
  // (zero depth offset) ties with it on interaction.js's raycast-distance arbitration - ties go
  // to whichever registered first, so locks need to get there first for that tie to resolve in
  // the (small, specific) lock's favor rather than the (large, generic) door's.
  lockObjs.forEach((lockObj) => setupLock(lockObj, lockConfig[lockObj.name] || {}));
  comboLockObjs.forEach((lockObj) => setupComboLock(lockObj, comboLockConfig[lockObj.name] || {}));

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
