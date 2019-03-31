// pfmr
// Created March 29, 2019

/* ***********************************************************************************************/
/* BEGIN CONSTANTS *******************************************************************************/
/* ***********************************************************************************************/

// Update rate in milliseconds (denominator is frames per second (fps)).
const UPDATE_RATE = 1000/60; // 30 fps

// Keyboard input codes for easy reference.
const CODE_A = 65;
const CODE_D = 68;
const CODE_F = 70;
const CODE_J = 74;
const CODE_K = 75;
const CODE_L = 76;
const CODE_M = 77;
const CODE_S = 83;
const CODE_W = 87;
const CODE_Z = 90;
const CODE_SPACE = 32;
const CODE_MOUSEDOWN = 1000;

const PADDINGX = 10;
const PADDINGY = 10;

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 12.0;
const ZOOM_FACTOR = 1.0;

//var IP = "localhost";
//var IP = "54.163.147.47";
var IP = "184.56.130.32";
var PORT = "5202";

var players = [];

var terrain = [];

// start with high ping to suggest no connection has been made
var ping = 999;
const WAIT_TICKS_MAX = 10;
var ID = -1;

var ws = new WebSocket("ws://" + IP + ":" + PORT);

const INIT_MSG = {
    "type": "connect",
};

// package mouse x and y coords into neat JSON message
function mouse_msg(x, y){
    return {
        "type": "mouse",
        "id": ID,
        "x": x,
        "y": y
    }
}

// package keypress/keyrelease into neat JSON message
function key_msg(code, down=true) {
    return {
        "type": "key",
        "id": ID,
        "down": down,
        "code": code
    };
}

ws.onopen = function () {
    let start = new Date().getTime();
};

ws.onmessage = function (evt)
{
    // all messages are JSON objects, parse to begin
    let obj = JSON.parse(evt.data);

    // handle each "type" differently
    switch (obj["type"]){
        case "id":
            ID = obj["id"];
            console.log(obj["id"]);
            console.log("ID: " + ID);
            break;
        case "pong": // response of ping
            let elapsed = (new Date().getTime()) - obj["time"];
            ping = elapsed;

            // DEBUG
            console.log("ping: " + elapsed + " ms");
            break;
        case "ping":
            let resp = JSON.stringify({"type": "pong", "id": obj["id"], "time": obj["time"]});
            ws.send(resp);
            break;
        case "ack": // not used
            // DEBUG
            console.log("ACK: " + obj["message"]);
            break;
        case "tick":
            players = obj["players"];
            terrain = obj["terrain"];
            break;
        default:
            console.log(obj);
            break;
    }
};

ws.onerror = function (err){
    console.log("error: " + err);
};

/* ***********************************************************************************************/
/* END CONSTANTS *********************************************************************************/
/* ***********************************************************************************************/

/* ***********************************************************************************************/
/* BEGIN CLASSES *********************************************************************************/
/* ***********************************************************************************************/

/* ***********************************************************************************************/
/* END CLASSES ***********************************************************************************/
/* ***********************************************************************************************/

/* ***********************************************************************************************/
/* BEGIN GLOBALS *********************************************************************************/
/* ***********************************************************************************************/

// Grab the canvas from the html document and set things for it
var canvas = document.getElementById("main_canvas");
canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;
var ctx = canvas.getContext("2d");

// Variables to control screen movement.
var offset = {x: 0, y: 0};
var zoom = 1.0;
var center_x = canvas.width/2;
var center_y = canvas.height/2;

var lmousedown = false;
var lmouselastx = 0;
var lmouselasty = 0;

var wait_ticks = 0;

// this value is used for establishing a new connection
var tick = 0;

var last_time = new Date().getTime();

// IMPORTANT! Call to set up our main function!
// This will call the function "update" every UPDATE_RATE milliseconds.
setInterval(update, UPDATE_RATE);

canvas.addEventListener("mousedown", function(evt) {
    if (ID != -1){
        if (ws.readyState === 1){
            ws.send(JSON.stringify(key_msg(CODE_MOUSEDOWN, true)));
        }
    }

    lmousedown = true;
    lmouselastx = evt.x;
    lmouselasty = evt.y;
}, false);

canvas.addEventListener("mousemove", function(evt){
    if (ID != -1){
        if (ws.readyState === 1){
            ws.send(JSON.stringify(mouse_msg((evt.x - canvas.offsetLeft - offset.x) / zoom, (evt.y - canvas.offsetTop - offset.y) / zoom)));
        }
    }

    // if "dragging"
    if (lmousedown){
        lmouselastx = evt.x;
        lmouselasty = evt.y;
    }
}, false);

canvas.addEventListener("mouseup", function(evt) {
    if (ID != -1){
        if (ws.readyState === 1){
            ws.send(JSON.stringify(key_msg(CODE_MOUSEDOWN, false)));
        }
    }

    lmousedown = false;
}, false);

canvas.addEventListener("mousewheel", function(evt) {
    var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));

    // zoom in and out with mousewheel movements
    if (delta < 0){
        zoom *= (1-ZOOM_FACTOR);
    } else {
        zoom *= (1+ZOOM_FACTOR);
    }
}, false);

document.body.onkeydown = function(e){
    if (ID != -1){
        if (ws.readyState === 1){
            ws.send(JSON.stringify(key_msg(e.keyCode, true)));
        }
    }
}

document.body.onkeyup = function(e){
    if (ID != -1){
        if (ws.readyState === 1){
            ws.send(JSON.stringify(key_msg(e.keyCode, false)));
        }
    }
}

/* ***********************************************************************************************/
/* END GLOBALS ***********************************************************************************/
/* ***********************************************************************************************/

/**
Main update function! This is called once every UPDATE_RATE milliseconds. 
*/
function update()
{
    // If the screen size was changed, adjust!
    // Oooooh, responsive!
    if (document.body.clientWidth != canvas.width || document.body.clientHeight != canvas.height)
    {
        canvas.width = document.body.clientWidth;
        canvas.height = document.body.clientHeight;
        center_x = canvas.width/2;
        center_y = canvas.height/2;
    }

    // Clear the screen by drawing the background.
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Find how long this update took.
    var this_time = new Date().getTime();
    var dur = this_time - last_time;
    last_time = this_time;

    // If the user left this window/tab, don"t jump too far
    if (dur > UPDATE_RATE * 1.1)
    {
        dur = UPDATE_RATE;
    }

    // handle any network tasks
    network();

    draw();
}

function network()
{
    if (ws.readyState === 1)
    {
        if (ID != -1)
        {
            if (tick % Number.parseInt(1000/UPDATE_RATE) === 0)
            {
                ws.send(JSON.stringify({"type": "ping", "id": ID, "time": (new Date().getTime())}));
            }
            tick++;
        }
        else
        {
            if (wait_ticks <= 0)
            {
                ws.send(JSON.stringify(INIT_MSG));
                wait_ticks = WAIT_TICKS_MAX;
            }
            else
            {
                wait_ticks--;
            }
        }
    }
    else if (ws.readyState === 3)
    {
        return;
    }
}

function draw_triangle(tri)
{
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.moveTo(tri.A.x, tri.A.y);
    ctx.lineTo(tri.B.x, tri.B.y);
    ctx.lineTo(tri.C.x, tri.C.y);
    ctx.closePath();
    ctx.fill();
}

function draw()
{
    for (var i = 0; i < players.length; i++)
    {
        var p = players[i];
        if (p.alive)
        {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.w/2, p.y - p.h/2, p.w, p.h);
        }
    }

    for (var i = 0; i < terrain.length; i++)
    {
        draw_triangle(terrain[i]);
    }
}
