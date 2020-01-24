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
var taller = window.innerWidth < (window.innerHeight-100) * 4/3;
if (!taller) {
    canvas.style.width = ""+(window.innerHeight-100)*0.99*4/3+"px";
    canvas.style.height = ""+(window.innerHeight-100)*0.99+"px";
} else {
    canvas.style.width = ""+window.innerWidth*0.99+"px";
    canvas.style.height = ""+window.innerWidth*0.99*3/4+"px";
}

var rect = canvas.getBoundingClientRect(), // abs. size of element
    scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for X
    scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y

console.log("(w="+canvas.style.width+",h="+canvas.style.height+")");

// World stuff.
var level = null;
var cursor = {x:0,y:0};
var terrain = [];
var background = [];
var enemies = [];
var coins = [];
var coinsHit = [];
var particles = [];
var messages = [];// Message queue for players.
var player = null;
var levelEnd = null;
var camera = null;
var lurkers = [];

Init();
LoadLevel(LEVEL_0);

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

function Init() {
    cursor = {x:0,y:0};
    terrain = [];
    background = [];
    enemies = [];
    coins = [];
    coinsHit = [];
    particles = [];
    messages = [];// Message queue for players.
    player = null;
    levelEnd = null;
    camera = null;
    lurkers = [];
}

function LoadLevel(l) {
    level = l;
    for (let i = 0; i < level.terrain.length; i++) {
        let t = level.terrain[i];
        if (t[0] === "r") { // Rectangle
            terrain.push(new Rectangle(t[1], t[2], t[3], t[4], t[5]));
        } else if (t[0] === "rr") { // RotatedRectangle
            terrain.push(new RotatedRectangle(t[1], t[2], t[3], t[4], t[5]));
        } else if (t[0] === "bb") { // Block Blade
            terrain.push(new BlockBlade(t[1],t[2],t[3],t[4],t[5],t[6],t[7]));
        }
    }
    
    for (let i = 0; i < level.background.length; i++) {
        let b = level.background[i];
        if (b[0] === "bgr") { // BGRect
            background.push(new BGRect(b[1], b[2], b[3], b[4], b[5], b[6],b[7]));
        } else if (b[0] === "bgs") { // BGShape
            background.push(new BGShape(b[1], b[2], b[3], b[4], b[5],b[6]));
        }
    }
    
    for (let i = 0; i < level.coins.length; i++) {
        let c = level.coins[i];
        if (c[0] === "c") { // Coin
            coins.push(new Coin(c[1], c[2]));
        }
    }
    
    for (let i = 0; i < level.enemies.length; i++) {
        let e = level.enemies[i];
        if (e[0] === "se") { // Coin
            enemies.push(new Mulper(e[1], e[2], e[3], e[4]));
        }
    }
    
    player = new Player(level.player[0],level.player[1],level.player[2],level.player[3],
        level.player[4],messages);
    
    levelEnd = new LevelEnd(level.levelEnd.x, level.levelEnd.y, level.levelEnd.w, level.levelEnd.h);
    
    camera = new Camera(level.camera.x,level.camera.y,width,height,level.camera.z);
    camera.bounds.left = level.camera.lb;
    camera.bounds.right = level.camera.rb;
    camera.bounds.top = level.camera.tb;
    camera.bounds.bottom = level.camera.bb;
    camera.target = player;
    camera.Zoom(level.camera.z, true);
    
    // Interacting with the canvas.
    cursor = {x:width/2,y:height/2};
}

// Engine stuff.
function Tick(dT) {
    if (!hasFocus) { return; }

    player.Tick(dT);

    camera.Tick(dT);

    let deadParticle = -1;
    for (let i = 0; i < particles.length; i++) {
        particles[i].Collision(terrain);
        particles[i].Tick(dT);
        if (deadParticle === -1 && !particles[i].active) {
            deadParticle = i;
        }
    }
    if (deadParticle !== -1) {
        particles.splice(deadParticle,1);
    }

    // Read messages from players and process.
    if (messages.length > 0) {
        let msg = messages[0];
        if (msg.type === "playerHit") {
            if (!msg.dead) {
                camera.Shake(15,0.6);
                for (let i = 0; i < 50; i++) {
                    let a = Math.random() * pi/2 + pi/4;
                    let m = Math.random()/2;
                    let vx = Math.cos(a)*m;
                    let vy = -Math.sin(a)*m;
                    let s = Math.random()*2+1;
                    particles.push(new HitParticle(msg.x,msg.y,s,"#665555",vx,vy,1+Math.random(),true,true));
                }
            } else {
                Init();
                LoadLevel(level);
            }
        } else if (msg.type === "playerAddLurker") {
            lurkers.push(new Lurker(msg.cb,msg.d));
        }
        messages.splice(0,1);
    }

    // DEBUG: is this effect good?
    if (!player.active){ return; }

    for (let i = 0; i < terrain.length; i++) {
        terrain[i].Tick(dT);
    }

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

    let deadLurker = -1;
    for (let i = 0; i < lurkers.length; i++) {
        lurkers[i].Tick(dT);
        if (!lurkers[i].active) {
            deadLurker = i;
        }
    }
    if (deadLurker !== -1) {
        lurkers.splice(deadLurker,1);
    }

    // DEBUG
    levelEnd.Contains(player.x, player.y);
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

    for (let i = 0; i < particles.length; i++) {
        particles[i].Draw(ctx,camera);
    }

    for (let i = 0; i < lurkers.length; i++) {
        lurkers[i].Draw(ctx,camera);
    }
}

function Debug() {
    if (time > 10000) {
        console.log("DEBUG (fps="+Math.round(frames*1000/time)+")");
        time = 0;
        frames = 0;
    }

    /* DEBUG: vertical line *
    ctx.strokeStyle = "white";
    ctx.beginPath();
    ctx.moveTo(WIDTH/2, 0);
    ctx.lineTo(WIDTH/2, HEIGHT);
    ctx.stroke();
    /* */

    if (levelEnd.reached) {
        Init();
        LoadLevel(PLAYGROUND);
        /*
        let fsize = 60;
        ctx.font = ""+fsize+"px Verdana";
        let txt = "Level Complete!";
        let wid = ctx.measureText(txt).width;
        ctx.fillStyle = "#444444";
        ctx.fillRect(width/2-wid/2-10, 0, wid+20, fsize+20);
        ctx.fillStyle = "white"; 
        ctx.fillText(txt,width/2-wid/2,fsize);  
        */
    }
}

var debugZoomOut = false;

var elapsed = 0;
var prevTime = Date.now();
var frames = 0;
var time = 0;

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
