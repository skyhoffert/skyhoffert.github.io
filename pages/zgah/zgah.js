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
var playerShip = null;

var asteroids = [];
var deadObjs = [];
var lerpers = [];
var lurkers = [];
var trails = [];
var materials = [];

var uiButtons = [];

var stars = [];

var score = 0;
var prevTime = Date.now();

var devFrames = 0;
var devFrameTimer = 1000;
var devFPS = 0;
var devFPSDisplay = true;

var devBuildDisplay = true;
var devBuild = " v0.2 ";

var devGodModeDisplay = true;

var devEndGame = false;
var devGoal = 250;

var offsetX = 0;
var offsetY = 0;

var levelName = "tutorial";

Init(0);

function Init(s=0, m="tutorial", t=0) {
    levelName = m;

    if (m === "randomField") {
        mouse = new Mouse();
        playerShip = new Ship(t);
        
        asteroids = [];
        deadObjs = [];
        lerpers = [];
        lurkers = [];
        trails = [];
        materials = [];

        uiButtons = [];
        
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
    } else if (m === "tutorial") {
        mouse = new Mouse();
        playerShip = new Ship(-1);

        asteroids = [];
        deadObjs = [];
        lerpers = [];
        lurkers = [];
        trails = [];
        materials = [];

        uiButtons = [];
        
        score = s;

        offsetX = 0;
        offsetY = 0;

        asteroids.push(new Asteroid(WIDTH/2 - 100, HEIGHT/2 - 100, 30, 4));
        asteroids.push(new Asteroid(WIDTH/2 - 150, HEIGHT/2 - 150, 20, 1));
        asteroids.push(new Asteroid(WIDTH/2 - 150, HEIGHT/2 - 90, 10, 0));

        for (let i = 0; i < 100; i++) {
            let x = Math.random() * canvas.width*4 - canvas.width*2;
            let y = Math.random() * canvas.height*4 - canvas.height*2;

            stars.push(new Star(x, y));
        }

        // This lurker performs some key background functions of the tutorial level. It makes sure
        // that the player does not fly off screen, sets all asteroid velocities to 0 -
        // periodically, etc.
        lurkers.push(new Lurker(function (dT) {
            this.elapsed += dT;

            if (Math.abs(offsetX) > WIDTH*5/8) {
                offsetX = -offsetX;
            } else if (Math.abs(offsetY) > HEIGHT*3/4) {
                offsetY = -offsetY;
            }

            if (this.elapsed > 100) {
                this.elapsed = 0;
                for (let i = 0; i < asteroids.length; i++) {
                    asteroids[i].velX = 0;
                    asteroids[i].velY = 0;
                }
            }

            return (levelName === "tutorial");
        }));

        // TODO: add periodic addition of abilities for the player.
        
        // This lurker defines the end of the tutorial... this occurs when all asteroids have been
        // eliminated. Note that it creates a lerper.
        lurkers.push(new Lurker(function (dT) {
            if (asteroids.length === 0) {
                lerpers.push(new Lerper(2000, function (dT, done) {
                    if (done) {
                        Init(0, "shipSelect");
                    }
                }));

                return false;
            }

            return true;
        }));
    } else if (m === "shipSelect") {
        // Remove stuff
        asteroids = [];
        deadObjs = [];
        lerpers = [];
        lurkers = [];
        trails = [];
        materials = [];

        uiButtons = [];
        
        // Get some buttons on the screen.
        uiButtons.push(new UIButton(WIDTH/4 - 20, HEIGHT/2, WIDTH/4 - 20, HEIGHT*3/4, 0, function (ctx) {
            ctx.strokeStyle = "#c72422";
            ctx.lineWidth = 4;

            let q = Math.PI*11/16;

            let s = 100;
            s *= this.hover ? 1.05 : 1;
            let a = Math.PI/4

            ctx.beginPath();
            ctx.moveTo(this.x + s*Math.cos(a), this.y - s*Math.sin(a));
            ctx.lineTo(this.x + s*3/4*Math.cos(a + q), this.y - s*3/4*Math.sin(a + q));
            ctx.lineTo(this.x + s*1/6*Math.cos(a + Math.PI), this.y - s*1/6*Math.sin(a + Math.PI));
            ctx.lineTo(this.x + s*3/4*Math.cos(a - q), this.y - s*3/4*Math.sin(a - q));
            ctx.closePath();
            ctx.stroke();

            ctx.lineWidth = 2;
            
            let fsize = 24;
            fsize *= this.hover ? 1.05 : 1
            ctx.font = "" + fsize + "px Verdana";
            ctx.fillStyle = "white";

            let txt = "Standard";
            let wid = ctx.measureText(txt).width;
            ctx.fillText(txt, this.x - wid/2, this.y - this.h/4, this.w);
            
            fsize = 18;
            fsize *= this.hover ? 1.05 : 1;
            ctx.font = "" + fsize + "px Verdana";
            
            txt = " - average speed";
            wid = ctx.measureText(txt).width;
            ctx.fillText(txt, this.x - wid/2, this.y + this.h/4, this.w);
            
            txt = " - average mining";
            wid = ctx.measureText(txt).width;
            ctx.fillText(txt, this.x - wid/2, this.y + this.h/4 + fsize*2, this.w);

            txt = " - average scanning";
            wid = ctx.measureText(txt).width;
            ctx.fillText(txt, this.x - wid/2, this.y + this.h/4 + fsize*4, this.w);
        }));
        uiButtons.push(new UIButton(WIDTH/2, HEIGHT/2, WIDTH/4 - 20, HEIGHT*3/4, 1, function (ctx) {
            ctx.strokeStyle = "#923acc";
            ctx.lineWidth = 4;

            let qf = Math.PI*3/16;
            let ff = 3/4;
            let qr = Math.PI*11/16
            let fr = 7/8;
            let fe = 1/8;

            let s = 100;
            s *= this.hover ? 1.05 : 1;
            let a = Math.PI/2;

            ctx.beginPath();
            ctx.moveTo(this.x + s*Math.cos(a), this.y - s*Math.sin(a));
            ctx.lineTo(this.x + s*ff*Math.cos(a + qf), this.y - s*ff*Math.sin(a + qf));
            ctx.lineTo(this.x + s*fr*Math.cos(a + qr), this.y - s*fr*Math.sin(a + qr));
            ctx.lineTo(this.x + s*fe*Math.cos(a + Math.PI), this.y - s*fe*Math.sin(a + Math.PI));
            ctx.lineTo(this.x + s*fr*Math.cos(a - qr), this.y - s*fr*Math.sin(a - qr));
            ctx.lineTo(this.x + s*ff*Math.cos(a - qf), this.y - s*ff*Math.sin(a - qf));
            ctx.closePath();
            ctx.stroke();
            
            ctx.lineWidth = 2;
            
            let fsize = 24;
            fsize *= this.hover ? 1.05 : 1;
            ctx.font = "" + fsize + "px Verdana";
            ctx.fillStyle = "white";

            let txt = "Miner";
            let wid = ctx.measureText(txt).width;
            ctx.fillText(txt, this.x - wid/2, this.y - this.h/4, this.w);
            
            fsize = 18;
            fsize *= this.hover ? 1.05 : 1;
            ctx.font = "" + fsize + "px Verdana";
            
            txt = " - slow speed";
            wid = ctx.measureText(txt).width;
            ctx.fillText(txt, this.x - wid/2, this.y + this.h/4, this.w);
            
            txt = " - good mining";
            wid = ctx.measureText(txt).width;
            ctx.fillText(txt, this.x - wid/2, this.y + this.h/4 + fsize*2, this.w);

            txt = " - poor scanning";
            wid = ctx.measureText(txt).width;
            ctx.fillText(txt, this.x - wid/2, this.y + this.h/4 + fsize*4, this.w);
        }));
        uiButtons.push(new UIButton(WIDTH*3/4 + 20, HEIGHT/2, WIDTH/4 - 20, HEIGHT*3/4, 2, function (ctx) {
            ctx.strokeStyle = "#cf5e2a";
            ctx.lineWidth = 4;

            let qf = Math.PI*3/8;
            let ff = 1/2;
            let qf2 = Math.PI*1/4;
            let ff2 = 3/4;
            let qs = Math.PI*1/2;
            let fs = 3/4;
            let qr = Math.PI*11/16
            let fr = 7/8;
            let qb = Math.PI*11/16;
            let fb = 3/8;
            let fe = 5/8;

            let s = 100;
            s *= this.hover ? 1.05 : 1;
            let a = Math.PI*3/4;

            ctx.beginPath();
            ctx.moveTo(this.x + s*Math.cos(a), this.y - s*Math.sin(a));
            ctx.lineTo(this.x + s*ff*Math.cos(a + qf), this.y - s*ff*Math.sin(a + qf));
            ctx.lineTo(this.x + s*ff2*Math.cos(a + qf2), this.y - s*ff2*Math.sin(a + qf2));
            ctx.lineTo(this.x + s*fs*Math.cos(a + qs), this.y - s*fs*Math.sin(a + qs));
            ctx.lineTo(this.x + s*fr*Math.cos(a + qr), this.y - s*fr*Math.sin(a + qr));
            ctx.lineTo(this.x + s*fb*Math.cos(a + qb), this.y - s*fb*Math.sin(a + qb));
            ctx.lineTo(this.x + s*fe*Math.cos(a + Math.PI), this.y - s*fe*Math.sin(a + Math.PI));
            ctx.lineTo(this.x + s*fb*Math.cos(a - qb), this.y - s*fb*Math.sin(a - qb));
            ctx.lineTo(this.x + s*fr*Math.cos(a - qr), this.y - s*fr*Math.sin(a - qr));
            ctx.lineTo(this.x + s*fs*Math.cos(a - qs), this.y - s*fs*Math.sin(a - qs));
            ctx.lineTo(this.x + s*ff2*Math.cos(a - qf2), this.y - s*ff2*Math.sin(a - qf2));
            ctx.lineTo(this.x + s*ff*Math.cos(a - qf), this.y - s*ff*Math.sin(a - qf));
            ctx.closePath();
            ctx.stroke();
            
            ctx.lineWidth = 2;

            let fsize = 24;
            fsize *= this.hover ? 1.05 : 1;
            ctx.font = "" + fsize + "px Verdana";
            ctx.fillStyle = "white";

            let txt = "Scout";
            let wid = ctx.measureText(txt).width;
            ctx.fillText(txt, this.x - wid/2, this.y - this.h/4, this.w);
            
            fsize = 18;
            fsize *= this.hover ? 1.05 : 1;
            ctx.font = "" + fsize + "px Verdana";
            
            txt = " - fast speed";
            wid = ctx.measureText(txt).width;
            ctx.fillText(txt, this.x - wid/2, this.y + this.h/4, this.w);
            
            txt = " - good scanning";
            wid = ctx.measureText(txt).width;
            ctx.fillText(txt, this.x - wid/2, this.y + this.h/4 + fsize*2, this.w);

            txt = " - poor mining";
            wid = ctx.measureText(txt).width;
            ctx.fillText(txt, this.x - wid/2, this.y + this.h/4 + fsize*4, this.w);
        }));
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
    if (playerShip) {
        playerShip.Tick(dT);
    }

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

    for (let i = 0; i < lurkers.length; i++) {
        lurkers[i].Tick(dT);
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

    // TODO: other dev stuff
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

    if (playerShip) {
        playerShip.Draw(context);
    }

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
    if (levelName === "randomField") {
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
    }

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
        if (playerShip && playerShip.scanFactor > 0.9) {
            context.font = "12px Verdana";
            context.fillStyle = "#aaddaa";
            context.fillText("God Mod Enabled", 0, 10);
        }
    }

    for (let i = 0; i < uiButtons.length; i++) {
        uiButtons[i].Draw(context);
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

    for (let i = 0; i < uiButtons.length; i++) {
        uiButtons[i].Hover(mouse.x, mouse.y);
    }
}, false);

canvas.addEventListener("mousedown", function (evt) {
    mouse.down = true;
}, false);

canvas.addEventListener("mouseup", function (evt) {
    mouse.down = false;
    
    for (let i = 0; i < uiButtons.length; i++) {
        uiButtons[i].Click(mouse.x, mouse.y);
    }
}, false);
