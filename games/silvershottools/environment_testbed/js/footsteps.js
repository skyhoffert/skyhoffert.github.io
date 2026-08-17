// Footstep sfx: while the player is walking/running/crouch-walking (see movement.js's
// currentFootstepMode()), plays a randomly-picked step_N.wav on a repeating interval, one
// interval and volume per mode so running feels quicker-footed and louder while crouching is
// slower and quieter/stealthier. Both are player.json-configurable (playerStats.footsteps - see
// playerConfig.js) rather than settings.js's registerSound()'s baseVolume, since that's fixed at
// registration time and playerStats can change (reloaded) after this module's already set up -
// reading it fresh in updateFootsteps() below picks up whatever's current instead.

import * as THREE from "three";
import { listener, audioLoader } from "./audio.js";
import { audioSettings } from "./settings.js";
import { playerStats } from "./playerConfig.js";
import { currentFootstepMode } from "./movement.js";

const STEP_COUNT = 5;
const stepBuffers = new Array(STEP_COUNT);
let stepBuffersLoaded = 0;
for (let i = 0; i < STEP_COUNT; i++) {
  audioLoader.load(`assets/sounds/step_${i + 1}.wav`, (buffer) => {
    stepBuffers[i] = buffer;
    stepBuffersLoaded++;
  });
}

const footstepSound = new THREE.Audio(listener);

let sinceLastStep = 0;

function intervalFor(mode) {
  if (mode === "run") return playerStats.footsteps.runInterval;
  if (mode === "crouch") return playerStats.footsteps.crouchInterval;
  return playerStats.footsteps.walkInterval;
}

function volumeFor(mode) {
  if (mode === "run") return playerStats.footsteps.runVolume;
  if (mode === "crouch") return playerStats.footsteps.crouchVolume;
  return playerStats.footsteps.walkVolume;
}

export function updateFootsteps(dt) {
  const mode = currentFootstepMode();
  if (!mode || stepBuffersLoaded < STEP_COUNT) {
    sinceLastStep = 0; // next step plays a full interval after the player starts moving again, not instantly
    return;
  }
  sinceLastStep += dt;
  if (sinceLastStep < intervalFor(mode)) return;
  sinceLastStep = 0;

  footstepSound.setBuffer(stepBuffers[Math.floor(Math.random() * STEP_COUNT)]);
  footstepSound.setVolume(volumeFor(mode) * audioSettings.sfx * audioSettings.master);
  if (footstepSound.isPlaying) footstepSound.stop();
  footstepSound.play();
}
