// Sky Hoffert
// 8-Bomb dev version (to try things out).

///////////////////////////////////////////////////////////////////////////////////////////////////
// Global /////////////////////////////////////////////////////////////////////////////////////////

let stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

const fmath = new FMath();

// Disable right click menu.
document.addEventListener("contextmenu", function (e) { e.preventDefault(); });

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

const COS_45_FACTOR = fmath.cos(Math.PI/4);

let loaded = false;

let keys = {w:false,a:false,s:false,d:false};

function Tick(dT) {
    stats.begin();
    
    if (!loaded) { return; }

    stage_graphics.clear();

    // Ticking.
    bomb_spawner.Tick(dT);
    player.Tick(dT);
    for (let i = 0; i < stage_fx.length; i++) {
        stage_fx[i].Tick(dT);
        if (stage_fx[i].active === false) {
            stage_fx.splice(i, 1);
            i--;
        }
    }

    // Drawing.
    ground.Draw();
    bomb_spawner.Draw();
    player.Draw();
    for (let i = 0; i < stage_fx.length; i++) {
        stage_fx[i].Draw();
    }

	stats.end();
}

const app = new PIXI.Application({
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: 0x1099bb,
    resolution: window.devicePixelRatio || 1,
    antialias: true,
});

app.ticker.add(Tick);

document.body.appendChild(app.view);

const viewport = new Viewport.Viewport({
    screenWidth: WIDTH,
    screenHeight: HEIGHT,
    worldWidth: WIDTH,
    worldHeight: HEIGHT,
    interaction: app.renderer.plugins.interation,
});

app.stage.addChild(viewport);

viewport
    .drag({mouseButtons: "right"})
    .pinch()
    .decelerate()
    .wheel();

viewport.moveCenter(0,0);

// UI elements go in the UI - ui_graphics is a child.
const ui = new PIXI.Container();
app.stage.addChild(ui);

// Stage elements go in stage - stage_graphics is a child.
const stage = new PIXI.Container();
viewport.addChild(stage);

const stage_graphics = new PIXI.Graphics();
stage.addChild(stage_graphics);
const ui_graphics = new PIXI.Graphics();
ui.addChild(ui_graphics);

let Engine = Matter.Engine;
let World = Matter.World;
let Bodies = Matter.Bodies;
let engine = Engine.create();

// TODO: adjust gravity for proper feeling.
engine.world.gravity.y = 0.2;

Engine.run(engine);

// Global /////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
// Stage //////////////////////////////////////////////////////////////////////////////////////////

/*
const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
sprite.width = 100;
sprite.height = 100;
sprite.anchor.set(0.5);
sprite.position.set(0,0);
stage.addChild(sprite);
*/

ui_graphics.beginFill(0x3e494b);
ui_graphics.lineStyle(4, 0x0, .3);
ui_graphics.drawRoundedRect(10, 10, 100, 100, 30);
ui_graphics.endFill();

const ground = new Ground();
const player = new UserBall(100, 0, ground);
const bomb_spawner = new BombSpawner(100, -20, 200);
let stage_fx = [];

loaded = true;

// Stage //////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
// Global /////////////////////////////////////////////////////////////////////////////////////////

document.addEventListener("mousedown", function (evt) {
    if (evt.button !== 0) { return; }
    
    const pt = viewport.toWorld(evt.x, evt.y);
    pt.x = Math.round(pt.x*2)/2;
    pt.y = Math.round(pt.y*2)/2;
    console.log("click x:" + pt.x + ",y:" + pt.y);

    ground.Bomb(pt.x, pt.y);
}, false);

document.addEventListener("keydown", function (evt) {
    keys[evt.key] = true;
}, false);
document.addEventListener("keyup", function (evt) {
    keys[evt.key] = false;
}, false);

// Global /////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////