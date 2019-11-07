/*
Sky Hoffert
zgah javascript file.
Last Modified: November 7, 2019
*/

const FPS = 60;

var keys = []; // Keeps track of player input.
for (let i = 0; i < 1000; i++){ keys.push(false) };

var canvas = document.getElementById("mainCanvas");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
var ctx = canvas.getContext("2d");

class V2{ constructor(x, y){ this.x = x; this.y = y; } }

class Mouse {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.down = false;
    }
}

// Lerper is a cool class. It will call a callback and provide a value between 0 and 1 until the
// entire Lerp duration has completed. Lerpers are stored in a global array and handled in the
// main update function.
class Lerper {
    constructor(dur, cb) {
        this.dur = dur;
        this.cb = cb;
        this.elapsed = 0;
    }

    Tick(dT) {
        // On the final tick, call the callback with an argument of 1 = 100%.
        if (this.elapsed + dT > this.dur) {
            this.cb(1);
            return;
        }

        // Otherwise, do the normal routine.
        this.elapsed += dT;

        this.cb(this.elapsed / this.dur);
    }
}

class Ship {
    constructor() {
        this.scale = 25;
        this.x = canvas.width/2;
        this.y = canvas.height/2;
        this.angle = 0;
        this.color = "red";

        this.turnSpeed = 0.5;
        this.moveSpeed = 0.001;

        this.velX = 0;
        this.velY = 0;
    }

    Tick(dT) {
        // Align current angle with target angle (of mouse) depending on turn speed.
        let targAng = -Math.atan2(mouse.y - canvas.height/2, mouse.x - canvas.width/2);
        this.angle += (targAng - this.angle) * this.turnSpeed;

        // TODO: fix turn from -Math.PI to Math.PI

        // Move!
        if (mouse.down) {
            this.velX -= dT * this.moveSpeed * Math.cos(this.angle);
            this.velY += dT * this.moveSpeed * Math.sin(this.angle);
        }

        offsetX += dT * this.velX;
        offsetY += dT * this.velY;
    }
    
    Draw() {
        // q is the offset to the rear points
        let q = Math.PI*11/16;

        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x + this.scale*Math.cos(this.angle), this.y - this.scale*Math.sin(this.angle));
        ctx.lineTo(this.x + this.scale*3/4*Math.cos(this.angle + q), this.y - this.scale*3/4*Math.sin(this.angle + q));
        ctx.lineTo(this.x + this.scale*1/6*Math.cos(this.angle + Math.PI), this.y - this.scale*1/6*Math.sin(this.angle + Math.PI));
        ctx.lineTo(this.x + this.scale*3/4*Math.cos(this.angle - q), this.y - this.scale*3/4*Math.sin(this.angle - q));
        ctx.closePath();
        ctx.stroke();
    }
}

class Asteroid {
    constructor(x, y, s) {
        this.x = x;
        this.y = y;
        this.size = s;
        this.active = true;
    }

    Tick(dT) {

    }
    
    Draw() {
        if (!this.active) { return; }

        if (this.x + this.size + offsetX > 0 && this.x - this.size + offsetX < canvas.width) {
            ctx.strokeStyle = "white";
            ctx.beginPath();
            ctx.arc(this.x + offsetX, this.y + offsetY, this.size, 0, 2*Math.PI);
            ctx.closePath();
            ctx.stroke();
        }
    }
}

var mouse = new Mouse();
var playerShip = new Ship();

var objects = [];
var lerpers = [];

var score = 0;
var prevTime = Date.now();

var offsetX = 0;
var offsetY = 0;

for (let i = 0; i < 1000; i++) {
    objects.push(new Asteroid(Math.random() * canvas.width*10, Math.random() * canvas.height*10, 50*Math.random() + 10));
}

function Tick(dT) {
    playerShip.Tick(dT);

    for (let i = 0; i < objects.length; i++) {
        objects[i].Tick(dT);
    }

    for (let i = 0; i < lerpers.length; i++) {
        lerpers[i].Tick(dT);
    }
}

function Collision() {
}

function DrawStage() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    playerShip.Draw();

    for (let i = 0; i < objects.length; i++) {
        objects[i].Draw();
    }
}

function DrawUI() {
}

function Update() {
    let now = Date.now();
    let dT = now - prevTime;

    Tick(dT);

    Collision();

    DrawStage();
    
    DrawUI();

    prevTime = now;
}

setInterval(Update, 1000/FPS);

document.addEventListener("keydown", function (evt) {
    keys[evt.keyCode] = true;
}, false);

document.addEventListener("keyup", function (evt) {
    keys[evt.keyCode] = false;
}, false);

document.addEventListener("mousemove", function (evt) {
    mouse.x = evt.x;
    mouse.y = evt.y;
}, false);

document.addEventListener("mousedown", function (evt) {
    mouse.down = true;
}, false);

document.addEventListener("mouseup", function (evt) {
    mouse.down = false;
}, false);
