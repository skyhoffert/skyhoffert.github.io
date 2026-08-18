// Generic "things the player can E / click on" system used by doors, switches, and holdable
// props alike - see door.js, map.js, and objects.js for what actually registers here.

import * as THREE from "three";
import { camera } from "./scene.js";
import { canvas, interactPromptEl } from "./dom.js";
import { playerStats } from "./playerConfig.js";
import { typedCollisionMeshes } from "./map.js";

export const interactables = []; // { object, promptText(), onActivate(), holdable }
export let activeInteractable = null;

export function registerInteractable(object, { promptText, onActivate, holdable }) {
  interactables.push({ object, promptText, onActivate, holdable: !!holdable });
}

// activeInteractable is a live export, not reassignable from outside this module - inventory.js
// uses this to clear it when the interactable it's currently pointing at gets picked up.
export function clearActiveInteractableIf(it) {
  if (activeInteractable === it) activeInteractable = null;
}

// Permanently forgets one interactable, e.g. a solved combo lock that's just been removed from
// the world (see comboLock.js's solveLock()) - unlike resetInteractables(), this only drops this
// one entry rather than clearing the whole registry, and is safe to call mid-session.
export function unregisterInteractable(object) {
  const idx = interactables.findIndex((it) => it.object === object);
  if (idx === -1) return;
  if (activeInteractable === interactables[idx]) activeInteractable = null;
  interactables.splice(idx, 1);
}

// See menu.js's return-to-main-menu flow. The objects themselves (doors, props, switches)
// are torn down by whatever module owns them - this just forgets they were ever registered.
export function resetInteractables() {
  interactables.length = 0;
  activeInteractable = null;
}

const interactBox = new THREE.Box3();
const interactRaycaster = new THREE.Raycaster();
const interactForward = new THREE.Vector3();
// A switch (or anything else) mounted flush against its own wall sits at essentially the same
// distance along the ray as that wall's own collider - without this slack, whichever one the
// raycaster happens to order first would falsely "block" the other.
const WALL_BLOCK_MARGIN = 0.15; // meters

// Proximity (distance to the object's actual geometry, not just its origin) plus a crosshair
// raycast, so something only becomes interactable once the player is both close to it and
// actually looking at it. When more than one qualifies (e.g. a lock mesh sitting right on/in a
// door's own surface - see lock.js), whichever's raycast hit is physically nearest along the
// sightline wins, not whichever has the smaller bounding box or was registered first - that's
// the one actually "under the crosshair" first, which a small object embedded in/on a much
// bigger one (its bounding box swallows the small one's location entirely, reading ~0 distance
// there too) would otherwise never win against.
export function updateInteractables() {
  activeInteractable = null;
  let bestDist = Infinity; // hits are already capped at playerStats.interactRadius below (interactRaycaster.far), so this just needs to start higher than that

  // Whatever real physical surface (if any) is directly ahead, blocking line of sight - an
  // interactable behind it (e.g. a switch on the far side of a wall) shouldn't be reachable
  // just because it's within range and happens to line up with the crosshair too. Deliberately
  // typedCollisionMeshes, not every COLL_ mesh - an untyped one (see map.js) is a player-only
  // movement blocker with no real shape of its own (e.g. a bookcase's rough clip-prevention
  // box), so it shouldn't be able to block sight of an item sitting on one of that bookcase's
  // shelves, inside its own footprint.
  camera.getWorldDirection(interactForward);
  interactRaycaster.set(camera.position, interactForward);
  interactRaycaster.far = playerStats.interactRadius;
  const wallHits = interactRaycaster.intersectObjects(typedCollisionMeshes, false);
  const wallDist = wallHits.length > 0 ? wallHits[0].distance : Infinity;

  for (const it of interactables) {
    // Cheap bounding-box reject first - avoids a full raycast against every single registered
    // interactable in the map every frame, most of which aren't anywhere near the crosshair.
    // Only a reject filter now, not the priority ordering below (see the comment above).
    interactBox.setFromObject(it.object);
    if (interactBox.distanceToPoint(camera.position) >= playerStats.interactRadius) continue;

    const hits = interactRaycaster.intersectObject(it.object, true);
    if (hits.length === 0 || hits[0].distance > wallDist + WALL_BLOCK_MARGIN) continue;
    if (hits[0].distance >= bestDist) continue;

    activeInteractable = it;
    bestDist = hits[0].distance;
  }

  const showPrompt = activeInteractable && document.pointerLockElement === canvas;
  interactPromptEl.classList.toggle("visible", showPrompt);
  if (showPrompt) interactPromptEl.textContent = activeInteractable.promptText();
}
