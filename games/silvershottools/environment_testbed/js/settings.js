// Audio settings state (master/music/sfx, 0-1 each) plus the registry every playing sound
// goes through so the three sliders in the settings screen (see inventory.js) can scale
// whole categories together without losing each sound's own intrinsic balance:
//   final volume = baseVolume * categoryVolume * masterVolume

import { getCookie, setCookie } from "./cookies.js";
import { SETTINGS_COOKIE, SETTINGS_COOKIE_DAYS } from "./constants.js";

export const audioSettings = { master: 1, music: 1, sfx: 1 };

function loadAudioSettingsFromCookie() {
  const raw = getCookie(SETTINGS_COOKIE);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    ["master", "music", "sfx"].forEach((key) => {
      if (typeof saved[key] === "number") audioSettings[key] = Math.max(0, Math.min(1, saved[key]));
    });
  } catch (err) {
    console.warn("Couldn't parse saved settings cookie:", err);
  }
}
loadAudioSettingsFromCookie();

export function saveAudioSettingsToCookie() {
  setCookie(SETTINGS_COOKIE, JSON.stringify(audioSettings), SETTINGS_COOKIE_DAYS);
}

const registeredSounds = []; // { sound, baseVolume, category: "music" | "sfx" }

function applySoundVolume(entry) {
  const categoryVol = entry.category === "music" ? audioSettings.music : audioSettings.sfx;
  entry.sound.setVolume(entry.baseVolume * categoryVol * audioSettings.master);
}

export function registerSound(sound, category, baseVolume) {
  const entry = { sound, baseVolume, category };
  registeredSounds.push(entry);
  applySoundVolume(entry);
}

export function applyAllVolumes() {
  registeredSounds.forEach(applySoundVolume);
}

// For sounds tied to a loaded map/prop (e.g. a switch's click) rather than living for the
// whole page lifetime (ambiance, the door) - see map.js's resetMapState(), called when
// returning to the main menu, so this registry doesn't grow every time the world reloads.
export function unregisterSound(sound) {
  const idx = registeredSounds.findIndex((entry) => entry.sound === sound);
  if (idx !== -1) registeredSounds.splice(idx, 1);
}
