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
// actually looking at it. When more than one qualifies, the nearest one wins.
export function updateInteractables() {
  activeInteractable = null;
  let bestDist = playerStats.interactRadius;

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
    interactBox.setFromObject(it.object);
    const dist = interactBox.distanceToPoint(camera.position);
    if (dist >= bestDist) continue;

    const hits = interactRaycaster.intersectObject(it.object, true);
    if (hits.length === 0 || hits[0].distance > wallDist + WALL_BLOCK_MARGIN) continue;

    activeInteractable = it;
    bestDist = dist;
  }

  const showPrompt = activeInteractable && document.pointerLockElement === canvas;
  interactPromptEl.classList.toggle("visible", showPrompt);
  if (showPrompt) interactPromptEl.textContent = activeInteractable.promptText();
}
