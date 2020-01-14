//
// Sky Hoffert
// Fun, Two-Dimensional Platformer
//

var width = WIDTH;
var height = HEIGHT;
var fps = FPS;
var hasFocus = false;

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

// Canvas will always be 4:3 aspect, with 800x600 resolution.
canvas.width = width;
canvas.height = height;
ctx.lineWidth = 2;

// These lines scale the canvas so that it always fits in the current window.
var taller = window.innerWidth < window.innerHeight * 4/3;
if (!taller) {
    canvas.style.width = ""+window.innerHeight*0.99*4/3+"px";
    canvas.style.height = ""+window.innerHeight*0.99+"px";
} else {
    canvas.style.width = ""+window.innerWidth*0.99+"px";
    canvas.style.height = ""+window.innerWidth*0.99*3/4+"px";
}
var rect = canvas.getBoundingClientRect(), // abs. size of element
    scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for X
    scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y

console.log("(w="+canvas.style.width+",h="+canvas.style.height+")");

// World stuff.
var level = LEVEL_0;
var terrain = level.terrain;

var background = level.background;

var coins = level.coins;
var coinsHit = [];

var enemies = level.enemies;

var player = level.player;

var camera = new Camera(level.camera.x,level.camera.y,width,height,level.camera.z);
camera.bounds.left = level.camera.lb;
camera.bounds.right = level.camera.rb;
camera.target = null;

// Interacting with the canvas.
var cursor = {x:width/2,y:height/2};

document.addEventListener("keydown", function (evt) {
    player.keyUpdates.push({key:evt.key,down:true});

    // DEBUG
    if (evt.key === "l") {
        camera.Zoom(1, true);
        // Make lines thicker as camera zooms in.
        ctx.lineWidth = (1/camera.zoom)*2;
    }
}, false);

document.addEventListener("keyup", function (evt) {
    player.keyUpdates.push({key:evt.key,down:false});
}, false);

canvas.addEventListener("mousemove", function (evt) {
    let mpos = GetMousePos(canvas,evt);
    cursor.x = mpos.x; cursor.y = mpos.y;
}, false);

canvas.addEventListener("mousedown", function (evt) {
    /* DEBUG *
    let d = MeasureDistance(player.x, player.y, -pi/2, 1000, terrain);
    console.log(d);
    /* */
}, false);

canvas.addEventListener("wheel", function (evt) {
    let amt = 1 + (1/evt.deltaY)/10;
    camera.Zoom(amt);
    
    // Make lines thicker as camera zooms in.
    ctx.lineWidth = (1/camera.zoom)*2;
}, false);

function GetMousePos(canvas, evt) {
    return {
        x: (evt.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
        y: (evt.clientY - rect.top) * scaleY     // been adjusted to be relative to element
    };
}

// Engine stuff.
function Tick(dT) {
    if (!hasFocus) { return; }

    player.Tick(dT);

    player.Collision(terrain);

    for (let i = 0; i < coins.length; i++) {
        coins[i].Tick(dT);
        let coll = coins[i].Collision(player);
        if (coll) { coinsHit.push(i); }
    }
    if (coinsHit.length > 0) {
        player.CollectCoins(coins[coinsHit[0]].value);
        coins.splice(coinsHit[0],1);
        coinsHit.splice(0,1);
    }

    for (let i = 0; i < enemies.length; i++) {
        enemies[i].Collision(terrain, player);
        enemies[i].Tick(dT);
    }

    if (elapsed < 1) {
        camera.zoom = level.camera.z + (1 - level.camera.z)*elapsed;
        camera.y += 0.20 * dT;
    } else if (!debugSetup) {
        debugSetup = true;
        camera.target = player;
    }

    camera.Tick(dT);
}

function Draw() {
    if (!hasFocus) { return; }

    // Background.
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < background.length; i++) {
        background[i].Draw(ctx,camera);
    }

    // Game stuff.
    for (let i = 0; i < terrain.length; i++) {
        terrain[i].Draw(ctx,camera);
    }

    for (let i = 0; i < enemies.length; i++) {
        enemies[i].Draw(ctx,camera);
    }

    for (let i = 0; i < coins.length; i++) {
        coins[i].Draw(ctx,camera);
    }

    player.Draw(ctx,camera);
}

function Debug() {
    if (time > 10000) {
        console.log("DEBUG (fps="+Math.round(frames*1000/time)+")");
        time = 0;
        frames = 0;
    }

    /* DEBUG *
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.moveTo(WIDTH/2, 0);
    ctx.lineTo(WIDTH/2, HEIGHT);
    ctx.stroke();
    /* */
}

var elapsed = 0;
var prevTime = Date.now();
var frames = 0;
var time = 0;

var debugSetup = false;

function Update() {
    let now = Date.now();
    let dT = now - prevTime;
    prevTime = now;

    if (dT > 1000/fps) {
        dT = 1000/fps;
    }

    elapsed += dT/1000;

    let focused = document.hasFocus();
    if (focused && !hasFocus) {
        console.log("Regained focus.");
        player.ResetKeys();
    }
    hasFocus = focused;

    Tick(dT);

    Draw();

    frames++;
    time += dT;

    Debug();
}

setInterval(Update, 1000/fps);
