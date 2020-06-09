// Sky Hoffert
// gmmg demonstration.

const SCALE = 0.8;
const WIDTH = 1200 * SCALE;
const HEIGHT = 800 * SCALE;

let app = new PIXI.Application({width:WIDTH, height:HEIGHT});
document.body.appendChild(app.view);

const viewport = new Viewport.Viewport({
	screenWidth: window.innerWidth,
	screenHeight: window.innerHeight,
	worldWidth: WIDTH,
	worldHeight: HEIGHT,
	interaction: app.renderer.plugins.interaction
});
app.stage.addChild(viewport);
viewport
	.drag()
	.pinch()
	.wheel()
	.decelerate();

const FPS = 44;

let keys = {w:false,a:false,s:false,d:false," ":false};

PIXI.loader.load(Setup);

function Setup() {
}

let stage = new Testground();

let prevTime = performance.now();

function Tick() {
    let now = performance.now();
    let dT = (now - prevTime) / 1000;
    prevTime = now;

    stage.Tick(dT);
}

setInterval(Tick, 1000/FPS);

document.addEventListener("keydown", function (ev) {
    keys[ev.key] = true;
}, false);

document.addEventListener("keyup", function (ev) {
    keys[ev.key] = false;
}, false);
