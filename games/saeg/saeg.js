// Sky Hoffert
// Main script for saeg.

var canvas = document.getElementById("canvas");
canvas.width = WIDTH;
canvas.height = HEIGHT;
var context = canvas.getContext("2d");

var taller = window.innerWidth < (window.innerHeight-100) * 4/3;
if (!taller) {
    canvas.style.width = ""+(window.innerHeight-100)*0.99*4/3+"px";
    canvas.style.height = ""+(window.innerHeight-100)*0.99+"px";
} else {
    canvas.style.width = ""+window.innerWidth*0.99+"px";
    canvas.style.height = ""+window.innerWidth*0.99*3/4+"px";
}

context['imageSmoothingEnabled'] = false;       /* standard */
context['oImageSmoothingEnabled'] = false;      /* Opera */
context['webkitImageSmoothingEnabled'] = false; /* Safari */
context['msImageSmoothingEnabled'] = false;     /* IE */

var rect = canvas.getBoundingClientRect(), // abs. size of element
    scaleX = canvas.width / rect.width,    // relationship bitmap vs. element for X
    scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y

console.log("(w="+canvas.style.width+",h="+canvas.style.height+")");

var prevTime = window.performance.now();
var gameStage = new Testground();

var frames = 0;
var time = 0;
const FPS_TIMER = 6000;

function GetMousePos(evt) {
    return {
        x: (evt.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
        y: (evt.clientY - rect.top) * scaleY     // been adjusted to be relative to element
    };
}

document.addEventListener("keydown", function (evt) {
    gameStage.UserInput({type:"key",key:evt.key,down:true});
}, false);
document.addEventListener("keyup", function (evt) {
    gameStage.UserInput({type:"key",key:evt.key,down:false});
}, false);

canvas.addEventListener("mousemove", function (evt) {
    let mpos = GetMousePos(evt);
    gameStage.UserInput({type:"mouseMove",x:mpos.x,y:mpos.y});
}, false);
canvas.addEventListener("mousedown", function (evt) {
    gameStage.UserInput({type:"mouseButton",down:true});
}, false);
canvas.addEventListener("mousedown", function (evt) {
    gameStage.UserInput({type:"mouseButton",down:false});
}, false);

function Tick(dT) {
    gameStage.Tick(dT);
    gameStage.Draw(context);
}

function Update() {
    requestAnimationFrame(Update);

    let now = window.performance.now();
    let dT = now - prevTime;
    prevTime = now;

    Tick(dT);

    frames++;
    time += dT;
    if (time > FPS_TIMER) {
        console.log("[DEBUG] FPS = "+frames/time*1000);
        frames = 0;
        time = 0;
    }
}

requestAnimationFrame(Update);
