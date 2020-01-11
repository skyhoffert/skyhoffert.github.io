//
// Sky Hoffert
// 2D Universe
//

var width = window.innerWidth;
var height = window.innerHeight;

var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");
canvas.width = width;
canvas.height = height;

var map = new Map(5,5,160,90,"#222222");

var world = [];

var player = new Player();
world.push(player);

var walltest = new CircleWall(-40, 0, 6);
world.push(walltest);
var walltest2 = new CircleWall(-20,-20,4);
world.push(walltest2);

var prevTime = Date.now();

function Draw() {
    context.fillStyle = "black";
    context.fillRect(0, 0, width, height);

    map.Draw(context);

    for (let i = 0; i < world.length; i++) {
        world[i].Draw(context,map,player);
    }
}

function Tick(dT) {
    for (let i = 0; i < world.length; i++) {
        world[i].Tick(dT);
    }
}

function Update() {
    let now = Date.now();
    let dT = now - prevTime;
    prevTime = now;

    Tick(dT);

    Draw();
}

setInterval(Update, 1000/FPS);

document.addEventListener("keydown", function (evt) {
    player.keys[evt.key] = true;
}, false);

document.addEventListener("keyup", function (evt) {
    player.keys[evt.key] = false;
}, false);
