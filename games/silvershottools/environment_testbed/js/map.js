// Loads and wires up the map (testbed_map_a.glb): static/player collision, the door, light
// switches, and per-light flicker state. See objects.js for the separate object library/
// spawning that populates the map with holdable props.

import * as THREE from "three";
import { scene } from "./scene.js";
import { isDescendantOf, disposeObject3D } from "./util.js";
import { hasTypedCollisionPrefix, buildStaticColliderBody } from "./physics.js";
import { registerInteractable } from "./interaction.js";
import { listener, audioLoader, playOneShot } from "./audio.js";
import { registerSound, unregisterSound } from "./settings.js";
import { setupDoor } from "./door.js";
import { worldStats } from "./worldConfig.js";
import { DOOR_PREFIX, COLLISION_PREFIX, SWITCH_PREFIX, LIGHT_GROUP_PREFIX, SWITCH_SOUND_REF_DISTANCE } from "./constants.js";

export const collisionMeshes = []; // populated with COLL_-prefixed meshes once the map loads
// The subset of collisionMeshes with a typed BOX_/SPHERE_/CYLINDER_ prefix (see physics.js's
// hasTypedCollisionPrefix()) - real physical surfaces (shelves, tables, floors, ...), unlike a
// plain untyped "COLL_" mesh, which is a player-only movement blocker with no actual shape
// (e.g. a bookcase's clip-prevention collider) and shouldn't be a valid place to rest an item.
export const typedCollisionMeshes = [];
export const mapLights = []; // populated with the map's point/spot lights once it loads

let mapRoot = null; // the loaded gltf.scene currently in the THREE scene, or null
let switchSounds = []; // clickSound instances created below, so resetMapState() can unregister them

function wireSwitches(switches, switchConfig) {
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

    // Config keyed by switch name, from the map's JSON sidecar: { startOn?: boolean }.
    // Missing/false means the group starts off.
    let on = (switchConfig[switchObj.name] || {}).startOn === true;
    groupLights.forEach((l) => {
      l.userData.on = on;
    });

    registerInteractable(switchObj, {
      promptText: () => (on ? "[F] Turn off lights" : "[F] Turn on lights"),
      onActivate: () => {
        on = !on;
        groupLights.forEach((l) => {
          l.userData.on = on;
        });
        playOneShot(clickSound);
      },
    });
  });
}

export function setupMap(gltf, switchConfig) {
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

  // Found up front so the traversal below can tell a door-mounted collider apart from a
  // static one - each door's own COLL_ children need to move with it, not get baked in once.
  // Any number of doors is fine - every DOOR_-prefixed object becomes its own door.
  const doorObjs = [];
  gltf.scene.traverse((obj) => {
    if (obj.name.startsWith(DOOR_PREFIX)) doorObjs.push(obj);
  });
  const doorColliders = new Map(); // door object -> its COLL_ children
  doorObjs.forEach((d) => doorColliders.set(d, []));

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
        if (ownerDoor) {
          doorColliders.get(ownerDoor).push(obj); // wired up as a kinematic body after its door, below
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
      // Logical on/off (driven by switches, defaulting to on) is kept separate from the
      // displayed intensity, which updateLightFlicker() recomputes every frame from these -
      // that way flicker and switches don't fight over who gets to set .intensity.
      obj.userData.baseIntensity = obj.intensity;
      obj.userData.on = true;
      obj.userData.flickerCurrent = 1;
      obj.userData.flickerTarget = 1;
      obj.userData.flickerTimer = 0;
      if (obj.shadow) {
        // GLTFLoader creates lights from KHR_lights_punctual with shadows off by default.
        obj.castShadow = true;
        obj.shadow.mapSize.set(512, 512);
        // normalBias (offsets along the surface normal) instead of a large plain bias avoids
        // shadow acne without peter-panning the shadow off thin walls and letting light leak
        // through them.
        obj.shadow.bias = -0.0002;
        obj.shadow.normalBias = 0.05;
        obj.shadow.camera.near = 0.1;
        obj.shadow.camera.far = worldStats.lightRange;
        // Blender doesn't export a glTF light range, so without this point/spot lights
        // fall off to zero only asymptotically and end up lighting (and shadowing) the
        // whole map.
        if (obj.isPointLight || obj.isSpotLight) obj.distance = worldStats.lightRange;
      }
    }
  });
  scene.add(gltf.scene);
  mapRoot = gltf.scene;

  if (doorObjs.length > 0) {
    doorObjs.forEach((doorObj) => setupDoor(doorObj, doorColliders.get(doorObj)));
  } else {
    console.warn(`No objects prefixed "${DOOR_PREFIX}" found in the loaded map.`);
  }

  wireSwitches(switches, switchConfig);
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
// chases it, rather than jumping every frame - that reads as a flicker instead of jitter.
export function updateLightFlicker(dt) {
  mapLights.forEach((l) => {
    const d = l.userData;
    d.flickerTimer -= dt;
    if (d.flickerTimer <= 0) {
      d.flickerTarget = worldStats.lightFlickerMin + Math.random() * (1 - worldStats.lightFlickerMin);
      d.flickerTimer =
        worldStats.lightFlickerChangeMin + Math.random() * (worldStats.lightFlickerChangeMax - worldStats.lightFlickerChangeMin);
    }
    d.flickerCurrent += (d.flickerTarget - d.flickerCurrent) * Math.min(1, worldStats.lightFlickerSpeed * dt);
    l.intensity = d.on ? d.baseIntensity * d.flickerCurrent : 0;
  });
}
