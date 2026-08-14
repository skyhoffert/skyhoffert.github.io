// Settings screen (opened from the inventory panel): master/music/sfx volume sliders backed
// by settings.js's audioSettings, persisted to a cookie on close.

import { audioSettings, applyAllVolumes, saveAudioSettingsToCookie } from "./settings.js";
import { inventoryOpen, setInventoryOpen } from "./inventory.js";
import { requestLock } from "./pointerlock.js";

const settingsEl = document.getElementById("settings");
const settingsButton = document.getElementById("settingsButton");
const settingsCloseBtn = document.getElementById("settingsCloseBtn");
const masterVolumeSlider = document.getElementById("masterVolumeSlider");
const musicVolumeSlider = document.getElementById("musicVolumeSlider");
const sfxVolumeSlider = document.getElementById("sfxVolumeSlider");

masterVolumeSlider.value = Math.round(audioSettings.master * 100);
musicVolumeSlider.value = Math.round(audioSettings.music * 100);
sfxVolumeSlider.value = Math.round(audioSettings.sfx * 100);

function bindVolumeSlider(slider, key) {
  slider.addEventListener("input", () => {
    audioSettings[key] = Number(slider.value) / 100;
    applyAllVolumes();
  });
}
bindVolumeSlider(masterVolumeSlider, "master");
bindVolumeSlider(musicVolumeSlider, "music");
bindVolumeSlider(sfxVolumeSlider, "sfx");

settingsButton.addEventListener("click", () => {
  setInventoryOpen(false); // covers it, not stacked on top of it
  settingsEl.classList.add("open");
});

function closeSettings() {
  settingsEl.classList.remove("open");
  saveAudioSettingsToCookie();
  // Deliberately not re-requesting pointer lock here - same reasoning as the inventory's Esc
  // handling below (browsers block requestPointerLock() calls made directly off a keydown).
}

settingsCloseBtn.addEventListener("click", () => {
  closeSettings();
  requestLock();
});

// Esc normally exits pointer lock (handled natively by the browser), but the inventory/settings
// screens are already unlocked while open, so that never fires - this covers closing them
// explicitly. Just closes, deliberately not re-requesting pointer lock: browsers block
// requestPointerLock() calls made directly off an Escape keydown (an anti-trap measure), and
// that rejected request was what was pulling focus off the window. Clicking back in works
// normally instead.
window.addEventListener("keydown", (evt) => {
  if (evt.code !== "Escape" || evt.repeat) return;
  if (settingsEl.classList.contains("open")) {
    closeSettings();
  } else if (inventoryOpen) {
    setInventoryOpen(false);
  }
});
