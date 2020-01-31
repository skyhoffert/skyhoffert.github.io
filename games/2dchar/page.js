// Sky Hoffert
// Page for 2dchar.

const WIDTH = 800;
const HEIGHT = 600;
const FPS = 40;

var canvas = document.getElementById("canvas");
canvas.width = WIDTH;
canvas.height = HEIGHT;
canvas.style.width = 0.99*window.innerWidth;
canvas.style.height = 3/4 * canvas.style.width;
var context = canvas.getContext("2d");

function Draw() {
    context.fillStyle = "black";
    context.fillRect(0,0,WIDTH,HEIGHT);
}

function Tick(dT) {
    Draw();
}

var prevTime = Date.now();

function Update() {
    let now = Date.now();
    let dT = now - prevTime;
    
    if (dT > 1000/FPS) {
        Tick(dT);
        prevTime = now;
    }

    requestAnimationFrame(Update);
}

requestAnimationFrame(Update);