// Sky Hoffert
// 8-Bomb dev version (to try things out).

///////////////////////////////////////////////////////////////////////////////////////////////////
// Global /////////////////////////////////////////////////////////////////////////////////////////

const fmath = new FMath();

// Disable right click menu.
document.addEventListener("contextmenu", function (e) { e.preventDefault(); });

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

const app = new PIXI.Application({
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: 0x1099bb,
    resolution: window.devicePixelRatio || 1,
    antialias: true,
});

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

// Global /////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
// Stage //////////////////////////////////////////////////////////////////////////////////////////

const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
sprite.width = 100;
sprite.height = 100;
sprite.anchor.set(0.5);
sprite.position.set(0,0);
stage.addChild(sprite);

stage_graphics.beginFill(0x3e494b);
stage_graphics.lineStyle(4, 0x0, .3);
stage_graphics.drawRoundedRect(300, 300, 100, 100, 30);
stage_graphics.endFill();

ui_graphics.beginFill(0x428923);
ui_graphics.drawRect(10, 10, 20, 40);
ui_graphics.endFill();

const poly = new PIXI.Polygon(
    -200, -200,
    -160, -160,
    -240, -160,
);
stage_graphics.lineStyle(4, 0x00ff00, 1);
stage_graphics.beginFill(0xff0000);
stage_graphics.drawPolygon(poly);
stage_graphics.endFill();

// Stage //////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
// Global /////////////////////////////////////////////////////////////////////////////////////////

document.addEventListener("mousedown", function (evt) {
    if (evt.button !== 0) { return; }
    
    const pt = viewport.toWorld(evt.x, evt.y);
    console.log("click x:" + pt.x + ",y:" + pt.y);
    console.log("type: " + poly.type);
    console.log(": " + poly.contains(pt.x, pt.y));
}, false);

// Global /////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////