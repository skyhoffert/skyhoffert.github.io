// Shadow quality setting (Off/Low/Medium/High) - lets the settings screen (see settings-ui.js)
// swap shadow map resolution/filtering live, to compare how a given machine handles each level
// without needing to reload. Persisted separately from settings.js's audio settings since it's
// a different concern (video, not audio), even though both follow the same cookie-backed
// load-once/save-on-close pattern.

import * as THREE from "three";
import { getCookie, setCookie } from "./cookies.js";
import { VIDEO_SETTINGS_COOKIE, SETTINGS_COOKIE_DAYS } from "./constants.js";
import { renderer } from "./scene.js";
import { mapLights } from "./map.js";

// enabled: whether the renderer casts shadows at all - off skips the shadow pass entirely,
// regardless of any light's own castShadow. mapSize/type only matter when enabled: mapSize is
// each light's shadow map resolution (higher = sharper edges, pricier); type is the filtering
// algorithm (Basic = hard edges, cheapest; PCF = softer edges, pricier). Not PCFSoftShadowMap -
// this vendored Three.js build has already deprecated it in favor of VSMShadowMap, which isn't
// in this build at all, so requesting it just logs a console warning and silently falls back to
// plain PCFShadowMap anyway; asking for PCFShadowMap directly gets the same result without the
// warning.
// mapSize values sized for constants.js's RENDER_HEIGHT (the game's internal render resolution,
// upscaled with blocky pixelation - see scene.js's resize()), not a full-res display - a shadow
// map far sharper than the pixelated output it ends up in is wasted GPU cost.
//
// normalBias/bias scale inversely with mapSize (a coarser map has bigger texels, so needs a
// bigger offset along the surface normal to avoid the depth-comparison flipping in and out as it
// samples - without this a low mapSize shows up as banding/"zebra stripe" acne across flat
// surfaces like walls) - each roughly doubles as mapSize quarters, tuned by eye at each tier
// rather than one fixed value carried across all of them.
const SHADOW_PRESETS = {
  off: { enabled: false },
  low: { enabled: true, mapSize: 32, type: THREE.BasicShadowMap, normalBias: 0.3, bias: -0.0012 },
  medium: { enabled: true, mapSize: 128, type: THREE.PCFShadowMap, normalBias: 0.14, bias: -0.0006 },
  high: { enabled: true, mapSize: 256, type: THREE.PCFShadowMap, normalBias: 0.1, bias: -0.0004 },
};
const DEFAULT_SHADOW_QUALITY = "medium";

export const videoSettings = { shadowQuality: DEFAULT_SHADOW_QUALITY };

function loadVideoSettingsFromCookie() {
  const raw = getCookie(VIDEO_SETTINGS_COOKIE);
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    if (SHADOW_PRESETS[saved.shadowQuality]) videoSettings.shadowQuality = saved.shadowQuality;
  } catch (err) {
    console.warn("Couldn't parse saved video settings cookie:", err);
  }
}
loadVideoSettingsFromCookie();

export function saveVideoSettingsToCookie() {
  setCookie(VIDEO_SETTINGS_COOKIE, JSON.stringify(videoSettings), SETTINGS_COOKIE_DAYS);
}

// Applies videoSettings.shadowQuality to the renderer and every currently-loaded map light -
// safe to call any time (module load with no map yet, right after a fresh map load, or live
// from the settings screen) since it just reconfigures whatever's already there rather than
// needing anything reloaded. Disposes each light's existing shadow map render target (if any)
// before changing its resolution/filtering - THREE bakes those in at creation time, so changing
// mapSize/renderer.shadowMap.type alone wouldn't take visible effect until something forces a
// new one to be built.
export function applyShadowQuality() {
  const preset = SHADOW_PRESETS[videoSettings.shadowQuality] || SHADOW_PRESETS[DEFAULT_SHADOW_QUALITY];
  renderer.shadowMap.enabled = preset.enabled;
  if (!preset.enabled) return;
  renderer.shadowMap.type = preset.type;
  mapLights.forEach((light) => {
    if (!light.shadow) return;
    light.shadow.mapSize.set(preset.mapSize, preset.mapSize);
    light.shadow.bias = preset.bias;
    light.shadow.normalBias = preset.normalBias;
    if (light.shadow.map) {
      light.shadow.map.dispose();
      light.shadow.map = null;
    }
  });
}
applyShadowQuality(); // sets the renderer's initial state even before any map's loaded - mapLights is just empty until then, so this only touches renderer.shadowMap.enabled/type at this point
