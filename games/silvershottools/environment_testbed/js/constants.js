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
export const COMBOLOCK_PREFIX = "COMBOLOCK_"; // e.g. "COMBOLOCK_desk_br" - a focus-mode dial-combination puzzle paired with a door/drawer via the map's JSON sidecar (see comboLock.js)
export const COMBOLOCK_DIAL_PREFIX = "DIAL_"; // children of a COMBOLOCK_ object, one per digit - however many exist is however many dials that lock has
export const COMBOLOCK_PIN_NAME = "PIN"; // exact-name (not prefix) child of a COMBOLOCK_ object - the little bolt that plays a slide/rotate/shrink retract animation once solved (see comboLock.js's startSolve()); optional, a lock with none just disappears instantly when solved
export const SWITCH_PREFIX = "SW_"; // e.g. "SW_room" controls every light matching L_room_*
export const LIGHT_GROUP_PREFIX = "LIGHT_";
export const COLLISION_PREFIX = "COLL_";
export const OBJECT_PREFIX = "OBJ_"; // holdable physics props, e.g. "OBJ_knife", from objects.glb
export const CREATURE_PREFIX = "CREATURE_"; // animated/skinned creature roots, e.g. "CREATURE_rat", from creatures.glb
export const SPAWN_PREFIX = "SPAWN_"; // empties in the map that instantiate objects from the library

// Fallback defaults for whatever a door/light doesn't specify in the map's own JSON sidecar
// (testbed_map_a.json's "doors"/"lights", keyed by object name - see map.js's setupMap() and
// door.js's setupDoor()). Deliberately plain constants, not world.json - every door/light is
// meant to be configured per-instance there, so these only ever matter for a field an entry
// left out (or a door/light with no entry there at all).
export const DOOR_OPEN_ANGLE = Math.PI / 2; // radians, relative to the modeled closed angle
export const DOOR_SPEED = Math.PI; // radians/sec
export const DOOR_SOUND_VOLUME = 1; // 0-1 - door.js's open/close sounds, also reused as-is by drawer.js (same sound files)
export const DRAWER_AXIS = "-z"; // which local axis a drawer slides along to open - "x"/"y"/"z", optionally "-" prefixed for the opposite direction
export const DRAWER_SLIDE_DISTANCE = 0.35; // meters, how far along that axis a drawer pulls open
export const DRAWER_SPEED = 1.0; // meters/sec
export const LOCK_UNLOCK_VOLUME = 1; // 0-1 - lock.js's unlock sound (a LOCK_ object, e.g. the armoire's key lock)
export const COMBOLOCK_DIAL_AXIS = "x"; // which local axis a combo lock's dials spin about to show their digit - "x"/"y"/"z"
export const COMBOLOCK_DIAL_SPEED = 14; // radians/sec each dial eases toward its current target rotation
export const COMBOLOCK_CLICK_VOLUME = 0.35; // 0-1 - plays on every dial notch, so it's kept well below COMBOLOCK_UNLOCK_VOLUME
export const COMBOLOCK_UNLOCK_VOLUME = 1; // 0-1 - plays once, when the lock is solved
export const COMBOLOCK_FOCUS_DISTANCE = 0.8; // meters in front of the camera a combo lock is placed when focused (see comboLock.js's focusLock()) - a snapshot at the moment of focus, not a live offset, so the player can look around it afterward
export const COMBOLOCK_FOCUS_DROP = 0.12; // meters below dead-center at that same moment, so it doesn't sit right on top of the crosshair
export const COMBOLOCK_FOCUS_SIDE = 0.1; // meters to the side (camera-right) at that same moment, so the lock's dials land centered in view rather than the lock object's own (off-center) origin - flip the sign if it goes the wrong way
export const COMBOLOCK_PIN_SLIDE_AXIS = "x"; // which local axis (optionally "-" prefixed) the PIN child slides along when the lock is solved - Blender's own local axes carry straight through unchanged since the pin isn't a scene-root object, same reasoning as COMBOLOCK_DIAL_AXIS
export const COMBOLOCK_PIN_SLIDE_DISTANCE = 0.1; // meters
export const COMBOLOCK_PIN_SLIDE_SPEED = 0.15; // meters/sec - ~0.67s to cover COMBOLOCK_PIN_SLIDE_DISTANCE
export const COMBOLOCK_PIN_ROTATE_AXIS = "x"; // which local axis the pin spins about, after sliding, when solved
export const COMBOLOCK_PIN_ROTATE_ANGLE = Math.PI / 2; // radians (90 degrees)
export const COMBOLOCK_PIN_ROTATE_SPEED = Math.PI * 0.75; // radians/sec - ~0.67s to cover COMBOLOCK_PIN_ROTATE_ANGLE
export const COMBOLOCK_PIN_SHRINK_DURATION = 0.6; // seconds - after the pin slides+rotates, the *whole lock* (not just the pin) shrinks uniformly toward 0 over this fixed duration (not a fixed speed - its current scale can be tiny, which made a fixed units/sec shrink finish in a couple frames) before being torn down
export const COMBOLOCK_FOCUS_SCALE = 4; // multiplier over the lock's own modeled scale while focused, so its dials actually read at that distance
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

