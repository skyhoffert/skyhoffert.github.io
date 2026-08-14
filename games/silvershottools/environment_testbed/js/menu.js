// Main menu -> loading screen -> gameplay, and back again. Owns the top-level asset load
// (moved here from main.js) so it can be re-run: pressing Play always starts from a clean
// world, built fresh by loadWorld() below.

import { GLTFLoader } from "../../vendor/loaders/GLTFLoader.js";
import { fetchJson } from "./util.js";
import { requestLock, resetLook } from "./pointerlock.js";
import { setupMap, resetMapState } from "./map.js";
import { buildObjectLibrary, spawnObjects, resetSpawnedObjects } from "./objects.js";
import { resetPhysicsWorld } from "./physics.js";
import { resetInteractables } from "./interaction.js";
import { resetDoor } from "./door.js";
import { resetHold } from "./hold.js";
import { resetInventory } from "./inventory.js";
import { resetPlayer } from "./movement.js";
import { stopAmbiance } from "./audio.js";
import { MAP_URL, OBJECTS_URL, CONFIG_URL } from "./constants.js";

const mainMenuEl = document.getElementById("mainMenu");
const loadingScreenEl = document.getElementById("loadingScreen");
const playButton = document.getElementById("playButton");
const mainMenuButton = document.getElementById("mainMenuButton");

function loadWorld() {
  const loader = new GLTFLoader();
  return Promise.all([loader.loadAsync(MAP_URL), loader.loadAsync(OBJECTS_URL), fetchJson(CONFIG_URL)]).then(
    ([mapGltf, objectsGltf, config]) => {
      buildObjectLibrary(objectsGltf.scene);
      setupMap(mapGltf, config.switches || {});
      spawnObjects(mapGltf.scene, config.spawns || {});
    }
  );
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
  resetDoor();
  resetPhysicsWorld();
  resetSpawnedObjects();
  resetMapState();
  resetInventory();
  resetPlayer();
  resetLook();
  mainMenuEl.classList.add("open");
});
