/*
Sky Hoffert
neteng.js: front end for network engine
Last Modified on Nov 13, 2019
*/

// Constants for this program.
const FPS = 24;
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
const IP = "100.16.230.232";
const PORT = "5018";

const INIT_MSG = JSON.stringify({type:"connect"});

// Ready the screen.
var canvas = document.getElementById("canvas");
canvas.width = WIDTH;
canvas.height = HEIGHT;
var ctx = canvas.getContext("2d");

// Global values... sort of
var tUpdate = Date.now();

var neObjs = [];

const ws = new WebSocket("ws://" + IP + ":" + PORT);
ws.onopen = function open() {
  ws.send(INIT_MSG);
};
ws.onmessage = function incoming(data) {
    let obj = null;
    try {
        obj = JSON.parse(data.data);
    } catch {}

    if (!obj) {
        console.log("Issue with message.");
        console.log(data);
        return;
    }

    HandleMessage(obj);
};

function HandleMessage(obj) {
    if (obj.type === "neObj") {
        neObjs.push(JSON.parse(JSON.stringify(obj)));
        Draw();
    }
}

function Init() {
    // DEBUG
    console.log("Initialized.");

    Draw();
}

function Draw() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < neObjs.length; i++) {
        obj = neObjs[i];
        if (obj.which === "text") {
            ctx.font = obj.font;
            ctx.fillStyle = obj.color;
            ctx.fillText(obj.text, obj.x, obj.y);
        }
    }
}

Init();

//setInterval(Draw, 1000/FPS);
