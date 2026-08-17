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
export const DRAWER_PREFIX = "DRAWER_"; // e.g. "DRAWER_desk_tr" - the sliding equivalent of DOOR_ (see drawer.js)
export const LOCK_PREFIX = "LOCK_"; // e.g. "LOCK_armoire" - a clickable lock mechanism paired with a door + required key via the map's JSON sidecar (see lock.js)
export const SWITCH_PREFIX = "SW_"; // e.g. "SW_room" controls every light matching L_room_*
export const LIGHT_GROUP_PREFIX = "LIGHT_";
export const COLLISION_PREFIX = "COLL_";
export const OBJECT_PREFIX = "OBJ_"; // holdable physics props, e.g. "OBJ_knife", from objects.glb
export const SPAWN_PREFIX = "SPAWN_"; // empties in the map that instantiate objects from the library

// Fallback defaults for whatever a door/light doesn't specify in the map's own JSON sidecar
// (testbed_map_a.json's "doors"/"lights", keyed by object name - see map.js's setupMap() and
// door.js's setupDoor()). Deliberately plain constants, not world.json - every door/light is
// meant to be configured per-instance there, so these only ever matter for a field an entry
// left out (or a door/light with no entry there at all).
export const DOOR_OPEN_ANGLE = Math.PI / 2; // radians, relative to the modeled closed angle
export const DOOR_SPEED = Math.PI; // radians/sec
export const DRAWER_AXIS = "-z"; // which local axis a drawer slides along to open - "x"/"y"/"z", optionally "-" prefixed for the opposite direction
export const DRAWER_SLIDE_DISTANCE = 0.35; // meters, how far along that axis a drawer pulls open
export const DRAWER_SPEED = 1.0; // meters/sec
// meters, clamps how far a point/spot light itself reaches and (see map.js's setupMap()) its
// shadow camera's far plane - the two can't be set independently for a point light (three.js
// forces its shadow camera's far to match light.distance every frame), so one value has to do
// both jobs there; a spot light's shadow far is free to differ, but shares this same fallback.
export const LIGHT_SHADOW_FAR = 22;
export const LIGHT_SHADOW_NEAR = 0.1; // meters, shadow camera's near plane
export const LIGHT_FLICKER_MIN = 0.8; // dimmest a flicker pulls a light down to, as a fraction of its base intensity
export const LIGHT_FLICKER_CHANGE_MIN = 0.05; // seconds between picking a new random flicker target
export const LIGHT_FLICKER_CHANGE_MAX = 0.3;
export const LIGHT_FLICKER_SPEED = 10; // per-second rate intensity chases that target - higher = snappier, lower = smoother

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
export const WAKE_RADIUS = 1; // meters - see physics.js's wakeNearbyBodies(), called from door.js/drawer.js on toggle

export const AMBIANCE_VOLUME = 0.4;
export const DOOR_SOUND_REF_DISTANCE = 3; // meters at which PositionalAudio volume starts falling off
export const SWITCH_SOUND_REF_DISTANCE = 1.5; // smaller than the door's - a switch click is a quiet, close-up sound

export const SETTINGS_COOKIE = "environment_testbed_settings";
export const VIDEO_SETTINGS_COOKIE = "environment_testbed_video_settings"; // see graphicsSettings.js
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

// Internal render height, in pixels, for the game's low-res look - see scene.js's resize().
// Width is derived each resize from the viewport's current aspect ratio (not a fixed pair like
// 480x270) so the rendered image always fills the viewport without stretching; the "low res"
// part comes from this being far below the viewport's actual CSS pixel height, then style.css's
// image-rendering: pixelated upscaling it with blocky nearest-neighbor sampling instead of a blur.
export const RENDER_HEIGHT = 360;

export const DEBUG_COLOR_STATIC = 0x00ff66;
export const DEBUG_COLOR_DYNAMIC = 0xff8800;
