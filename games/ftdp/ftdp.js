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
var foreground = [];
var enemies = [];
var coins = [];
var particles = [];
var messages = [];// Message queue for players.
var player = null;
var levelEnd = null;
var camera = null;
var lurkers = [];

Init();
LoadLevel("level0");

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
    foreground = [];
    enemies = [];
    coins = [];
    particles = [];
    messages = [];// Message queue for players.
    player = null;
    levelEnd = null;
    camera = null;
    lurkers = [];
}

function LoadLevel(l) {
    level = LEVELS[l];
    for (let i = 0; i < level.terrain.length; i++) {
        let t = level.terrain[i];
        if (t[0] === "r") { // Rectangle
            terrain.push(new Rectangle(t[1],t[2],t[3],t[4],t[5]));
        } else if (t[0] === "rr") { // RotatedRectangle
            terrain.push(new RotatedRectangle(t[1],t[2],t[3],t[4],t[5],t[6]));
        } else if (t[0] === "bb") { // Block Blade
            terrain.push(new BlockBlade(t[1],t[2],t[3],t[4],t[5],t[6],t[7]));
        } else if (t[0] === "kd") { // Key Door
            terrain.push(new KeyDoor(t[1],t[2],t[3],t[4],t[5]));
        } else if (t[0] === "otb") { // One-Touch Block
            terrain.push(new OneTouchBlock(t[1],t[2],t[3],t[4],t[5],t[6]));
        } else if (t[0] === "bgr") {
            terrain.push(new Rectangle(t[1],t[2],t[3],t[4],t[5]));
            terrain[terrain.length-1].hasCollision = false;
            terrain[terrain.length-1].color = "#043003";
        }
    }
    
    for (let i = 0; i < level.background.length; i++) {
        let b = level.background[i];
        if (b[0] === "bgr") { // BGRect
            background.push(new BGRect(b[1],b[2],b[3],b[4],b[5],b[6],b[7]));
        } else if (b[0] === "bgs") { // BGShape
            background.push(new BGShape(b[1],b[2],b[3],b[4],b[5],b[6]));
        }
    }

    for (let i = 0; i < level.foreground.length; i++) {
        let f = level.foreground[i];
        if (f[0] === "p") {
            foreground.push(new Plant(f[1],f[2],f[3],f[4],f[5]));
        }
    }
    
    for (let i = 0; i < level.coins.length; i++) {
        let c = level.coins[i];
        if (c[0] === "c") { // Coin
            coins.push(new Coin(c[1],c[2]));
        } else if (c[0] === "rc") {
            coins.push(new RechargeCoin(c[1],c[2]));
        }
    }
    
    for (let i = 0; i < level.enemies.length; i++) {
        let e = level.enemies[i];
        if (e[0] === "m") { // Coin
            enemies.push(new Mulper(e[1],e[2],e[3],e[4],messages));
        } else if (e[0] === "j") {
            enemies.push(new Julper(e[1],e[2],e[3],e[4],messages));
        } else if (e[0] === "s") {
            enemies.push(new Sulper(e[1],e[2],e[3],messages));
        }
    }
    
    player = new Player(level.player[0],level.player[1],level.player[2],level.player[3],
        level.player[4],messages);
    player.offworld = level.player[5];
    
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

    for (let i = particles.length-1; i >= 0; i--) {
        particles[i].Collision(terrain);
        particles[i].Tick(dT);
        if (!particles[i].active) {
            particles.splice(i,1);
        }
    }

    // Read messages from players and process.
    for (let i = messages.length-1; i >= 0; i--) {
        let msg = messages[i];
        if (msg.type === "playerHit") {
            camera.Shake(15,0.6);
            for (let i = 0; i < 50; i++) {
                let a = Math.random() * pi/2 + pi/4;
                let m = Math.random()/2;
                let vx = Math.cos(a)*m;
                let vy = -Math.sin(a)*m;
                let s = Math.random()*2+1;
                particles.push(new HitParticle(msg.x,msg.y,s,"#665555",vx,vy,1+Math.random(),true,true));
            }
            if (msg.dead) {
                lurkers.push(new Lurker(function (dT,v) {
                    if (!v.good) {
                        v.good = true;
                        v.elapsed = 0;
                    } else {
                        v.elapsed += dT;
                    }

                    if (v.elapsed > 1000) {
                        messages.push({type:"reload"});
                        return false;
                    }

                    return true;
                }));
            }
        } else if (msg.type === "playerAddLurker") {
            lurkers.push(new Lurker(msg.cb,msg.d));
        } else if (msg.type === "reload") {
            Init();
            LoadLevel(level.name);
        } else if (msg.type === "enemyParticle") {
            for (let i = 0; i < msg.n; i++) {
                let s = Math.random()*2+0.6;
                particles.push(new HitParticle(msg.x+(Math.random()-0.5)*msg.xvar,
                    msg.y+(Math.random()-0.5)*msg.yvar,s,"red",0,0,1+Math.random(),
                    false,false,false));
            }
        }
        messages.splice(i,1);
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

    for (let i = 0; i < foreground.length; i++) {
        foreground[i].Tick(dT);
    }

    // DEBUG: is this effect good?
    if (!player.active){ return; }

    for (let i = 0; i < terrain.length; i++) {
        terrain[i].Tick(dT);
    }

    player.Collision(terrain);

    for (let i = coins.length-1; i >= 0; i--) {
        coins[i].Tick(dT);
        if (coins[i].Collision(player)) {
            player.CollectCoins(coins[i].type);
            coins.splice(i,1);
        }
    }

    for (let i = 0; i < enemies.length; i++) {
        enemies[i].Collision(terrain, player);
        enemies[i].Tick(dT);
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

    // DEBUG
    levelEnd.Draw(ctx,camera);

    for (let i = 0; i < foreground.length; i++) {
        foreground[i].Draw(ctx,camera);
    }
}

function Debug() {
    if (time > 10000) {
        console.log("DEBUG (fps="+Math.round(frames*1000/time)+")");
        time = 0;
        frames = 0;
    }

    if (levelEnd.reached) {
        Init();
        LoadLevel(level.nextLevel);
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
