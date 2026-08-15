// Main menu -> loading screen -> gameplay, and back again. Owns the top-level asset load
// (moved here from main.js) so it can be re-run: pressing Play always starts from a clean
// world, built fresh by loadWorld() below.

import { GLTFLoader } from "../../vendor/loaders/GLTFLoader.js";
import { fetchJson } from "./util.js";
import { requestLock, resetLook } from "./pointerlock.js";
import { setupMap, resetMapState } from "./map.js";
import { buildObjectLibrary, spawnObjects, resetSpawnedObjects } from "./objects.js";
import { resetPhysicsWorld, syncGravity } from "./physics.js";
import { resetInteractables } from "./interaction.js";
import { resetDoors } from "./door.js";
import { resetHold } from "./hold.js";
import { resetInventory, setupInventoryGrid } from "./inventory.js";
import { resetPlayer } from "./movement.js";
import { setPlayerStats } from "./playerConfig.js";
import { setWorldStats } from "./worldConfig.js";
import { syncAmbientLight } from "./scene.js";
import { resetLean } from "./lean.js";
import { stopAmbiance } from "./audio.js";
import { MAP_URL, OBJECTS_URL, CONFIG_URL, WEAPONS_URL, PLAYER_STATS_URL, WORLD_URL } from "./constants.js";

const mainMenuEl = document.getElementById("mainMenu");
const loadingScreenEl = document.getElementById("loadingScreen");
const playButton = document.getElementById("playButton");
const mainMenuButton = document.getElementById("mainMenuButton");

function loadWorld() {
  const loader = new GLTFLoader();
  return Promise.all([
    loader.loadAsync(MAP_URL),
    loader.loadAsync(OBJECTS_URL),
    fetchJson(CONFIG_URL),
    fetchJson(WEAPONS_URL),
    fetchJson(PLAYER_STATS_URL),
    fetchJson(WORLD_URL),
  ]).then(([mapGltf, objectsGltf, config, weapons, playerStats, worldStats]) => {
    // worldStats/playerStats first - setupMap()/setupDoor() (via worldStats.lightRange,
    // doorOpenAngle, ...) and resetPlayer() (via playerStats.eyeHeight) below both depend on
    // these already being loaded.
    setWorldStats(worldStats);
    setPlayerStats(playerStats);
    syncGravity(); // re-applies worldStats.gravity to the cannon-es world built at module-init time with just its default
    syncAmbientLight(); // same deal for the hemisphere light's intensity
    setupInventoryGrid(); // (re)builds the main inventory grid at its now-current playerStats.inventory size

    buildObjectLibrary(objectsGltf.scene, weapons);
    setupMap(mapGltf, config.switches || {});
    spawnObjects(mapGltf.scene, config.spawns || {});
    resetPlayer(); // puts the player at spawn using the just-loaded stats
  });
}

playButton.addEventListener("click", () => {
  mainMenuEl.classList.remove("open");
  loadingScreenEl.classList.add("open");
  loadWorld()
    .then(() => {
      loadingScreenEl.classList.remove("open");
      // Reuses this click's transient activation. If loading took long enough that the
      // browser no longer considers it "recent," this just silently fails to lock, and the
      // existing "Click to enter" overlay (see pointerlock.js) is the fallback prompt.
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
  resetPhysicsWorld();
  resetSpawnedObjects();
  resetMapState();
  resetInventory();
  resetLean(); // must run before resetPlayer() - retracts any applied offset from the old camera.position first
  resetPlayer();
  resetLook();
  mainMenuEl.classList.add("open");
});
