//
// Tag.js
// Simple tag online game.
//

const WIDTH = 960;
const HEIGHT = 720;
const GAME_WIDTH = 720;
const GAME_BG = "#222222";
const MENU_BG = "#181818";
const VERSION = "v0.1";

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
var numIt = -1;

context.fillStyle = MENU_BG;
context.fillRect(GAME_WIDTH, 0, WIDTH-GAME_WIDTH, HEIGHT);

function DrawStaticMenu() {
    context.fillStyle = "white";
    context.font = "bold 36px Verdana";
    context.fillText("Tag", GAME_WIDTH+8, 40);
    context.font = "12px Verdana";
    context.fillStyle = "#669988";
    context.fillText(VERSION, WIDTH-30, HEIGHT-10);

    context.font = "14px Verdana";
    context.fillStyle = "white";
    context.fillText("Lobby Actions:", GAME_WIDTH+8, 200);
    context.fillText("1: New IT", GAME_WIDTH+16, 220);
    context.fillText("2: Reset Lobby", GAME_WIDTH+16, 240);
}

DrawStaticMenu();

function DrawPlayer(p) {
    if (p.it) {
        context.fillStyle = "white";
        context.beginPath();
        context.arc(p.x, p.y, p.r*5/4, 0, 2*Math.PI);
        context.closePath();
        context.fill();
    }

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
    context.fillRect(GAME_WIDTH+2, HEIGHT-30, 100, 30);
    context.font = "12px Verdana";
    context.fillStyle = "white";
    context.fillText(""+ping+" ms", GAME_WIDTH+4, HEIGHT-10);
}

function Update() {
    if (ws.readyState === WebSocket.OPEN && clientNum !== -1) {
        ws.send(JSON.stringify({type:"tick", timeSent:Date.now(), keys:keys, clientNum:clientNum}));
    }
}

const UR = 30;
var wsConnected = false;
var clientNum = -1;
var pingCounter = 0;
var pingTotal = 0;
var ping = 0;
var ip = IP;
var keys = {a:false, d:false};
var ws = new WebSocket("ws://"+ip+":"+PORT);
console.log("Attempting to connect to " + IP);

setInterval(Update, 1000/UR);

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
            context.font = "24px Verdana";
            context.fillStyle = obj.color;
            context.fillText("You are "+obj.color+".", GAME_WIDTH+8, 100);
            break;
        case "tock":
            if (pingCounter === UR) {
                ping = Math.round(pingTotal / pingCounter);
                pingTotal = 0;
                pingCounter = 0;
            } else {
                pingCounter++;
                let curPing = (Date.now() - obj.timeSent);
                pingTotal += curPing;
            }
            players = obj.players;
            if (obj.numIt !== numIt) {
                numIt = obj.numIt;
                context.fillStyle = MENU_BG;
                context.fillRect(GAME_WIDTH+1, 120, WIDTH-GAME_WIDTH, 40);
                if (numIt !== -1) {
                    context.font = "24px Verdana";
                    context.fillStyle = players[numIt].color;
                    context.fillText(""+players[numIt].color+" is it!", GAME_WIDTH+8, 140);
                }
            }
            Draw();
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
        (evt.key === "a" || evt.key === "d" || evt.key === " " || evt.key === "0" ||
        evt.key === "1" || evt.key === "2")) {
        keys[evt.key] = true;
    }
});

document.addEventListener("keyup", function (evt) {
    if (ws.readyState === WebSocket.OPEN && 
        (evt.key === "a" || evt.key === "d" || evt.key === " " || evt.key === "0" ||
        evt.key === "1" || evt.key === "2")) {
        keys[evt.key] = false;
    }
});
