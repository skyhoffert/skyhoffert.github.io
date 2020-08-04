// Sky Hoffert
// Creating environments.

///////////////////////////////////////////////////////////////////////////////////////////////////
// Global /////////////////////////////////////////////////////////////////////////////////////////

const splitRightElem = document.getElementById("split-right");
const enviro_canvas = document.getElementById("enviro-canvas");
const WIDTH_ENVIRO = splitRightElem.offsetWidth;
const HEIGHT_ENVIRO = splitRightElem.offsetHeight;

const splitLeftElem = document.getElementById("split-left");
const selector_canvas = document.getElementById("selector-canvas");
const WIDTH_SELECTOR = splitLeftElem.offsetWidth;
const HEIGHT_SELECTOR = splitLeftElem.offsetHeight;

const TILE_SIZE = 32; // px
const N_TILES_ROW = 8;
const N_TILES_COL = 8;

var tmp = 0;
var tmp2 = 0;

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

var mouse = {x:0,y:0};
var prev_tile = -1;
var hover_tile = -1;

splitRightElem.addEventListener('contextmenu', event => event.preventDefault());

// Global /////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
// Environment ////////////////////////////////////////////////////////////////////////////////////

const enviro_app = new PIXI.Application({
    width: WIDTH_ENVIRO,
    height: HEIGHT_ENVIRO,
    backgroundColor: 0x1099bb,
    resolution: window.devicePixelRatio || 1,
    view: enviro_canvas,
});

const viewport = new Viewport.Viewport({
    screenWidth: WIDTH_ENVIRO,
    screenHeight: HEIGHT_ENVIRO,
    worldWidth: WIDTH_ENVIRO,
    worldHeight: HEIGHT_ENVIRO,
    interaction: enviro_app.renderer.plugins.interation,
});

enviro_app.stage.addChild(viewport);

viewport
    .drag({mouseButtons: "right"})
    .pinch()
    .wheel()
    .decelerate();

// Create a new texture
const texture = PIXI.Texture.from("tilesets/terrain_tiles24.png");

var tile_texture = new PIXI.Texture(texture, new PIXI.Rectangle(0,0,31,31));
const tiles = new PIXI.Sprite(tile_texture);
tiles.anchor.set(0.5);
tiles.position.set(WIDTH_ENVIRO/2, HEIGHT_ENVIRO/2);
viewport.addChild(tiles);

const mouse_text = new PIXI.Text("0,0",{ fontFamily: "monospace", fontSize: 24, fill: 0xffffff, align: "center"});
mouse_text.position.set(10, 10);
enviro_app.stage.addChild(mouse_text);

const tile_text = new PIXI.Text("tile 0",{ fontFamily: "monospace", fontSize: 24, fill: 0xffffff, align: "center"});
tile_text.position.set(10, 44);
enviro_app.stage.addChild(tile_text);

// Listen for animate update
enviro_app.ticker.add((delta) => {
    mouse_text.text = "" + mouse.x + "," + mouse.y;
    tile_text.text = "tile " + prev_tile;
});

splitRightElem.addEventListener("mousedown", function (evt) {
    const x = (prev_tile%8)*32;
    const y = Math.floor(prev_tile/8)*32;
    tile_texture = new PIXI.Texture(texture, new PIXI.Rectangle(x, y, 31, 31));
    tiles.texture = tile_texture;
    tiles.texture.update();
}, false);

// Environment ////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
// Selector ///////////////////////////////////////////////////////////////////////////////////////

const selector_app = new PIXI.Application({
    width: WIDTH_SELECTOR,
    height: HEIGHT_SELECTOR,
    backgroundColor: 0x0a0a0a,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    view: selector_canvas,
});

const selectbox_texture = PIXI.Texture.from("images/selectbox.png");
const selectbox = new PIXI.Sprite(selectbox_texture);
selectbox.position.set(-100, -100);

const selectbox_hover = new PIXI.Sprite(selectbox_texture);
selectbox_hover.position.set(-100, -100);
selectbox_hover.alpha = 0.5;

// Add new tileset, move to position
const tiles2 = new PIXI.Sprite(texture);
tiles2.anchor.set(0.5);
tiles2.position.set(WIDTH_SELECTOR/2, HEIGHT_SELECTOR/3);

var scaled_tile_size = 1;

selector_app.stage.addChild(tiles2);
selector_app.stage.addChild(selectbox_hover);
selector_app.stage.addChild(selectbox);

var TILES_T = tiles2.y - tiles2.height/2;
var TILES_L = tiles2.x - tiles2.width/2;
var TILES_B = tiles2.y + tiles2.height/2;
var TILES_R = tiles2.x + tiles2.width/2;

var hasDoneLoadProcedure = false;

function LoadProcedure() {
    // Rescale
    const newwidth = Math.pow(2, Math.floor(Math.log2(WIDTH_SELECTOR*0.9)));
    tmp = tiles2.height / tiles2.width;
    tmp2 = newwidth / tiles2.width;
    tiles2.width = newwidth;
    tiles2.height = tiles2.width * tmp;
    selectbox.width *= tmp2;
    selectbox.height *= tmp2;
    selectbox_hover.width *= tmp2;
    selectbox_hover.height *= tmp2;
    
    scaled_tile_size = Math.floor(TILE_SIZE * tmp2);
    console.log(""+scaled_tile_size);
    
    TILES_T = tiles2.y - tiles2.height/2;
    TILES_L = tiles2.x - tiles2.width/2;
    TILES_B = tiles2.y + tiles2.height/2;
    TILES_R = tiles2.x + tiles2.width/2;
}

// Listen for animate update
selector_app.ticker.add((delta) => {
    if (hasDoneLoadProcedure === false) {
        if (texture.baseTexture.valid) {
            hasDoneLoadProcedure = true;
            LoadProcedure();
        }
    }
});

splitLeftElem.addEventListener("mousemove", function (evt) {
    mouse.x = evt.x;
    mouse.y = evt.y;

    tmp = mouse.x - TILES_L;
    tmp2 = mouse.y - TILES_T;

    if (mouse.x > TILES_L && mouse.x < TILES_R && mouse.y > TILES_T && mouse.y < TILES_B) {
        hover_tile = Math.floor(tmp / scaled_tile_size) + (Math.floor(tmp2 / scaled_tile_size) * N_TILES_ROW);
        selectbox_hover.x = (hover_tile % 8) * scaled_tile_size + TILES_L;
        selectbox_hover.y = Math.floor(hover_tile / 8) * scaled_tile_size + TILES_T;
    }
}, false);

splitLeftElem.addEventListener("mousedown", function (evt) {
    if (mouse.x > TILES_L && mouse.x < TILES_R && mouse.y > TILES_T && mouse.y < TILES_B) {
        prev_tile = hover_tile;
        selectbox.x = selectbox_hover.x;
        selectbox.y = selectbox_hover.y;
    }
}, false);

// Selector ///////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
