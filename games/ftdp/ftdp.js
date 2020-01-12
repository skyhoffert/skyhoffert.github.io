//
// Sky Hoffert
// Fun, Two-Dimensional Platformer
//

var width = 800;
var height = 600;
var FPS = 40;
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

var coins = level.coins;
var coinsHit = [];

var player = level.player;

var camera = new Camera(level.camera.x,level.camera.y,width,height);
camera.target = player;

// Interacting with the canvas.
var cursor = {x:width/2,y:height/2};

document.addEventListener("keydown", function (evt) {
    player.keyUpdates.push({key:evt.key,down:true});
}, false);

document.addEventListener("keyup", function (evt) {
    player.keyUpdates.push({key:evt.key,down:false});
}, false);

canvas.addEventListener("mousemove", function (evt) {
    let mpos = GetMousePos(canvas,evt);
    cursor.x = mpos.x; cursor.y = mpos.y;
}, false);

function  GetMousePos(canvas, evt) {
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

    camera.Tick(dT);
}

function Draw() {
    if (!hasFocus) { return; }

    // Background.
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    // Game stuff.
    for (let i = 0; i < terrain.length; i++) {
        terrain[i].Draw(ctx,camera);
    }

    for (let i = 0; i < coins.length; i++) {
        coins[i].Draw(ctx,camera);
    }

    player.Draw(ctx,camera);

    // Cursor, since we removed it in the html.
    ctx.strokeStyle = "red";
    ctx.beginPath();
    ctx.moveTo(cursor.x - 4, cursor.y);
    ctx.lineTo(cursor.x + 4, cursor.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cursor.x, cursor.y - 4);
    ctx.lineTo(cursor.x, cursor.y + 4);
    ctx.stroke();
}

function Debug() {
    //console.log(""+(camera.x + camera.width/2));
}

var prevTime = Date.now();

function Update() {
    let now = Date.now();
    let dT = now - prevTime;
    prevTime = now;

    if (dT > 1000/FPS) {
        dT = 1000/FPS;
    }

    let focused = document.hasFocus();
    if (focused && !hasFocus) {
        console.log("Regained focus.");
        player.ResetKeys();
    }
    hasFocus = focused;

    Tick(dT);

    Draw();

    Debug();
}

setInterval(Update, 1000/FPS);