// Clip name every creature is expected to have and starts playing on spawn (see creatures.js's
// spawnCreatures()) - a creature missing it just stands there un-animated rather than erroring.
export const CREATURE_IDLE_CLIP = "idle";
// Clip name a creature plays once through when the player interacts with it (F - see
// interaction.js), then blends back to CREATURE_IDLE_CLIP - a creature missing it just isn't
// interactable at all (see creatures.js's spawnCreatures()). "rat"'s is its "snif" clip.
export const CREATURE_INTERACT_CLIP = "snif";
export const CREATURE_ANIM_BLEND_TIME = 0.2; // seconds, cross-fade duration between idle and the interact clip in both directions

export const COLL_BOX_PREFIX = COLLISION_PREFIX + "BOX_";
export const COLL_SPHERE_PREFIX = COLLISION_PREFIX + "SPHERE_";
export const COLL_CYLINDER_PREFIX = COLLISION_PREFIX + "CYLINDER_";
export const CYLINDER_SEGMENTS = 12;
export const PROP_MASS = 1; // kg-ish, uniform for every physics prop for now
// cannon-es's own per-body defaults (linear/angularDamping 0.01) barely damp anything - a round
// shape (COLL_SPHERE_/CYLINDER_) resting on a flat collider is especially prone to a small
// persistent creep from the contact solver that never fully decays. Pushing damping well above
// default at least shrinks it; it doesn't reliably kill it outright (see physics.js's
// buildPropBody()/stepPhysics() for why cannon-es's own built-in sleep check can't be trusted to
// ever catch a body still creeping like this, and what drives sleep instead).
export const PROP_LINEAR_DAMPING = 0.3;
export const PROP_ANGULAR_DAMPING = 0.4; // higher than linear - angular (rolling/tipping) creep is the more visible half of this for round props
// physics.js's stepPhysics() forces a prop fully asleep once its LINEAR speed alone (not
// cannon-es's own default combined linear+angular check - see buildPropBody()'s comment) has
// stayed under this for PROP_SETTLE_TIME straight.
export const PROP_SETTLE_LINEAR_SPEED = 0.08; // m/s
export const PROP_SETTLE_TIME = 0.4; // seconds
export const WAKE_RADIUS = 1; // meters - see physics.js's wakeNearbyBodies(), called from door.js/drawer.js on toggle

export const AMBIANCE_VOLUME = 0.4;
export const DOOR_SOUND_REF_DISTANCE = 3; // meters at which PositionalAudio volume starts falling off
export const SWITCH_SOUND_REF_DISTANCE = 1.5; // smaller than the door's - a switch click is a quiet, close-up sound
export const SWITCH_CLICK_VOLUME = 1; // 0-1 - a switch's ordinary toggle click
export const SWITCH_CREEPY_DELAY = 0.5; // seconds after the click sound, the one-time creepy sting plays following a switch's first-ever turn-on (see map.js's wireSwitches())
export const SWITCH_CREEPY_VOLUME = 1; // 0-1 - that one-time creepy sting

export const SETTINGS_COOKIE = "environment_testbed_settings";
export const VIDEO_SETTINGS_COOKIE = "environment_testbed_video_settings"; // see graphicsSettings.js
export const SETTINGS_COOKIE_DAYS = 365;

export const MAP_URL = "assets/testbed_map_a.glb";
export const OBJECTS_URL = "assets/objects.glb";
export const CREATURES_URL = "assets/creatures.glb";
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
