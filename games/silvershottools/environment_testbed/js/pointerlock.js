// Pointer lock + camera look. The same mousemove either looks around or (while ctrl is held
// with something in at least one hand) rotates the held item(s) instead - see hold.js.

import { canvas, overlay, viewport } from "./dom.js";
import { listener, tryStartAmbiance } from "./audio.js";
import { ctrlDown, heldLeft, heldRight, rotateHeldBody } from "./hold.js";
import { playerStats } from "./playerConfig.js";

export let yaw = 0;
export let pitch = 0;

// See menu.js's return-to-main-menu flow.
export function resetLook() {
  yaw = 0;
  pitch = 0;
}

export function requestLock() {
  canvas.requestPointerLock();
  // AudioListener creates its AudioContext immediately at page load, before any user
  // interaction, so it starts "suspended" - this is the click that's allowed to resume it.
  listener.context.resume();
}
overlay.addEventListener("click", requestLock);
canvas.addEventListener("click", requestLock);

document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === canvas;
  viewport.classList.toggle("locked", locked);
  if (locked) tryStartAmbiance();
});

document.addEventListener("mousemove", (evt) => {
  if (document.pointerLockElement !== canvas) return;

  // While holding ctrl with one or both hands full, mouse movement rotates whatever's held
  // (world-space yaw + a tilt around the camera's current right axis) instead of the camera,
  // so looking around and rotating items don't fight each other. Both hands rotate together.
  if (ctrlDown && (heldLeft || heldRight)) {
    if (heldLeft) rotateHeldBody(heldLeft, evt.movementX, evt.movementY);
    if (heldRight) rotateHeldBody(heldRight, evt.movementX, evt.movementY);
    return;
  }

  yaw -= evt.movementX * playerStats.lookSensitivity;
  pitch -= evt.movementY * playerStats.lookSensitivity;
  pitch = Math.max(-playerStats.pitchLimit, Math.min(playerStats.pitchLimit, pitch));
});
