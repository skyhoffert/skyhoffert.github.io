/*
Sky Hoffert
zgah javascript file.
Last Modified: November 7, 2019
*/

const FPS = 30;

var keys = []; // Keeps track of player input.
for (let i = 0; i < 1000; i++){ keys.push(false) };

var canvas = document.getElementById("mainCanvas");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
var ctx = canvas.getContext("2d");
ctx.lineWidth = 2;

var mouse = new Mouse();
var playerShip = new Ship();

var objects = [];
var lerpers = [];
var trails = [];

var score = 0;
var prevTime = Date.now();

var offsetX = 0;
var offsetY = 0;

for (let i = 0; i < 3000; i++) {
    let x = Math.random() * canvas.width*20 - canvas.width*10;
    let y = Math.random() * canvas.height*20 - canvas.height*10;
    
    // Don't spawn asteroids on the player
    while (Math.abs(x - canvas.width/2) < 100) { x += 20*Math.random(); }
    while (Math.abs(y - canvas.height/2) < 100) { y += 20*Math.random(); }

    objects.push(new Asteroid(x, y, 50*Math.random() + 10));
}

function Distance(x, y, xx, yy) {
    return Math.pow(Math.pow(x - xx, 2) + Math.pow(y - yy, 2), 1/2);
}

function Tick(dT) {
    playerShip.Tick(dT);

    for (let i = 0; i < objects.length; i++) {
        objects[i].Tick(dT);
    }

    for (let i = 0; i < lerpers.length; i++) {
        lerpers[i].Tick(dT);
    }

    for (let i = 0; i < trails.length; i++) {
        trails[i].Tick(dT);
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

    for (let i = 0; i < trails.length; i++) {
        trails[i].Draw();
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
