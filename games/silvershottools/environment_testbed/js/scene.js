import * as THREE from "three";
import { worldStats } from "./worldConfig.js";
import { viewport, canvas } from "./dom.js";

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

export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
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
  const w = viewport.clientWidth;
  const h = viewport.clientHeight;
  renderer.setSize(w, h, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(viewport);
resize();
