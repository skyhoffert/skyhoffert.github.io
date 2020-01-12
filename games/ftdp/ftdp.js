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
terrain.push(new Rectangle(0, -50, 800, 40));
terrain.push(new RotatedRectangle(320, -90, 200, 30, pi/8));
terrain.push(new Rectangle(-420, -230, 40, 400));
terrain.push(new Rectangle(420, -230, 40, 400));
terrain.push(new Rectangle(300,-360,200,40));

var player = new Player(0, -220, 12, "purple");

var camera = new Camera(0,-400,width,height);
camera.target = player;

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

    camera.Tick(dT);
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
