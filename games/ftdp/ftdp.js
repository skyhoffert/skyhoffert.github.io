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
var terrain = [];
/*
terrain.push(new Rectangle(width/4,height/4,100,30),
    new RotatedRectangle(width/2,height/2,100,30,pi/8),
    new Rectangle(width/2,height, width, 40)
);

var player = new Player(width/2,height/4,12,"purple");
*/
terrain.push(new Rectangle(0, 300, 800, 40));
var player = new Player(0, 0, 12, "purple");

var camera = new Camera(0,0,width,height);

document.addEventListener("keydown", function (evt) {
    player.keyUpdates.push({key:evt.key,down:true});
}, false);

document.addEventListener("keyup", function (evt) {
    player.keyUpdates.push({key:evt.key,down:false});
}, false);

// Engine stuff.
function Tick(dT) {
    player.Tick(dT);

    player.Collision(terrain);
}

function Draw() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < terrain.length; i++) {
        terrain[i].Draw(ctx,camera);
    }

    player.Draw(ctx,camera);
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
