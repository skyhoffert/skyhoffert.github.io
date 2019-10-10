/*
Sky Hoffert
vspg javascript file.
Last Modified: September 18, 2019
*/

const FPS = 24;
const BGCOLOR = "#101010";
const PLAYER_COLOR = "#ff2222";
const PLAYER_STARTING_ACCEL = 0.001;
const START_WAIT_TIME = 2000;
const BOUND_COLOR = "#202020";

var keys = []; // Keeps track of player input.
for (let i = 0; i < 1000; i++){ keys.push(false) };

var canvas = document.getElementById("mainCanvas");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
var ctx = canvas.getContext("2d");

var lastTime = Date.now();

class V2 {
    constructor(x, y) {
        this.x = x; this.y = y;
    }
}

class V3 {
    constructor(x, y, z) {
        this.x = x; this.y = y; this.z = z;
    }
}

class PlayerDot {
    constructor() {
        this.pos = new V2(canvas.width/2, canvas.height/2);
        this.accel = new V2(0, PLAYER_STARTING_ACCEL);
        this.vel = new V2(0, 0);
        this.color = PLAYER_COLOR;
    }
    
    Damage(d) {
    }
    
    Tick(dT) {
        this.vel.x += this.accel.x * dT;
        this.vel.y += keys[32] ? -this.accel.y * dT : this.accel.y * dT;
        this.pos.x += this.vel.x * dT;
        this.pos.y += this.vel.y * dT;
    }
    
    Draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.pos.x - 2, this.pos.y - 2, 5, 5);
    }
}

class Bounds {
    constructor() {
        this.bounds = [];
        // bound has V3 values of x, top, bottom
        this.bounds.push(new V3(0, canvas.height/4, canvas.height*3/4));
        this.newBoundTime = 2000;
        this.localTime = this.newBoundTime;
        this.boundVel = new V2(-0.2, 0);
        this.boundScale = 20;
        this.yShiftScale = 50;
        this.yMin = 100;
        
        this.NewBound();
        this.NewBound();
    }
    
    NewBound() {
        let prevBound = new V3(this.bounds[this.bounds.length-1].x,
            this.bounds[this.bounds.length-1].y, this.bounds[this.bounds.length-1].z);
        let yShift = Math.floor(Math.random() * this.yShiftScale - this.yShiftScale/2);
        let localBS = this.boundScale;
        if (prevBound.z - prevBound.y < this.yMin) { 
            localBS = 0;
        }
        
        this.bounds.push(new V3(prevBound.x + canvas.width/2, 
            prevBound.y + Math.random() * localBS + yShift,
            prevBound.z - Math.random() * localBS + yShift));
    }
    
    Tick(dT) {
        this.localTime += dT;
        
        if (this.localTime > this.newBoundTime) {
            this.localTime = 0;
            this.NewBound();
        }
        
        for (let i = 0; i < this.bounds.length; i++) {
            this.bounds[i].x += this.boundVel.x * dT;
            this.bounds[i].y += this.boundVel.y * dT;
            this.bounds[i].z += this.boundVel.y * dT;
        }
    }
    
    Draw() {
        ctx.fillStyle = BOUND_COLOR;
        ctx.beginPath();
        ctx.moveTo(this.bounds[0].x, this.bounds[0].y);
        for (let i = 1; i < this.bounds.length; i++) {
            ctx.lineTo(this.bounds[i].x, this.bounds[i].y);
        }
        for (let i = this.bounds.length-1; i >= 0; i--) {
            ctx.lineTo(this.bounds[i].x, this.bounds[i].z);
        }
        ctx.closePath();
        ctx.fill();
    }
}

function DrawStage() {
    ctx.fillStyle = BGCOLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    bounds.Draw();
    
    playerDot.Draw();
}

function DrawUI() {
    
}

function Update() {
    let now = Date.now();
    let deltaTime = now - lastTime;
    lastTime = now;
    
    elapsed += deltaTime;
    
    // Game Stuff goes here
    if (elapsed > START_WAIT_TIME) {
        playerDot.Tick(deltaTime);
        bounds.Tick(deltaTime);
    }
    
    DrawStage();
    
    DrawUI();
}

document.addEventListener("keydown", function (evt) {
    keys[evt.keyCode] = true;
}, false);

document.addEventListener("keyup", function (evt) {
    keys[evt.keyCode] = false;
}, false);

document.addEventListener("touchstart", function (evt) {
    //evt.targetTouches[0].screenX
}, false);

document.addEventListener("touchend", function (evt) {
}, false);

// Create game variables
var playerDot = new PlayerDot();
var elapsed = 0;

var bounds = new Bounds();

// Finally, start the game
setInterval(Update, 1000/FPS);
