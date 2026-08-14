// Tunable values shared across modules. Grouped by the system they configure, matching the
// section headers those systems live under in their own files.

export const EYE_HEIGHT = 1.7;
export const CROUCH_EYE_HEIGHT = 1.0;
export const CROUCH_SPEED_MULT = 0.5;
export const CROUCH_TRANSITION_SPEED = 6; // meters/sec the eye height moves toward its crouch/stand target
export const WALK_SPEED = 4.5; // m/s
export const RUN_MULT = 2.2;
export const GRAVITY = -20; // m/s^2
export const JUMP_SPEED = 6.5; // m/s, initial upward velocity on jump
export const LOOK_SENSITIVITY = 0.0022;
export const PITCH_LIMIT = Math.PI / 2 - 0.01;
export const WORLD_BOUND = 200; // safety clamp so the player can't wander off into the void

export const DOOR_NAME = "door_a";
export const DOOR_OPEN_ANGLE = Math.PI / 2; // 90 degrees, relative to the modeled closed angle
export const DOOR_SPEED = Math.PI; // radians/sec
export const INTERACT_RADIUS = 2.2; // meters, shared by every interactable (doors, switches, ...)
export const LIGHT_RANGE = 22; // meters, clamps how far point/spot lights (and their shadows) reach
export const AMBIENT_LIGHT_INTENSITY = 0.04; // low fill light so unlit corners

export const LIGHT_FLICKER_MIN = 0.8; // dimmest a flicker pulls a light down to, as a fraction of its base intensity
export const LIGHT_FLICKER_CHANGE_MIN = 0.05; // seconds between picking a new random flicker target
export const LIGHT_FLICKER_CHANGE_MAX = 0.3;
export const LIGHT_FLICKER_SPEED = 10; // per-second rate intensity chases that target - higher = snappier, lower = smoother

export const SWITCH_PREFIX = "SW_"; // e.g. "SW_room" controls every light matching L_room_*
export const LIGHT_GROUP_PREFIX = "L_";

export const COLLISION_PREFIX = "COLL_";
export const PLAYER_RADIUS = 0.4; // meters, horizontal collision radius
export const WALL_CHECK_HEIGHTS_STAND = [0.3, 1.4]; // meters above the feet to raycast for wall blocking
export const WALL_CHECK_HEIGHTS_CROUCH = [0.3, 0.8];
export const GROUND_PROBE_UP = 0.5; // meters above the feet the downward ground probe starts from
export const GROUND_PROBE_DOWN = 5; // meters below the feet the ground probe still detects a surface

export const OBJECT_PREFIX = "OBJ_"; // holdable physics props, e.g. "OBJ_knife", from objects.glb
export const SPAWN_PREFIX = "SPAWN_"; // empties in the map that instantiate objects from the library
export const HOLD_DISTANCE = 1; // meters in front of the camera while carried
export const HOLD_SIDE_OFFSET = 0.2; // meters left/right of center for the left-/right-hand hold point
export const HOLD_ROTATE_SENSITIVITY = 0.008; // radians per pixel of mouse movement while ctrl-rotating
export const HOLD_SPRING_STIFFNESS = 450; // N/m pulling the held body toward the hold point
export const HOLD_SPRING_DAMPING = 42; // resists that pull proportional to current velocity, kept near critical damping (2*sqrt(stiffness*mass)) as stiffness changes so it doesn't get oscillatory
export const HOLD_MAX_FORCE = 900; // N, clamps the pull so a far-away pickup doesn't snap violently

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

export const INVENTORY_GRID_COLUMNS = 2;
export const INVENTORY_GRID_ROWS = 2;

export const DEBUG_COLOR_STATIC = 0x00ff66;
export const DEBUG_COLOR_DYNAMIC = 0xff8800;
