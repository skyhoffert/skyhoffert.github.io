//
// Tag.js
// Simple tag online game.
//

const WIDTH = 960;
const HEIGHT = 720;
const GAME_WIDTH = 720;
const GAME_BG = "#222222";
const MENU_BG = "#181818";
const VERSION = "v0.2";
const VALID_KEYS = ["a", "d", "w", " ", "1", "2", "7", "8", "9"];

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
var others = [];
var numIt = -1;
var portalAng = 0;
var chat = [];

context.fillStyle = MENU_BG;
context.fillRect(GAME_WIDTH, 0, WIDTH-GAME_WIDTH, HEIGHT);

function DrawMenu() {
    context.fillStyle = MENU_BG;
    context.fillRect(GAME_WIDTH, 0, WIDTH-GAME_WIDTH, HEIGHT);
    
    context.font = "24px Verdana";
    context.fillStyle = players[clientNum].color;
    context.fillText("You are "+players[clientNum].color+", ", GAME_WIDTH+8, 100);
    context.fillText(""+players[clientNum].name, GAME_WIDTH+8, 126);

    if (numIt !== -1) {
        context.font = "24px Verdana";
        context.fillStyle = players[numIt].color;
        context.fillText(""+players[numIt].color+" is it!", GAME_WIDTH+8, 160);
    }
    
    context.font = "12px Verdana";
    context.fillStyle = "white";
    context.fillText(""+ping+" ms", GAME_WIDTH+4, HEIGHT-10);
    
    context.fillStyle = "white";
    context.font = "bold 36px Verdana";
    context.fillText("Tag", GAME_WIDTH+8, 40);
    context.font = "12px Verdana";
    context.fillStyle = "#669988";
    context.fillText(VERSION, WIDTH-30, HEIGHT-10);

    context.font = "14px Verdana";
    context.fillStyle = "white";
    context.fillText("Lobby Actions:", GAME_WIDTH+8, 200);
    context.fillText("1: New Round", GAME_WIDTH+16, 220);
    context.fillText("2: Reset Lobby", GAME_WIDTH+16, 240);
    context.fillText("Chat:", GAME_WIDTH+8, 285);

    context.strokeStyle = "white";
    context.beginPath();
    context.moveTo(GAME_WIDTH, 270);
    context.lineTo(WIDTH, 270);
    context.closePath();
    context.stroke();
    context.beginPath();
    context.moveTo(GAME_WIDTH, 600);
    context.lineTo(WIDTH, 600);
    context.closePath();
    context.stroke();
    context.beginPath();
    context.moveTo(GAME_WIDTH, 613);
    context.lineTo(WIDTH, 613);
    context.closePath();
    context.stroke();

    context.fillStyle = "white";
    context.font = "11px Verdana";
    for (let i = chat.length-1; i >= 0; i--) {
        if ((chat.length-i)*12 > 300) { break; }
        context.fillText(chat[i], GAME_WIDTH+8, 600-(chat.length-i)*12);
    }
    context.fillText("7: gg", GAME_WIDTH+8, 610);
    context.fillText("8: ez", GAME_WIDTH+98, 610);
    context.fillText("9: rip", GAME_WIDTH+188, 610);

    context.font = "12px Verdana";
    context.fillText("a: Move Left", GAME_WIDTH+8, 640);
    context.fillText("d: Move Right", GAME_WIDTH+8, 654);
    context.fillText("Space: Jump", GAME_WIDTH+8, 668);
    context.fillText("w: Special Ability", GAME_WIDTH+8, 682);
}

function DrawStaticMenu() {
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
    
    if (p.hasSpecial) {
        context.fillStyle = "black";
        context.beginPath();
        context.arc(p.x, p.y, p.r/4, 0, 2*Math.PI);
        context.closePath();
        context.fill();
    }

    context.font = "9px Verdana";
    let nw = context.measureText(p.name).width;
    context.fillStyle = "white";
    context.fillText(p.name, p.x - nw/2, p.y-p.r-2);
}

function DrawOthers() {
    for (let i = 0; i < others.length; i++) {
        let o = others[i];
        if (o.type === "mvwall") {
            context.fillStyle = "white";
            context.fillRect(o.x - o.width/2, o.y - o.height/2, o.width, o.height);
        } else if (o.type === "portal" && o.active === true) {
            context.fillStyle = "white";
            context.beginPath();
            context.arc(o.x, o.y, o.r, 0, 2*Math.PI);
            context.closePath();
            context.fill();
            context.strokeStyle = "black";
            context.beginPath();
            context.moveTo(o.x, o.y);
            context.lineTo(o.x + o.r/2 * Math.cos(portalAng),
                o.y + o.r/2 * Math.sin(portalAng));
            context.closePath();
            context.stroke();

            context.beginPath();
            context.arc(o.x2, o.y2, o.r, 0, 2*Math.PI);
            context.closePath();
            context.fill();
            context.strokeStyle = "black";
            context.beginPath();
            context.moveTo(o.x2, o.y2);
            context.lineTo(o.x2 + o.r/2 * Math.cos(-portalAng),
                o.y2 + o.r/2 * Math.sin(-portalAng));
            context.closePath();
            context.stroke();

            portalAng += 0.08;
            if (portalAng > 6.28) {
                portalAng -= 6.28;
            }
        }
    }
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

    DrawOthers();

    DrawPlayers();
    
    DrawMenu();
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
var ip = "localhost";
ip = IP; // Comment out when in dev.
var keys = {a:false, d:false};
var ws = new WebSocket("ws://"+ip+":"+PORT);

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
            }
            others = obj.others;
            if (obj.newChats) {
                for (let i = 0; i < obj.newChats.length; i++) {
                    chat.push(obj.newChats[i]);
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
    if (ws.readyState === WebSocket.OPEN && VALID_KEYS.includes(evt.key)) {
        keys[evt.key] = true;
    }
});

document.addEventListener("keyup", function (evt) {
    if (ws.readyState === WebSocket.OPEN && VALID_KEYS.includes(evt.key)) {
        keys[evt.key] = false;
    }
});
