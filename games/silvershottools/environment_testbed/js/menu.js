// Main menu -> loading screen -> gameplay, and back again. Owns the top-level asset load
// (moved here from main.js) so it can be re-run: pressing Play always starts from a clean
// world, built fresh by loadWorld() below.

import { GLTFLoader } from "../../vendor/loaders/GLTFLoader.js";
import { fetchJson, cacheBust } from "./util.js";
import { requestLock, resetLook } from "./pointerlock.js";
import { setupMap, resetMapState } from "./map.js";
import { buildObjectLibrary, spawnObjects, resetSpawnedObjects } from "./objects.js";
import { buildCreatureLibrary, spawnCreatures, resetSpawnedCreatures } from "./creatures.js";
import { resetPhysicsWorld, syncGravity } from "./physics.js";
import { resetInteractables } from "./interaction.js";
import { resetDoors } from "./door.js";
import { resetDrawers } from "./drawer.js";
import { resetLocks } from "./lock.js";
import { resetComboLocks } from "./comboLock.js";
import { resetPuzzle } from "./puzzle.js";
import { resetHold } from "./hold.js";
import { resetInventory, setupInventoryGrid } from "./inventory.js";
import { resetPlayer } from "./movement.js";
import { setPlayerStats } from "./playerConfig.js";
import { setWorldStats } from "./worldConfig.js";
import { scene, camera, renderer, syncAmbientLight } from "./scene.js";
import { applyShadowQuality } from "./graphicsSettings.js";
import { resetLean } from "./lean.js";
import { stopAmbiance } from "./audio.js";
import { MAP_URL, OBJECTS_URL, CREATURES_URL, CONFIG_URL, WEAPONS_URL, PLAYER_STATS_URL, WORLD_URL } from "./constants.js";

const mainMenuEl = document.getElementById("mainMenu");
const loadingScreenEl = document.getElementById("loadingScreen");
const playButton = document.getElementById("playButton");
const mainMenuButton = document.getElementById("mainMenuButton");

function loadWorld() {
  const loader = new GLTFLoader();
  return Promise.all([
    loader.loadAsync(cacheBust(MAP_URL)),
    loader.loadAsync(cacheBust(OBJECTS_URL)),
    loader.loadAsync(cacheBust(CREATURES_URL)),
    fetchJson(CONFIG_URL),
    fetchJson(WEAPONS_URL),
    fetchJson(PLAYER_STATS_URL),
    fetchJson(WORLD_URL),
  ]).then(([mapGltf, objectsGltf, creaturesGltf, config, weapons, playerStats, worldStats]) => {
    // worldStats/playerStats first - syncGravity()/syncAmbientLight() and resetPlayer() (via
    // playerStats.eyeHeight) below both depend on these already being loaded.
    setWorldStats(worldStats);
    setPlayerStats(playerStats);
    syncGravity(); // re-applies worldStats.gravity to the cannon-es world built at module-init time with just its default
    syncAmbientLight(); // same deal for the hemisphere light's intensity
    setupInventoryGrid(); // (re)builds the main inventory grid at its now-current playerStats.inventory size

    buildObjectLibrary(objectsGltf.scene, weapons);
    buildCreatureLibrary(creaturesGltf.scene, creaturesGltf.animations);
    setupMap(mapGltf, config);
    applyShadowQuality(); // (re)applies the current shadow setting to this fresh map's lights - setupMap() just built them at THREE's own defaults
    spawnObjects(mapGltf.scene, config.spawns || {});
    spawnCreatures(mapGltf.scene, config.spawns || {});
    resetPlayer(); // puts the player at spawn using the just-loaded stats

    // Every material/shadow-variant shader in the scene is now known, but WebGL only actually
    // links a shader program the first time something using it gets drawn - normally that first
    // draw is the opening frame of real gameplay, which is exactly the lag spike this avoids.
    // Doing it here instead, while the loading screen's still up, moves that cost into the load.
    return renderer.compileAsync(scene, camera);
  });
}

// main.js's animate() loop is unconditional - it's already rendering the real scene every
// frame behind the loading screen the moment loadWorld() populates it, compileAsync or no.
// This just keeps the overlay up for a bit of that free run-in after compileAsync resolves,
// so whatever it doesn't cover (texture uploads, first shadow-map passes, JIT warm-up) gets a
// few extra real frames to settle before the player actually sees any of it.
const POST_LOAD_SETTLE_MS = 500;
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

playButton.addEventListener("click", () => {
  mainMenuEl.classList.remove("open");
  loadingScreenEl.classList.add("open");
  loadWorld()
    .then(() => delay(POST_LOAD_SETTLE_MS))
    .then(() => {
      loadingScreenEl.classList.remove("open");
      // Reuses this click's transient activation. If loading (plus the settle delay above) took
      // long enough that the browser no longer considers it "recent," this just silently fails
      // to lock, and the existing "Click to enter" overlay (see pointerlock.js) is the fallback.
      requestLock();
    })
    .catch((err) => {
      console.error("Failed to load map/objects/config:", err);
      loadingScreenEl.classList.remove("open");
      mainMenuEl.classList.add("open"); // back to the menu rather than stranding the player on a dead loading screen
    });
});

mainMenuButton.addEventListener("click", () => {
  document.exitPointerLock();
  stopAmbiance();
  resetHold();
  resetInteractables();
  resetDoors();
  resetDrawers();
  resetLocks();
  resetComboLocks();
  resetPuzzle();
  resetPhysicsWorld();
  resetSpawnedObjects();
  resetSpawnedCreatures();
  resetMapState();
  resetInventory();
  resetLean(); // must run before resetPlayer() - retracts any applied offset from the old camera.position first
  resetPlayer();
  resetLook();
  mainMenuEl.classList.add("open");
});
