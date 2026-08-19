// Entry point: wires up the one cross-feature control that can't live in a single module (F
// activates a non-holdable interactable directly, but opens the inventory for a holdable
// one), and runs the main loop. Every other system - including the main menu/loading screen
// that gate the actual asset load, see menu.js - wires up its own DOM listeners as a side
// effect of being imported below.

import * as THREE from "three";

import { canvas, statsEl } from "./dom.js";
import { scene, camera, renderer } from "./scene.js";

import { updateLightFlicker } from "./map.js";
import { updateDoors } from "./door.js";
import { updateDrawers } from "./drawer.js";
import { updateComboLocks } from "./comboLock.js";
import { updateCreatures } from "./creatures.js";
import { puzzleActive, exitPuzzle } from "./puzzle.js";

import { updateMovement } from "./movement.js";
import { updateFootsteps } from "./footsteps.js";
import { yaw, pitch } from "./pointerlock.js";
import { retractLean, applyLean, leanRoll } from "./lean.js";
import { stepPhysics } from "./physics.js";
import { applyHeldForces, heldLeft, heldRight } from "./hold.js";
import { updateAttacks } from "./attack.js";
import { debugViewOn, updateDebugView } from "./debug.js";
import { activeInteractable, updateInteractables } from "./interaction.js";
import { startInventoryPickup } from "./inventory.js";
import "./settings-ui.js";
import "./wieldDebug.js";
import "./menu.js";

// F activates non-holdable interactables (doors, switches) directly, but on a holdable prop
// it starts an inventory pickup instead - hand-carrying a prop is still done with the mouse
// buttons (see hold.js). While focused on a puzzle (see puzzle.js), F means the opposite -
// "stop interacting" - same key, just toggled, like wieldDebug.js's P.
window.addEventListener("keydown", (evt) => {
  if (evt.code !== "KeyF" || evt.repeat) return;
  if (document.pointerLockElement !== canvas) return;
  if (puzzleActive) {
    exitPuzzle();
    return;
  }
  if (!activeInteractable) return;
  if (activeInteractable.holdable) startInventoryPickup(activeInteractable);
  else activeInteractable.onActivate();
});

const timer = new THREE.Timer();
let fpsSmoothed = 0;

function animate(t) {
  requestAnimationFrame(animate);
  timer.update(t);
  const dt = Math.min(timer.getDelta(), 0.1);

  retractLean(); // undo last frame's visual lean offset before movement's checks run against camera.position
  updateMovement(dt);
  updateFootsteps(dt); // reads movement's just-updated currentFootstepMode()
  applyLean(dt); // re-apply this frame's lean offset now that movement's used the real position
  updateDoors(dt);
  updateDrawers(dt);
  updateComboLocks(dt);
  updateLightFlicker(dt);
  updateCreatures(dt);
  applyHeldForces();
  stepPhysics(dt);
  updateAttacks(dt);
  if (debugViewOn) updateDebugView();
  // Not while focused on a puzzle (see puzzle.js) - the crosshair should stay fixed on whatever's
  // focused instead of re-targeting other interactables as the player looks around a dial.
  if (!puzzleActive && (!heldLeft || !heldRight)) updateInteractables(); // at least one hand still free to grab something
  camera.rotation.set(pitch, yaw, leanRoll, "YXZ");

  renderer.render(scene, camera);

  const fps = dt > 0 ? 1 / dt : 0;
  fpsSmoothed += (fps - fpsSmoothed) * 0.1;
  statsEl.textContent =
    `pos  ${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}\n` +
    `look yaw ${((yaw * 180) / Math.PI).toFixed(0)}  pitch ${((pitch * 180) / Math.PI).toFixed(0)}\n` +
    `fps  ${fpsSmoothed.toFixed(0)}`;
}
animate();
