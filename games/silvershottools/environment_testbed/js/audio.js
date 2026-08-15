import * as THREE from "three";
import { camera } from "./scene.js";
import { registerSound } from "./settings.js";
import { AMBIANCE_VOLUME } from "./constants.js";

export const listener = new THREE.AudioListener();
camera.add(listener);
export const audioLoader = new THREE.AudioLoader();

// Browsers block audio until a user gesture, so this only actually starts once the player
// has clicked into the game (see tryStartAmbiance() calls elsewhere) - whichever happens
// last, the buffer finishing its fetch or the first pointer lock, is what kicks it off.
export const ambiance = new THREE.Audio(listener);
registerSound(ambiance, "music", AMBIANCE_VOLUME);
audioLoader.load("assets/sounds/ambiance.mp3", (buffer) => {
  ambiance.setBuffer(buffer);
  ambiance.setLoop(true);
  tryStartAmbiance();
});

export function tryStartAmbiance() {
  if (ambiance.buffer && !ambiance.isPlaying) ambiance.play();
}

// See menu.js's return-to-main-menu flow. tryStartAmbiance() picks it back up next time
// pointer lock engages (see pointerlock.js).
export function stopAmbiance() {
  if (ambiance.isPlaying) ambiance.stop();
}

export function playOneShot(sound) {
  if (!sound.buffer) return;
  if (sound.isPlaying) sound.stop();
  sound.play();
}
