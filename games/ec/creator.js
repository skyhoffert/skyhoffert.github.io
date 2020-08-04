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

// Variables used to dissect the given spritesheet. MUST MATCH.
const TILE_SIZE = 32; // px
const N_TILES_ROW = 8;
const N_TILES_COL = 8;

var tmp = 0;
var tmp2 = 0;

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

var mouse_selector = {x:0,y:0};
var mouse_enviro = {x:0,y:0};
var prev_tile = 0;
var hover_tile = -1;
var enviro_tile_idx = {x:0,y:0};
var enviro_tile_pos = {x:0,y:0};
var enviro_tile_key = "0,0";

var enviro_tiles = {};
// This dict is used to export contents of the world.
var enviro_tiles_export = {"type":"tiled-world","version":"0.0.1","tile-size":"32x32","tiles":{}};

// Prevent right-click from bringing up window, as it is used to navigate the environment.
splitRightElem.addEventListener("contextmenu", function (e) { e.preventDefault(); });

const selectbox_texture = PIXI.Texture.from("images/selectbox.png");

// Copy exportable dictionary to clipboard.
function CopyToClipboard() {
    var data = [new ClipboardItem({ "text/plain": new Blob([JSON.stringify(enviro_tiles_export)], { type: "text/plain" }) })];
    navigator.clipboard.write(data).then(function() {
      console.log("Copied to clipboard successfully!");
    }, function() {
      console.error("Unable to write to clipboard. :-(");
    });
}

// DEBUG: this should not happen on keypress, temporary debugging technique.
document.addEventListener("keydown", function (evt) {
    CopyToClipboard();
}, false);

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

viewport.moveCenter(0,0);

// Create a new texture of the spritesheet itself.
// TODO: include filename in the export data.
// TODO: bad naming.
const texture = PIXI.Texture.from("tilesets/terrain_tiles24.png");

const mouse_text = new PIXI.Text("0,0",{ fontFamily: "monospace", fontSize: 24, fill: 0xffffff, align: "center"});
mouse_text.position.set(10, 10);
enviro_app.stage.addChild(mouse_text);

const tile_text = new PIXI.Text("tile 0",{ fontFamily: "monospace", fontSize: 24, fill: 0xffffff, align: "center"});
tile_text.position.set(10, 44);
enviro_app.stage.addChild(tile_text);

const selectbox_hover_env = new PIXI.Sprite(selectbox_texture);
selectbox_hover_env.anchor.set(0.5);
selectbox_hover_env.position.set(0, 0);
selectbox_hover_env.alpha = 0.8;
viewport.addChild(selectbox_hover_env);

// Listen for animate update
enviro_app.ticker.add((delta) => {
    mouse_text.text = "" + enviro_tile_idx.x + "," + enviro_tile_idx.y;
    tile_text.text = "tile " + prev_tile;
});

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
    
    TILES_T = tiles2.y - tiles2.height/2;
    TILES_L = tiles2.x - tiles2.width/2;
    TILES_B = tiles2.y + tiles2.height/2;
    TILES_R = tiles2.x + tiles2.width/2;

    selectbox.position.set(TILES_L, TILES_T);
    
    return true;
}

// Listen for animate update
selector_app.ticker.add((delta) => {
    if (hasDoneLoadProcedure === false) {
        if (texture.baseTexture.valid) {
            hasDoneLoadProcedure = LoadProcedure();
        }
    }
});

// Selector ///////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
// Global /////////////////////////////////////////////////////////////////////////////////////////

document.addEventListener("mousemove", function (evt) {
    if (evt.x > splitLeftElem.offsetWidth) {
        mouse_enviro.x = evt.x;
        mouse_enviro.y = evt.y;
    
        tmp2 = splitLeftElem.offsetWidth;
        tmp = viewport.toWorld(mouse_enviro.x - tmp2, mouse_enviro.y);
        tmp.x += 16;
        tmp.y += 16;

        tmp.x = Math.floor(tmp.x / 32);
        tmp.y = Math.floor(tmp.y / 32);

        enviro_tile_idx.x = tmp.x;
        enviro_tile_idx.y = tmp.y;
        enviro_tile_pos.x = tmp.x * 32;
        enviro_tile_pos.y = tmp.y * 32;

        enviro_tile_key = "" + enviro_tile_idx.x + "," + enviro_tile_idx.y;
    
        selectbox_hover_env.position.set(enviro_tile_pos.x, enviro_tile_pos.y);

        return;
    }

    mouse_selector.x = evt.x;
    mouse_selector.y = evt.y;

    tmp = mouse_selector.x - TILES_L;
    tmp2 = mouse_selector.y - TILES_T;

    if (mouse_selector.x > TILES_L && mouse_selector.x < TILES_R && mouse_selector.y > TILES_T && mouse_selector.y < TILES_B) {
        hover_tile = Math.floor(tmp / scaled_tile_size) + (Math.floor(tmp2 / scaled_tile_size) * N_TILES_ROW);
        selectbox_hover.x = (hover_tile % 8) * scaled_tile_size + TILES_L;
        selectbox_hover.y = Math.floor(hover_tile / 8) * scaled_tile_size + TILES_T;
    }
}, false);

document.addEventListener("mousedown", function (evt) {
    if (evt.button !== 0) { return; }

    if (evt.x > splitLeftElem.offsetWidth) {
        const x = (prev_tile%8)*32;
        const y = Math.floor(prev_tile/8)*32;

        if (!(enviro_tile_key in enviro_tiles)) {
            enviro_tiles[enviro_tile_key] = {"tilenum":prev_tile, "sprite":null};
            enviro_tiles[enviro_tile_key].sprite = new PIXI.Sprite();
            enviro_tiles[enviro_tile_key].sprite.anchor.set(0.5);
            enviro_tiles[enviro_tile_key].sprite.width = TILE_SIZE;
            enviro_tiles[enviro_tile_key].sprite.height = TILE_SIZE;

            viewport.addChild(enviro_tiles[enviro_tile_key].sprite);

            // Add the selectbox as a child (removing old parent) to keep it on top.
            viewport.addChild(selectbox_hover_env);
        }

        enviro_tiles[enviro_tile_key].sprite.position.set(enviro_tile_pos.x, enviro_tile_pos.y);
        enviro_tiles[enviro_tile_key].sprite.texture = new PIXI.Texture(texture, new PIXI.Rectangle(x, y, 31, 31));
        enviro_tiles[enviro_tile_key].sprite.texture.update();

        enviro_tiles_export.tiles[enviro_tile_key] = prev_tile;

        return;
    }

    if (mouse_selector.x > TILES_L && mouse_selector.x < TILES_R && mouse_selector.y > TILES_T && mouse_selector.y < TILES_B) {
        prev_tile = hover_tile;
        selectbox.x = selectbox_hover.x;
        selectbox.y = selectbox_hover.y;
    }
}, false);

// Global /////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////