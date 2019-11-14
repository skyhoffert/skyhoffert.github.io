/*
Sky Hoffert
neteng.js: front end for network engine
Last Modified on Nov 13, 2019
*/

// Constants for this program.
const DEV = false; // toggles dev mode. Should be false when pushing code!
const FPS = 24;
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
const IP = DEV ? "localhost" : "100.16.230.232";
const PORT = "5018";

const INIT_MSG = JSON.stringify({type:"connect", width: WIDTH, height: HEIGHT});

// Ready the screen.
var canvas = document.getElementById("canvas");
canvas.width = WIDTH;
canvas.height = HEIGHT;
var ctx = canvas.getContext("2d");

// Global values... sort of
var tUpdate = Date.now();

var neObjs = [];

var myID = null;

const ws = new WebSocket("ws://" + IP + ":" + PORT);
ws.onopen = function open() {
  ws.send(INIT_MSG);
  console.log("CONNECTED to " + IP + ":" + PORT);
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
ws.onerror = function err() {
    console.log("FAILED to connect to " + IP + ":" + PORT);
}

function HandleMessage(obj) {
    if (obj.type === "connected") {
        myID = obj.id;
        console.log("Received id of " + myID);
    } else if (obj.type === "neObj") {
        neObjs.push(JSON.parse(JSON.stringify(obj)));
        Draw();
    } else if (obj.type === "neObjRm") {
        for (let i = 0; i < neObjs.length; i++) {
            if (neObjs[i].id === obj.id) {
                neObjs.splice(i, 1);
                break;
            }
        }

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
        if (!obj.active) { continue; }

        if (obj.which === "text") {
            ctx.font = obj.font;
            ctx.fillStyle = obj.color;
            ctx.fillText(obj.text, obj.x, obj.y);
        }
    }
}

Init();

//setInterval(Draw, 1000/FPS);

document.addEventListener("mousedown", function (evt) {
    ws.send(JSON.stringify({
        type: "mouseUpdate",
        id: myID,
        which: "d/u",
        button: evt.button,
        down: true
    }));
}, false);

document.addEventListener("mouseup", function (evt) {
    ws.send(JSON.stringify({
        type: "mouseUpdate",
        id: myID,
        which: "d/u",
        button: evt.button,
        down: false
    }));
}, false);

document.addEventListener("mousemove", function (evt) {
    ws.send(JSON.stringify({
        type: "mouseUpdate",
        id: myID,
        which: "move",
        x: evt.x,
        y: evt.y
    }));
}, false);
