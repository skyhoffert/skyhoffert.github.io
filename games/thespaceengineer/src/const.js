// const.js: Constant values.

const THE_SPACE_ENGINEER_VERSION = 0.1;

const WIDTH = 900;
const HEIGHT = 600;

const LOG_LEVELS = {TRACE:5, DEBUG:4, INFO:3, WARN:2, ERROR:1, FATAL:0};
const LOG_LEVEL = LOG_LEVELS.TRACE;

const PI = 3.1415926;

const LAYER_BACKGROUND    = 0;
const LAYER_MIDBACKGROUND = 1;
const LAYER_MAINSTAGE     = 2;
const LAYER_FOREGROUND    = 3;
const LAYER_PREUI         = 4;
const LAYER_UI            = 5;

const KEYS_INIT = {
    "ArrowDown": {down:false, down_time:0},
    "ArrowUp": {down:false, down_time:0},
    "ArrowLeft": {down:false, down_time:0},
    "ArrowRight": {down:false, down_time:0},
    "Enter": {down:false, down_time:0},
    "Space": {down:false, down_time:0},
    "ControlLeft": {down:false, down_time:0},
    "ControlRight": {down:false, down_time:0},
    "ShiftLeft": {down:false, down_time:0},
    "ShiftRight": {down:false, down_time:0},
    "KeyA": {down:false, down_time:0},
    "KeyS": {down:false, down_time:0},
    "KeyD": {down:false, down_time:0},
    "KeyW": {down:false, down_time:0},
    "KeyQ": {down:false, down_time:0},
    "KeyR": {down:false, down_time:0},
    "Escape": {down:false, down_time:0},
};
