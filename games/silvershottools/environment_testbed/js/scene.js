import * as THREE from "three";
import { AMBIENT_LIGHT_INTENSITY, EYE_HEIGHT } from "./constants.js";
import { viewport, canvas } from "./dom.js";

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202020);

export const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
camera.position.set(0, EYE_HEIGHT, 0);

export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap; // cheapest shadow filtering (hard edges, no PCF)
// Without this the renderer defaults to NoToneMapping, so the map's real-world-unit glTF
// lights just clip to white instead of rolling off the way Blender's view transform does.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Low fill light so unlit corners aren't pitch black; the map's own Blender-authored
// lights (exported via KHR_lights_punctual) are expected to do the real lighting work.
const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3a3a2a, AMBIENT_LIGHT_INTENSITY);
scene.add(hemi);

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
