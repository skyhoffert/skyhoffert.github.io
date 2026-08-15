// Generic "things the player can E / click on" system used by doors, switches, and holdable
// props alike - see door.js, map.js, and objects.js for what actually registers here.

import * as THREE from "three";
import { camera } from "./scene.js";
import { canvas, interactPromptEl } from "./dom.js";
import { playerStats } from "./playerConfig.js";

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

// Proximity (distance to the object's actual geometry, not just its origin) plus a crosshair
// raycast, so something only becomes interactable once the player is both close to it and
// actually looking at it. When more than one qualifies, the nearest one wins.
export function updateInteractables() {
  activeInteractable = null;
  let bestDist = playerStats.interactRadius;

  for (const it of interactables) {
    interactBox.setFromObject(it.object);
    const dist = interactBox.distanceToPoint(camera.position);
    if (dist >= bestDist) continue;

    camera.getWorldDirection(interactForward);
    interactRaycaster.set(camera.position, interactForward);
    interactRaycaster.far = playerStats.interactRadius;
    if (interactRaycaster.intersectObject(it.object, true).length === 0) continue;

    activeInteractable = it;
    bestDist = dist;
  }

  const showPrompt = activeInteractable && document.pointerLockElement === canvas;
  interactPromptEl.classList.toggle("visible", showPrompt);
  if (showPrompt) interactPromptEl.textContent = activeInteractable.promptText();
}
