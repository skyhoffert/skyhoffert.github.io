// Creature library (creatures.glb) and spawning (SPAWN_ markers carrying a "creatures" pool in
// the map's JSON sidecar) - the animated counterpart to objects.js's OBJ_ library/spawnObjects(),
// which this otherwise mirrors closely. Kept as its own module rather than folded into objects.js
// because a creature template is skinned + animated, which changes both how it has to be cloned
// and what a spawned instance needs driven every frame:
// - THREE's own Object3D.clone(true) doesn't re-target a SkinnedMesh's skeleton to the clone's
//   own bones - every clone would end up sharing (and fighting over) the template's original
//   skeleton instead of getting its own. SkeletonUtils.clone() (three.js's own fix for this,
//   already vendored - GLTFLoader itself depends on it) is used instead.
// - Each spawned instance gets its own THREE.AnimationMixer, advanced every frame by
//   updateCreatures() (called from main.js's animate loop, same as e.g. door.js's updateDoors()).

import * as THREE from "three";
import { clone as cloneSkeleton } from "../../vendor/utils/SkeletonUtils.js";
import { scene } from "./scene.js";
import { registerInteractable } from "./interaction.js";
import { shuffleAndTake, disposeObject3D } from "./util.js";
import { CREATURE_PREFIX, SPAWN_PREFIX, CREATURE_IDLE_CLIP, CREATURE_INTERACT_CLIP, CREATURE_ANIM_BLEND_TIME } from "./constants.js";

const creatureLibrary = new Map(); // bare CREATURE_ name -> template Object3D from creatures.glb (not in the live scene)
let creatureLibraryRoot = null; // the creatures.glb scene templates are cloned from, kept only to dispose it on rebuild
let creatureClips = []; // every THREE.AnimationClip creatures.glb carries, shared across every creature type - see spawnCreatures()

// animations is creatures.glb's own top-level gltf.animations (not gltf.scene.animations -
// GLTFLoader keeps clips on the gltf result object itself, not the scene subtree - see menu.js).
export function buildCreatureLibrary(creaturesScene, animations) {
  // Rebuilding (e.g. after returning to the main menu and pressing Play again) would otherwise
  // leak the previous cycle's GPU buffers - they're never added to the live scene, so nothing
  // else disposes them.
  if (creatureLibraryRoot) disposeObject3D(creatureLibraryRoot);
  creatureLibraryRoot = creaturesScene;
  creatureLibrary.clear();
  creatureClips = animations || [];

  creaturesScene.traverse((obj) => {
    if (obj.name.startsWith(CREATURE_PREFIX)) creatureLibrary.set(obj.name.slice(CREATURE_PREFIX.length), obj);
  });
  console.log(`Creature library loaded (${creatureLibrary.size}): ${[...creatureLibrary.keys()].join(", ")}`);
}

const spawnedCreatures = []; // every { instance, mixer } spawnCreatures() has added to the scene - drives updateCreatures() and reset

// Sets up idle (looping, playing immediately) and, if the clip exists, the interact action
// (single-shot, not yet playing - see playInteractAnimation()) for a freshly-spawned instance.
// Returns null for the interact half of the pair when the creature has no CREATURE_INTERACT_CLIP
// clip - registerInteractable() is only wired up by spawnCreatures() when this isn't null, so a
// creature missing it just isn't interactable at all rather than clicking through to nothing.
function setupCreatureAnimation(instance) {
  const mixer = new THREE.AnimationMixer(instance);

  const idleClip = THREE.AnimationClip.findByName(creatureClips, CREATURE_IDLE_CLIP);
  const idleAction = idleClip ? mixer.clipAction(idleClip) : null;
  if (idleAction) idleAction.play();

  const interactClip = THREE.AnimationClip.findByName(creatureClips, CREATURE_INTERACT_CLIP);
  const interactAction = interactClip ? mixer.clipAction(interactClip) : null;
  if (interactAction) {
    interactAction.setLoop(THREE.LoopOnce);
    interactAction.clampWhenFinished = true; // holds its last frame during the fade back to idle below, instead of snapping back to frame 0 first
    mixer.addEventListener("finished", (e) => {
      if (e.action !== interactAction) return;
      if (idleAction) idleAction.reset().fadeIn(CREATURE_ANIM_BLEND_TIME).play();
      interactAction.fadeOut(CREATURE_ANIM_BLEND_TIME);
    });
  }

  return { mixer, idleAction, interactAction };
}

// F on an interactable creature (see spawnCreatures()'s registerInteractable() call below) -
// cross-fades from idle into its interact clip; setupCreatureAnimation()'s "finished" listener
// cross-fades back once it's played through. Restarts cleanly even if F is pressed again mid-play.
function playInteractAnimation({ idleAction, interactAction }) {
  if (idleAction) idleAction.fadeOut(CREATURE_ANIM_BLEND_TIME);
  interactAction.reset().fadeIn(CREATURE_ANIM_BLEND_TIME).play();
}

const spawnWorldPos = new THREE.Vector3();
const spawnWorldQuat = new THREE.Quaternion();

export function spawnCreatures(mapScene, spawnConfig) {
  const markers = [];
  mapScene.traverse((obj) => {
    if (obj.name.startsWith(SPAWN_PREFIX)) markers.push(obj);
  });

  markers.forEach((marker) => {
    // Config keyed by marker name, from the map's JSON sidecar: { creatures: string[], count?: number }.
    // A marker missing a config entry entirely is already flagged by objects.js's spawnObjects()
    // (called the same way from menu.js) - this only cares about markers configured for it.
    const cfg = spawnConfig[marker.name];
    if (!cfg || !Array.isArray(cfg.creatures) || cfg.creatures.length === 0) return;
    const count = Number.isFinite(cfg.count) && cfg.count > 0 ? Math.floor(cfg.count) : 1;

    marker.getWorldPosition(spawnWorldPos);
    marker.getWorldQuaternion(spawnWorldQuat);

    shuffleAndTake(cfg.creatures, count).forEach((name) => {
      const template = creatureLibrary.get(name);
      if (!template) {
        console.warn(`${marker.name} references unknown creature "${name}".`);
        return;
      }
      const instance = cloneSkeleton(template);
      instance.position.copy(spawnWorldPos);
      instance.quaternion.copy(spawnWorldQuat);
      instance.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(instance);

      const { mixer, idleAction, interactAction } = setupCreatureAnimation(instance);
      if (interactAction) {
        registerInteractable(instance, {
          promptText: () => "[F] Interact",
          onActivate: () => playInteractAnimation({ idleAction, interactAction }),
        });
      }

      spawnedCreatures.push({ instance, mixer });
    });
  });
}

export function updateCreatures(dt) {
  spawnedCreatures.forEach(({ mixer }) => mixer.update(dt));
}

// See menu.js's return-to-main-menu flow, mirroring objects.js's resetSpawnedObjects().
export function resetSpawnedCreatures() {
  spawnedCreatures.forEach(({ instance }) => {
    scene.remove(instance);
    disposeObject3D(instance);
  });
  spawnedCreatures.length = 0;
}
