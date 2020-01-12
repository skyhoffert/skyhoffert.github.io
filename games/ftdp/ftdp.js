//
// Sky Hoffert
// Fun, Two-Dimensional Platformer
//

var width = 800;
var height = 600;
var FPS = 40;

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

// World stuff.
var testnr = new Rectangle(width/4,height/4,100,30);
var testrr = new RotatedRectangle(width/2,height/2,100,30,pi/8);
var pt = {x:width/2,y:height/8,Draw:function (c) {
    c.fillStyle = "white";
    c.fillRect(this.x-1,this.y-1,3,3);
}};

// Engine stuff.
function Tick(dT) {
    if (!testnr.Contains(pt.x,pt.y) && !testrr.Contains(pt.x,pt.y)){
        pt.y += 0.05 * dT;
    }
}

function Draw() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    testnr.Draw(ctx);
    testrr.Draw(ctx);
    pt.Draw(ctx);
}

var prevTime = Date.now();

function Update() {
    let now = Date.now();
    let dT = now - prevTime;
    prevTime = now;

    Tick(dT);

    Draw();
}

setInterval(Update, 1000/FPS);
