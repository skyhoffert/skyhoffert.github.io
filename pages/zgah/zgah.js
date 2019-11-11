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

var asteroids = [];
var deadObjs = [];
var lerpers = [];
var lurkers = [];
var trails = [];
var materials = [];

var stars = [];

var score = 0;
var prevTime = Date.now();

var devFrames = 0;
var devFrameTimer = 1000;
var devFPS = 0;
var devFPSDisplay = true;

var devBuildDisplay = true;
var devBuild = " DEVELEOPMENT Build 0.1 ";

var devGodModeDisplay = true;

var devEndGame = false;
var devGoal = 100 * 2; // TODO: remove adjustment

var offsetX = 0;
var offsetY = 0;

Init();

function Init(s=0) {
    mouse = new Mouse();
    playerShip = new Ship();
    
    asteroids = [];
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

        asteroids.push(new Asteroid(x, y, 50*Math.random() + 10));
    }

    for (let i = 0; i < 2000; i++) {
        let x = Math.random() * canvas.width*10 - canvas.width*5;
        let y = Math.random() * canvas.height*10 - canvas.height*5;
        
        // Don't spawn asteroids on the player

        stars.push(new Star(x, y));
    }
}

function Distance(x, y, xx, yy) {
    return Math.pow(Math.pow(x - xx, 2) + Math.pow(y - yy, 2), 1/2);
}

// Returns a tuple of colors for a given type.
// @param t (int): type
// @return tuple (string): colors for this type. Usually, it goes like this format:
//      [main color, explosion color]
function ColorsForType(t) {
    if (t === 0) {
        return ["#6666bb", "#333388"];
    } else if (t === 1) {
        return ["#bb6666", "#883333"];
    } else if (t === 2) {
        return ["#66bb66", "#338833"];
    } else if (t === 3) {
        return ["#fff27b", "#a69c4f"];
    } else if (t === 4) {
        return ["#32d6d3", "#28a6a2"];
    }

    return ["white", "white"];
}

function Tick(dT) {
    playerShip.Tick(dT);

    for (let i = 0; i < asteroids.length; i++) {
        asteroids[i].Tick(dT);

        if (!asteroids[i].active) {
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

    for (let i = 0; i < materials.length; i++) {
        materials[i].Tick(dT);
    }

    // Garbage collection
    if (deadObjs.length > 0) {
        asteroids.splice(deadObjs[0], 1);
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
    for (let i = 0; i < materials.length; i++) {
        if (!materials[i].active) {
            materials.splice(i, 1);
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
    
    // TODO: remove Super Secret God Mode!
    if (keys[219] && keys[221]) {
        if (playerShip.scanFactor < 0.9) {
            playerShip.EnterGodMode();
        }
    }
}

function Collision() {
    let hit = false;
    let hitIdx = -1;
    for (let i = 0; i < asteroids.length; i++) {
        hit = asteroids[i].Collision(playerShip.x, playerShip.y);

        if (hit) {
            hitIdx = i;
            break;
        }
    }

    if (hit) {
        playerShip.Impact(asteroids[hitIdx]);
    }
}

function DrawStage() {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < stars.length; i++) {
        stars[i].Draw(context);
    }

    playerShip.Draw(context);

    for (let i = 0; i < asteroids.length; i++) {
        asteroids[i].Draw(context);
    }

    for (let i = 0; i < trails.length; i++) {
        trails[i].Draw(context);
    }

    for (let i = 0; i < materials.length; i++) {
        materials[i].Draw(context);
    }
}

function DrawUI() {
    let fsize = 30;
    let pad = 5;
    
    context.font = "" + fsize + "px Verdana";
    let txt = "Materials: " + score + "/" + devGoal;
    let wid = context.measureText(txt).width + pad;

    context.fillStyle = "#827eeb";
    context.beginPath();
    context.moveTo(WIDTH, 0);
    context.lineTo(WIDTH, fsize+pad+4)
    context.lineTo(WIDTH - (wid+pad*2+4), fsize+pad+4);
    context.lineTo(WIDTH - (wid+pad*2+20+4), 0);
    context.closePath();
    context.fill();

    context.fillStyle = "#6d69d6";
    context.beginPath();
    context.moveTo(WIDTH, 0);
    context.lineTo(WIDTH, fsize+pad)
    context.lineTo(WIDTH - (wid+pad*2), fsize+pad);
    context.lineTo(WIDTH - (wid+pad*2+20), 0);
    context.closePath();
    context.fill();

    context.fillStyle = "#dddddd";
    context.fillText(txt, WIDTH - wid, fsize);

    if (devFPSDisplay) {
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

    if (devBuildDisplay) {
        context.font = "11px Verdana";
        wid = context.measureText(devBuild).width;

        context.fillStyle = "#222240";
        context.fillRect(WIDTH - wid, HEIGHT - 18, wid, 18);
        context.fillStyle = "#aaddaa";
        context.fillText(devBuild, WIDTH - wid, HEIGHT - 6);
    }

    if (devGodModeDisplay) {
        if (playerShip.scanFactor > 0.9) {
            context.font = "12px Verdana";
            context.fillStyle = "#aaddaa";
            context.fillText("God Mod Enabled", 0, 10);
        }
    }
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
