// Sky Hoffert
// Last Modified on Nov 24, 2019

const WIDTH = 400;
const HEIGHT = 300;
const PLOTWIDTH = 360;
const PLOTHEIGHT = 280;
const MAXFPS = 100;

var canvas = document.getElementById("uniform_basic");
var context = canvas.getContext("2d");
canvas.width = WIDTH; canvas.height = HEIGHT;
var prevTime = Date.now();

var count = 0;
var maxval = 5;
const TOTALNUM = 1000;
const DIVS = 20;

var hist = [];
for (let i = 0; i < DIVS; i++) { hist.push(0); }

function Update() {
    let now = Date.now();
    let dT = now - prevTime;

    if (dT < 1000/MAXFPS) { requestAnimationFrame(Update); return; }
    prevTime = now;

    let x = Math.random() * PLOTWIDTH;

    let idx = Math.floor(x / (PLOTWIDTH/DIVS));
    hist[idx]++;
    if (hist[idx] > maxval) { 
        maxval = hist[idx];
        context.clearRect(0, 0, WIDTH, HEIGHT);
        context.setLineDash([5, 15]);
        context.strokeStyle = "white";
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(WIDTH, 0);
        context.closePath();
        context.stroke();

        context.font = "14px Verdana";
        context.fillStyle = "white";
        let txt = "" + maxval;
        let wid = context.measureText(txt).width;
        context.fillText(txt, WIDTH - wid, 20);
    }

    context.fillStyle = "red";
    let pad = 4;
    for (let i = 0; i < DIVS; i++) {
        context.fillRect(i * (PLOTWIDTH/DIVS), PLOTHEIGHT * (1 - hist[i]/maxval),
            PLOTWIDTH/DIVS - pad, hist[i]/maxval * PLOTHEIGHT);
    }

    count++;

    // Run until program is complete.
    if (count < TOTALNUM) {
        requestAnimationFrame(Update);
    } else {
        console.log("uniform_basic is done.");
    }
}

requestAnimationFrame(Update);
