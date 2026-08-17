import * as THREE from "three";
import { worldStats } from "./worldConfig.js";
import { viewport, canvas } from "./dom.js";
import { RENDER_HEIGHT } from "./constants.js";

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

export const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
// Placeholder - the camera isn't visibly rendering gameplay yet (still on the main
// menu/loading screen), and movement.js's resetPlayer() overwrites this with the real
// playerStats.eyeHeight once player.json has loaded and Play's been clicked - see menu.js.
camera.position.set(0, 1.7, 0);
// In the scene graph (rather than passed to the renderer standalone) so wield.js can parent
// wielded items to it and have them actually render.
scene.add(camera);

// antialias off: pointless at RENDER_HEIGHT's low internal resolution (see resize() below) -
// it'd just get blurred back out by the CSS upscale anyway, for a real perf cost.
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
// shadowMap.enabled/.type are set by graphicsSettings.js's applyShadowQuality() instead of
// here - see its own comment for why.
// Without this the renderer defaults to NoToneMapping, so the map's real-world-unit glTF
// lights just clip to white instead of rolling off the way Blender's view transform does.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Low fill light so unlit corners aren't pitch black; the map's own Blender-authored
// lights (exported via KHR_lights_punctual) are expected to do the real lighting work. Built
// with whatever worldStats.ambientLightIntensity currently is (its default, at this early
// module-init moment - see physics.js's syncGravity() for why); syncAmbientLight() re-applies
// the real value once world.json has loaded.
const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3a3a2a, worldStats.ambientLightIntensity);
scene.add(hemi);

export function syncAmbientLight() {
  hemi.intensity = worldStats.ambientLightIntensity;
}

function resize() {
  // Renders at a fixed RENDER_HEIGHT (not the viewport's actual CSS pixel size, and ignoring
  // devicePixelRatio entirely) with width derived from the viewport's current aspect ratio, so
  // the image always fills it without stretching - style.css's #scene rule then upscales that
  // low-res buffer to the full display size with blocky nearest-neighbor sampling.
  const aspect = viewport.clientWidth / viewport.clientHeight;
  const h = RENDER_HEIGHT;
  const w = Math.round(h * aspect);
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);
resize();
