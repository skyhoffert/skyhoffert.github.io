/*
Sky Hoffert
jgl javascript file.
Last Modified: November 2, 2019
*/

const FPS = 60;
const COLORS = ["red", "orange", "yellow", "greenyellow", "green", "blue", "indigo", "violet"];
const SCORE_CLICK = 1;
const SCORE_DESTROY = 10;
const SCORE_MISS = -5;
var AUDIO = [];
const AUDIO_VOLUME = 0.05;
for (let i = 0; i < COLORS.length; i++) {
    AUDIO.push(new Audio("gfx/ding_"+(i+1)+".wav"));
    AUDIO[i].volume = AUDIO_VOLUME/(i+1);
}

var canvas = document.getElementById("mainCanvas");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
var ctx = canvas.getContext("2d");

class V2{ constructor(x, y){ this.x = x; this.y = y; } }

class Ball {
    constructor(p, cI) {
        this.pos = new V2(p.x, p.y);
        this.vel = new V2(0, 0);
        this.acc = new V2(0, 0.001);
        this.rad = 40;
        this.colorIndex = cI;
        this.alive = true;

        this.maxVel = 0.8;
        this.boundFactor = 0.9;
        this.clickFudge = 4;
    }

    Collision(p) {
        if (!this.alive) { return; }

        let d = Math.sqrt(Math.pow(this.pos.x - p.x, 2) + Math.pow(this.pos.y - p.y, 2));
        let c = d < this.rad * this.clickFudge;
        
        if (c) {
            if (sound) {
                AUDIO[this.colorIndex].play();
            }

            this.vel.y = -Math.abs(this.vel.y) * this.boundFactor;
            this.colorIndex++;
            score += SCORE_CLICK;
        }

        if (this.colorIndex >= COLORS.length) {
            this.alive = false;
            score += SCORE_DESTROY;
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
        if (!this.alive) { return; }

        this.vel.x += this.acc.x * dT;
        this.vel.y += this.acc.y * dT;

        this.CutoffVel();

        this.pos.x += this.vel.x * dT;
        this.pos.y += this.vel.y * dT;

        if (this.pos.y > canvas.height+20) {
            this.alive = false;
            misses++;
        }
    }

    Draw() {
        if (!this.alive){ return; }

        ctx.fillStyle = COLORS[this.colorIndex];
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.rad, 0, 2*Math.PI);
        ctx.closePath();
        ctx.fill();
    }
}

class Stage {
    constructor() {
        this.balls = [];
        this.tBetweenBalls = 4500;
        this.tNextBall = 2000;
        this.diffIncrFactor = 0.95;
        this.minTBB = 200;
    }

    Collision(p) {
        for (let i = 0; i < this.balls.length; i++) {
            this.balls[i].Collision(p);
        }
    }

    AddBall() {
        this.balls.push(new Ball(new V2(canvas.width*2/3*Math.random() + canvas.width/6, -20),
            Math.floor(Math.random() * (COLORS.length-1))));
    }

    Tick(dT) {
        for (let i = 0; i < this.balls.length; i++) {
            this.balls[i].Tick(dT);
        }

        this.tNextBall -= dT;

        if (this.tNextBall <= 0) {
            this.AddBall();
            this.tNextBall = this.tBetweenBalls;
            this.tBetweenBalls *= this.diffIncrFactor;
            this.tBetweenBalls = this.tBetweenBalls < this.minTBB ? this.minTBB : this.tBetweenBalls;
        }
    }

    Draw() {
        for (let i = 0; i < this.balls.length; i++) {
            this.balls[i].Draw();
        }
    }
}

// Variables

var score;
var elapsed;
var misses;
var playing;
var darkenScreen;
var prevTime;
var stage;
var sound = true;

var btnPlayAgain = document.getElementById("btnPlayAgain");
var btnVol = document.getElementById("btnVol");
var imgAudio = document.getElementById("imgAudio");

Init();

// Functions

function Init() {
    score = 0;
    elapsed = 0;
    misses = 0;
    playing = true;
    darkenScreen = false;
    prevTime = null;
    stage = new Stage();

    btnPlayAgain.style.display = "none";
    
    ctx.font = "30px Verdana";
}

function Tick(dT) {
    stage.Tick(dT);

    if (misses >= 3) {
        playing = false;
    }
}

function DrawStage() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stage.Draw();
}

function DrawUI() {
    ctx.fillStyle = "white";
    ctx.fillText("" + score, 0, 30);

    ctx.strokeStyle = "white";
    ctx.strokeRect(10, 60, 30, 30);
    ctx.strokeRect(10, 100, 30, 30);
    ctx.strokeRect(10, 140, 30, 30);

    ctx.fillStyle = "red";
    for (let i = 0; i < misses; i++) {
        ctx.fillRect(10 + 1, 60+i*40 + 1, 28, 28);
    }
}


function Update() {
    if (playing) {
        if (prevTime === null) {
            prevTime = Date.now();
        }
        let curTime = Date.now();
        let dT = curTime - prevTime;
        elapsed += dT;

        Tick(dT);

        DrawStage();
        
        DrawUI();

        prevTime = curTime;
    } else {
        if (!darkenScreen) {
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            darkenScreen = true;

            ctx.globalAlpha = 1.0;
            ctx.fillStyle = "white";
            let fsize = 96;
            ctx.font = "" + fsize + "px Verdana";
            let txt = "Game Over";
            let txtw = ctx.measureText(txt).width;
            let txth = ctx.measureText(txt).height;
            ctx.fillText(txt, canvas.width/2 - txtw/2, canvas.height/2 - fsize/2);

            btnPlayAgain.style.display = "block";
        }
    }
}

setInterval(Update, 1000/FPS);

function Click(p) {
    if (!playing) { return; }
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

btnPlayAgain.onclick = function () {
    Init();
}

btnVol.onclick = function () {
    if (sound) {
        sound = false;
        imgAudio.src = "gfx/audio_off.png";
    } else {
        sound = true;
        imgAudio.src = "gfx/audio_on.png";
    }
}