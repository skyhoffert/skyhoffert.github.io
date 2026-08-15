// Tunable values shared across modules. Grouped by the system they configure, matching the
// section headers those systems live under in their own files.

// Player movement/capability stats (eye height, walk/run/jump speed, crouch, lean, collision
// radius, hold/wield posing, look sensitivity, ...) and world/environment stats (gravity, world
// bound, light behavior, door timing, interact radius, ...) live in player.json/world.json now,
// not here - see playerConfig.js's playerStats and worldConfig.js's worldStats, and
// constants.js's PLAYER_STATS_URL/WORLD_URL below. What's left here is either genuinely
// load-order-sensitive (can't wait on an async fetch) or a structural/naming convention rather
// than a tunable stat.
export const DOOR_PREFIX = "DOOR_"; // e.g. "DOOR_a" - any number of doors, each becomes its own independent open/close state machine (see door.js)
export const SWITCH_PREFIX = "SW_"; // e.g. "SW_room" controls every light matching L_room_*
export const LIGHT_GROUP_PREFIX = "LIGHT_";
export const COLLISION_PREFIX = "COLL_";
export const OBJECT_PREFIX = "OBJ_"; // holdable physics props, e.g. "OBJ_knife", from objects.glb
export const SPAWN_PREFIX = "SPAWN_"; // empties in the map that instantiate objects from the library

export const ATTACK_SWING_TIME = 0.22; // seconds a swing takes, start to finish
export const ATTACK_COOLDOWN_TIME = 0.18; // seconds after a swing finishes before another can start
export const ATTACK_SWING_ARC = 1.0; // radians the wielded item rotates through at the peak of its swing
export const ATTACK_SWING_LUNGE = 0.1; // meters the wielded item pushes forward at the peak of its swing

export const BANG_TEXT_TIME = 0.25; // seconds the "BANG" flash (see attack.js's showBang()) stays on screen per gun-type attack

export const COLL_BOX_PREFIX = COLLISION_PREFIX + "BOX_";
export const COLL_SPHERE_PREFIX = COLLISION_PREFIX + "SPHERE_";
export const COLL_CYLINDER_PREFIX = COLLISION_PREFIX + "CYLINDER_";
export const CYLINDER_SEGMENTS = 12;
export const PROP_MASS = 1; // kg-ish, uniform for every physics prop for now

export const AMBIANCE_VOLUME = 0.4;
export const DOOR_SOUND_REF_DISTANCE = 3; // meters at which PositionalAudio volume starts falling off
export const SWITCH_SOUND_REF_DISTANCE = 1.5; // smaller than the door's - a switch click is a quiet, close-up sound

export const SETTINGS_COOKIE = "environment_testbed_settings";
export const SETTINGS_COOKIE_DAYS = 365;

export const MAP_URL = "assets/testbed_map_a.glb";
export const OBJECTS_URL = "assets/objects.glb";
// All scene configuration (switch start states, spawn pools, ...) that used to live in
// Blender custom properties now lives here instead - much faster to iterate on than
// round-tripping through Blender's custom-property UI and a re-export every time.
export const CONFIG_URL = "assets/testbed_map_a.json";
// Per-weapon type/stats (attack cooldown, swing timing, ammo, ...) - see objects.js's
// weaponStatsFor(). Loaded the same way as CONFIG_URL, and by design the only place any of
// that needs to be edited - no source changes/rebuild needed to retune or add a weapon.
export const WEAPONS_URL = "assets/weapons.json";
// Player movement/capability stats (walk/run/jump speed, crouch, eye height, lean, ...) - see
// playerConfig.js's setPlayerStats(). Loaded the same way as WEAPONS_URL/CONFIG_URL.
export const PLAYER_STATS_URL = "assets/player.json";
// World/environment stats (gravity, world bound, light behavior, door timing, interact
// radius, ...) - see worldConfig.js's setWorldStats(). Loaded the same way.
export const WORLD_URL = "assets/world.json";

export const DEBUG_COLOR_STATIC = 0x00ff66;
export const DEBUG_COLOR_DYNAMIC = 0xff8800;
