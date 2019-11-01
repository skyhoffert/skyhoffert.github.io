/*
Sky Hoffert
jgl javascript file.
Last Modified: November 1, 2019
*/

const FPS = 60;
const COLORS = ["purple", "indigo", "blue", "green", "yellow", "orange", "red"];

var canvas = document.getElementById("mainCanvas");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
var ctx = canvas.getContext("2d");

class V2{ constructor(x, y){ this.x = x; this.y = y; } }

class Ball {
    constructor(p, c) {
        this.pos = new V2(p.x, p.y);
        this.vel = new V2(0, 0);
        this.acc = new V2(0, 0.001);
        this.rad = 40;
        this.color = c;

        this.maxVel = 1;
    }

    Collision(p) {
        let d = Math.sqrt(Math.pow(this.pos.x - p.x, 2) + Math.pow(this.pos.y - p.y, 2));
        let c = d < this.rad*2;
        
        if (c) {
            this.vel.y = -this.vel.y;
        }

        return c;
    }

    CutoffVel() {
        if (this.vel.x > this.maxVel) {
            this.vel.x = this.maxVel;
        }
        if (this.vel.y > this.maxVel) {
            this.vel.y = this.maxVel;
        }
    }

    Tick(dT) {
        this.vel.x += this.acc.x * dT;
        this.vel.y += this.acc.y * dT;

        this.CutoffVel();

        this.pos.x += this.vel.x * dT;
        this.pos.y += this.vel.y * dT;
    }

    Draw() {
        ctx.fillStyle = this.color;
        ctx.arc(this.pos.x, this.pos.y, this.rad, 0, 2*Math.PI);
        ctx.fill();
    }
}

class Stage {
    constructor() {
        this.balls = [];
    }

    Collision(p) {
        for (let i = 0; i < this.balls.length; i++) {
            this.balls[i].Collision(p);
        }
    }

    AddBall() {
        this.balls.push(new Ball(new V2(canvas.width*Math.random(), -20), COLORS[1]));
    }

    Tick(dT) {
        for (let i = 0; i < this.balls.length; i++) {
            this.balls[i].Tick(dT);
        }
    }

    Draw() {
        for (let i = 0; i < this.balls.length; i++) {
            this.balls[i].Draw();
        }
    }
}

// Variables

var prevTime = null;
var stage = new Stage();
stage.AddBall();
stage.AddBall();

// Functions

function Tick(dT) {
    stage.Tick(dT);
}

function DrawStage() {
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.closePath();

    stage.Draw();
}

function DrawUI() {
}


function Update() {
    if (prevTime === null) {
        prevTime = Date.now();
    }
    let curTime = Date.now();

    Tick(curTime - prevTime);

    DrawStage();
    
    DrawUI();

    prevTime = curTime;
}

setInterval(Update, 1000/FPS);

function Click(p) {
    stage.Collision(p);
}

document.addEventListener("mousedown", function (evt) {
    Click(new V2(evt.clientX, evt.clientY));
}, false);

/*
document.addEventListener("touchstart", function (evt) {
    Click(evt.targetTouches[0].clientX, evt.targetTouches[0].clientY);
}, false);
*/

document.addEventListener("touchend", function (evt) {
}, false);
