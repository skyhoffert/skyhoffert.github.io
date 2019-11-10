/*
Sky Hoffert
zgah javascript file.
Last Modified: November 7, 2019
*/

const FPS = 35;

var keys = []; // Keeps track of player input.
for (let i = 0; i < 1000; i++){ keys.push(false) };

var canvas = document.getElementById("mainCanvas");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
var context = canvas.getContext("2d");
context.lineWidth = 2;

var WIDTH = canvas.width;
var HEIGHT = canvas.height;

var mouse = new Mouse();
var playerShip = new Ship();

var objects = [];
var deadObjs = [];
var lerpers = [];
var lurkers = [];
var trails = [];

var score = 0;
var prevTime = Date.now();

var devFrames = 0;
var devFrameTimer = 1000;
var devFPS = 0;
var devFPSDisplay = true;

var devEndGame = false;
var devGoal = 100;

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

function Init(s=0) {
    mouse = new Mouse();
    playerShip = new Ship();
    
    objects = [];
    lerpers = [];
    trails = [];
    
    score = s;

    offsetX = 0;
    offsetY = 0;

    for (let i = 0; i < 3000; i++) {
        let x = Math.random() * canvas.width*20 - canvas.width*10;
        let y = Math.random() * canvas.height*20 - canvas.height*10;
        
        // Don't spawn asteroids on the player
        while (Math.abs(x - canvas.width/2) < 100) { x += 20*Math.random(); }
        while (Math.abs(y - canvas.height/2) < 100) { y += 20*Math.random(); }

        objects.push(new Asteroid(x, y, 50*Math.random() + 10));
}
}

function Distance(x, y, xx, yy) {
    return Math.pow(Math.pow(x - xx, 2) + Math.pow(y - yy, 2), 1/2);
}

function Tick(dT) {
    playerShip.Tick(dT);

    for (let i = 0; i < objects.length; i++) {
        objects[i].Tick(dT);

        if (!objects[i].active) {
            if (!deadObjs.includes(i)) {
                deadObjs.push(i);
            }
        }
    }

    for (let i = 0; i < lerpers.length; i++) {
        lerpers[i].Tick(dT);
    }

    for (let i = 0; i < trails.length; i++) {
        trails[i].Tick(dT);
    }

    // Garbage collection
    if (deadObjs.length > 0) {
        objects.splice(deadObjs[0], 1);
        deadObjs.splice(0, 1);
    }
    for (let i = 0; i < lerpers.length; i++) {
        if (!lerpers[i].active) {
            lerpers.splice(i, 1);
            break;
        }
    }
    for (let i = 0; i < lurkers.length; i++) {
        if (!lurkers[i].active) {
            lurkers.splice(i, 1);
            break;
        }
    }
    for (let i = 0; i < trails.length; i++) {
        if (!trails[i].active) {
            trails.splice(i, 1);
            break;
        }
    }

    // TODO: other stuff
    if (!devEndGame) {
        if (score > devGoal) {
            devEndGame = true;
            playerShip.EnterGodMode();
        }
    }
}

function Collision() {
    let hit = false;
    let hitIdx = -1;
    for (let i = 0; i < objects.length; i++) {
        hit = objects[i].Collision(playerShip.x, playerShip.y);

        if (hit) {
            hitIdx = i;
            break;
        }
    }

    if (hit) {
        playerShip.Impact(objects[hitIdx]);
    }
}

function DrawStage() {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, canvas.width, canvas.height);

    playerShip.Draw(context);

    for (let i = 0; i < objects.length; i++) {
        objects[i].Draw(context);
    }

    for (let i = 0; i < trails.length; i++) {
        trails[i].Draw(context);
    }
}

function DrawUI() {
    let fsize = 30;
    context.font = "" + fsize + "px Verdana";
    context.fillStyle = "#aaaacc";
    let txt = "" + score + "/" + devGoal;
    let wid = context.measureText(txt).width + 5;
    context.fillText(txt, WIDTH - wid, fsize);
}

function Update() {
    let now = Date.now();
    let dT = now - prevTime;

    Tick(dT);

    Collision();

    DrawStage();
    
    DrawUI();

    prevTime = now;
    
    // DEBUG
    if (devFPSDisplay) {
        devFrameTimer -= dT;
        devFrames++;

        if (devFrameTimer <= 0) {
            devFPS = devFrames;
            devFrameTimer = 1000;
            devFrames = 0;
        }

        context.fillStyle = "#222240";
        context.fillRect(0, HEIGHT - 21, 21, 21);
        context.font = "14px Verdana";
        context.fillStyle = "#aaddaa";
        if (devFPS < 10) {
            context.fillText("0" + devFPS, 0, HEIGHT - 7);
        } else {
            context.fillText("" + devFPS, 0, HEIGHT - 7);
        }
    }
}

setInterval(Update, 1000/FPS);

document.addEventListener("keydown", function (evt) {
    keys[evt.keyCode] = true;
}, false);

document.addEventListener("keyup", function (evt) {
    keys[evt.keyCode] = false;
}, false);

canvas.addEventListener("mousemove", function (evt) {
    mouse.x = evt.x;
    mouse.y = evt.y;
}, false);

canvas.addEventListener("mousedown", function (evt) {
    mouse.down = true;
}, false);

canvas.addEventListener("mouseup", function (evt) {
    mouse.down = false;
}, false);
