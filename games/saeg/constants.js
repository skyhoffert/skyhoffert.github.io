// Sky Hoffert
// Constants for saeg.

// Generic Constants
const WIDTH = 800;
const HEIGHT = 600;
const PI = 3.1415926;
const TWOPI = PI*2;

// Game specific constants that could change.
const ASTEROID_MIN_MASS = 1000;

var AUDIO_bgmusic = null;
var AUDIO_shoot = null;
var AUDIO_accel = null;
var AUDIO_boom = null;

// Load audio files depending on stage.
// All loading will occur asynchonously. Other classes must check for completion.
function LoadAudio(s) {
    if (s === "Testground") {
        if (AUDIO_shoot === null) {
            AUDIO_shoot = new Audio("audio/shoot.wav");
        }
        if (AUDIO_accel === null) {
            AUDIO_accel = new Audio("audio/accel.wav");
        }
        if (AUDIO_boom === null) {
            AUDIO_boom = new Audio("audio/boom.wav");
        }
        if (AUDIO_bgmusic === null) {
            AUDIO_bgmusic = new Audio("audio/bgmusic.mp3");
        }
    }
}
