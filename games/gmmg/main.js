// Sky Hoffert
// gmmg demonstration.

let app = new PIXI.Application({width:1200, height:800});
document.body.appendChild(app.view);

let graphics = new PIXI.Graphics();

let keys = {w:false,a:false,s:false,d:false," ":false};

PIXI.loader.load(Setup);

function Setup() {
    app.stage.addChild(graphics);
}

let stage = new Testground();

let prevTime = performance.now();

function Tick() {
    let now = performance.now();
    let dT = (now - prevTime) / 1000;
    prevTime = now;

    graphics.clear();

    stage.Tick(dT);

    stage.Draw(graphics);
}

setInterval(Tick,1000/24);

document.addEventListener("keydown", function (ev) {
    keys[ev.key] = true;
}, false);

document.addEventListener("keyup", function (ev) {
    keys[ev.key] = false;
}, false);
