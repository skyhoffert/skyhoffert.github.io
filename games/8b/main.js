// Sky Hoffert
// 8-Bomb dev version (to try things out).

///////////////////////////////////////////////////////////////////////////////////////////////////
// Global /////////////////////////////////////////////////////////////////////////////////////////

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

const fmath = new FMath();

// Global /////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////

const sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
sprite.width = 100;
sprite.height = 100;
sprite.anchor.set(0.5);
sprite.position.set(0,0);
viewport.addChild(sprite);

const graphics = new PIXI.Graphics();

graphics.beginFill(0x3e494b);
graphics.lineStyle(4, 0x0, .3);
graphics.drawRoundedRect(300, 300, 100, 100, 30);
graphics.endFill();

graphics.beginFill(0x428923);
graphics.endFill();

viewport.addChild(graphics);
