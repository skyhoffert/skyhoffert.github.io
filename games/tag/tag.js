//
// Tag.js
// Simple tag online game.
//

const WIDTH = 960;
const HEIGHT = 720;
const GAME_WIDTH = 720;
const GAME_BG = "#050505";
const MENU_BG = "#030303";
const FPS = 24;

var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");
canvas.width = WIDTH;
canvas.height = HEIGHT;
canvas.style.width = "133vh";
canvas.style.height = "100vh";

var players = [];

context.fillStyle = GAME_BG;
context.fillRect(0, 0, GAME_WIDTH, HEIGHT);
context.fillStyle = MENU_BG;
context.fillRect(GAME_WIDTH, 0, WIDTH-GAME_WIDTH, HEIGHT);

context.fillStyle = "red";
context.fillRect(100, 100, 100, 100);

function DrawPlayer(p) {
    
}

function DrawPlayers() {
    for (let i = 0; i < players.length; i++) {
        DrawPlayers(players[i]);
    }
}

DrawPlayers();
