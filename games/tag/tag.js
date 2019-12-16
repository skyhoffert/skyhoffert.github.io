//
// Tag.js
// Simple tag online game.
//

const WIDTH = 960;
const HEIGHT = 720;
const GAME_WIDTH = 720;
const GAME_BG = "#222222";
const MENU_BG = "#181818";

var IP = "100.16.230.232";
var PORT = "5016";

var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");
canvas.width = WIDTH;
canvas.height = HEIGHT;
canvas.style.width = "133vh";
canvas.style.height = "100vh";

var players = [];
var walls = [];

function DrawPlayer(p) {
    context.fillStyle = p.color;
    context.beginPath();
    context.arc(p.x, p.y, p.r, 0, 2*Math.PI);
    context.closePath();
    context.fill();
}

function DrawPlayers() {
    for (let i = 0; i < players.length; i++) {
        if (!players[i].active){ continue; }
        DrawPlayer(players[i]);
    }
}

function DrawWalls() {
    context.fillStyle = "white";
    for (let i = 0; i < walls.length; i++) {
        let w = walls[i];
        context.fillRect(w.x - w.width/2, w.y - w.height/2, w.width, w.height);
    }
}

function Draw() {
    context.fillStyle = GAME_BG;
    context.fillRect(0, 0, GAME_WIDTH, HEIGHT);

    DrawWalls();

    DrawPlayers();
    
    context.fillStyle = MENU_BG;
    context.fillRect(GAME_WIDTH, 0, WIDTH-GAME_WIDTH, HEIGHT);
}

Draw();

var wsConnected = false;
var clientNum = -1;
var frameCounter = 0;
var frameRate = 60;
var ip = IP;
var keys = {a:false, d:false};
var ws = new WebSocket("ws://"+ip+":"+PORT);

ws.addEventListener("error", function (err) {
    if (ip !== IP) {
        ws = new WebSocket("ws://"+IP+":"+PORT);
        ip = IP;
    }
});

ws.addEventListener("open", function (event) {
    ws.send(JSON.stringify({"type": "connect"}));
});

ws.onmessage = function (message) {
    let obj = JSON.parse(message.data);
    
    switch (obj.type) {
        case "connected":
            wsConnected = true;
            clientNum = obj.clientNum;
            walls = obj.walls;
            console.log("Successfully connected as client " + clientNum + ".");
            break;
        case "tick":
            players = obj.players;
            Draw();
            break;
        case "tock":
            if (frameCounter % frameRate == 0) {
                console.log("Ping: " + (Date.now() - obj.timeSent) + " ms");
                frameCounter = 0;
            } else {
                frameCounter++;
            }
            break;
        default:
            console.log("Unknown message type.");
            console.log(obj);
            break;
    }
};

window.onbeforeunload = function () {
    if (ws) {
        ws.send(JSON.stringify({"type": "disconnect", "clientNum": clientNum}));
    }
}

document.addEventListener("keydown", function (evt) {
    if (ws.readyState === WebSocket.OPEN &&
        (evt.key === "a" || evt.key === "d" || evt.key === " " || evt.key === "0")) {
        keys[evt.key] = true;
        ws.send(JSON.stringify({type:"tick", timeSent:Date.now(), keys:keys, clientNum:clientNum}));
    }
});

document.addEventListener("keyup", function (evt) {
    if (ws.readyState === WebSocket.OPEN && 
        (evt.key === "a" || evt.key === "d" || evt.key === " " || evt.key === "0")) {
        keys[evt.key] = false;
        ws.send(JSON.stringify({type:"tick", timeSent:Date.now(), keys:keys, clientNum:clientNum}));
    } else {
        console.log(evt.key);
    }
});
