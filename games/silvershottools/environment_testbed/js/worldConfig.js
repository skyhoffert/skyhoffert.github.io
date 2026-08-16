// Live world/environment stats, loaded from world.json (see constants.js's WORLD_URL) via
// setWorldStats(), called once from menu.js's loadWorld() before gameplay starts. Same pattern
// as playerConfig.js - every module that needs one of these (physics.js, hold.js, scene.js)
// just imports `worldStats` and reads the property directly, no per-module setter needed,
// EXCEPT the two values baked into a separate object at module-init time rather than read live
// each use: physics.js's cannon-es gravity Vec3 (see its syncGravity()) and scene.js's ambient
// HemisphereLight intensity (see its syncAmbientLight()) - both have to be explicitly
// re-applied once this has loaded.
//
// Door/light behavior isn't here - every door and light is configured per-instance in the
// map's own JSON sidecar instead (see map.js's setupMap()/door.js's setupDoor()), with plain
// constants.js constants (not this file) as the fallback for whatever an entry omits.
export const worldStats = {
  gravity: -20,
  worldBound: 200,
  ambientLightIntensity: 0.04,
};

export function setWorldStats(stats) {
  Object.assign(worldStats, stats);
}
