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

const MAX_ZOOM_AMT = 50;

var tmp = 0;
var tmp2 = 0;

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

var mouse_selector = {x:0,y:0};
var mouse_enviro = {x:0,y:0};
var mouse_in_enviro = false;
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
    navigator.clipboard.writeText(JSON.stringify(enviro_tiles_export)).then(function() {
        console.log("Wrote to clipboard!");
    }, function() {
        console.error("Could not write to clipboard.")
    });

    return;
}

document.addEventListener("keydown", function (evt) {
    if (evt.key === "s") {
        CopyToClipboard();
    }
    else if (evt.key === "d") {
        if (enviro_tile_key in enviro_tiles) {
            viewport.removeChild(enviro_tiles[enviro_tile_key].sprite);
            delete enviro_tiles[enviro_tile_key];
            delete enviro_tiles_export.tiles[enviro_tile_key];
        }
    }
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
    .decelerate();

viewport.moveCenter(0,0);

// Create a new texture of the spritesheet itself.
// TODO: include filename in the export data.
// TODO: bad naming.
const texture = PIXI.Texture.from("tilesets/terrain_tiles24.png");

// Display which tile position in enviro will be edited.
const mouse_text = new PIXI.Text("0,0",{ fontFamily: "monospace", fontSize: 24, fill: 0xffffff, align: "center"});
mouse_text.position.set(10, 10);
enviro_app.stage.addChild(mouse_text);

// Display which tile in selector is chosen.
const tile_text = new PIXI.Text("tile 0",{ fontFamily: "monospace", fontSize: 24, fill: 0xffffff, align: "center"});
tile_text.position.set(10, 44);
enviro_app.stage.addChild(tile_text);

// Display a little tooltop.
const tooltip_text = [
    new PIXI.Text("s: save to clipboard",{ fontFamily: "monospace", fontSize: 12, fill: 0xffffff, align: "center"}),
    new PIXI.Text("d: delete tile",{ fontFamily: "monospace", fontSize: 12, fill: 0xffffff, align: "center"}),
];
for (let i = 0; i < tooltip_text.length; i++) {
    tooltip_text[i].position.set(10, splitRightElem.offsetHeight - (12*(i+1) + 10));
    enviro_app.stage.addChild(tooltip_text[i]);
}

// Hover selectbox for placing tile in enviro.
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

// Selectbox outlines which tile will be placed.
const selectbox = new PIXI.Sprite(selectbox_texture);
selectbox.position.set(-100, -100);

// Hover indicates which tile the mouse is hovering over currently
const selectbox_hover = new PIXI.Sprite(selectbox_texture);
selectbox_hover.position.set(-100, -100);
selectbox_hover.alpha = 0.5;

// Add new tileset, move to position
const tiles2 = new PIXI.Sprite(texture);
tiles2.anchor.set(0.5);
tiles2.position.set(WIDTH_SELECTOR/2, HEIGHT_SELECTOR/3);

// Will be used later to scale things.
var scaled_tile_size = 1;

selector_app.stage.addChild(tiles2);
selector_app.stage.addChild(selectbox_hover);
selector_app.stage.addChild(selectbox);

// Bounding box for main tiles image.
var TILES_T = tiles2.y - tiles2.height/2;
var TILES_L = tiles2.x - tiles2.width/2;
var TILES_B = tiles2.y + tiles2.height/2;
var TILES_R = tiles2.x + tiles2.width/2;

var hasDoneLoadProcedure = false;

// LoadProcedure happens later in the code when the texture has been surely loaded.
function LoadProcedure() {
    // Rescale
    const newwidth = Math.floor(WIDTH_SELECTOR*0.9);
    tmp = tiles2.height / tiles2.width;
    tmp2 = newwidth / tiles2.width;
    tiles2.width = newwidth;
    tiles2.height = tiles2.width * tmp;
    selectbox.width *= tmp2;
    selectbox.height *= tmp2;
    selectbox_hover.width *= tmp2;
    selectbox_hover.height *= tmp2;
    
    scaled_tile_size = TILE_SIZE * tmp2;
    
    TILES_T = tiles2.y - tiles2.height/2;
    TILES_L = tiles2.x - tiles2.width/2;
    TILES_B = tiles2.y + tiles2.height/2;
    TILES_R = tiles2.x + tiles2.width/2;

    selectbox.position.set(TILES_L, TILES_T);

    console.log("Performed load procedure.");
    
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
    // Right panel actions inside the if.
    if (evt.x > splitLeftElem.offsetWidth) {
        mouse_enviro.x = evt.x;
        mouse_enviro.y = evt.y;
    
        tmp2 = splitLeftElem.offsetWidth;
        tmp = viewport.toWorld(mouse_enviro.x - tmp2, mouse_enviro.y);

        // TODO: this doesn't work correctly. Not sure why.
        tmp.x += TILE_SIZE/2;
        tmp.y += TILE_SIZE/2;

        tmp.x = Math.floor(tmp.x / 32);
        tmp.y = Math.floor(tmp.y / 32);

        enviro_tile_idx.x = tmp.x;
        enviro_tile_idx.y = tmp.y;
        enviro_tile_pos.x = tmp.x * 32;
        enviro_tile_pos.y = tmp.y * 32;

        enviro_tile_key = "" + enviro_tile_idx.x + "," + enviro_tile_idx.y;
    
        selectbox_hover_env.position.set(enviro_tile_pos.x, enviro_tile_pos.y);

        mouse_in_enviro = true;

        return;
    }

    // Left panel actions here.

    mouse_in_enviro = false;

    mouse_selector.x = evt.x;
    mouse_selector.y = evt.y;

    tmp = mouse_selector.x - TILES_L;
    tmp2 = mouse_selector.y - TILES_T;

    if (mouse_selector.x > TILES_L && mouse_selector.x < TILES_R && mouse_selector.y > TILES_T && mouse_selector.y < TILES_B) {
        hover_tile = Math.floor(tmp / scaled_tile_size) + (Math.floor(tmp2 / scaled_tile_size) * N_TILES_ROW);
        selectbox_hover.x = (hover_tile % 8) * scaled_tile_size + TILES_L;
        selectbox_hover.y = Math.floor(hover_tile / 8) * scaled_tile_size + TILES_T;
    } else {
        selectbox_hover.position.set(-100,-100);
    }
}, false);

document.addEventListener("mousedown", function (evt) {
    // Only use left mouse button.
    if (evt.button !== 0) { return; }

    // Right panel actions inside if.
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
        enviro_tiles[enviro_tile_key].sprite.texture = new PIXI.Texture(texture, new PIXI.Rectangle(x, y, 32, 32));
        enviro_tiles[enviro_tile_key].sprite.texture.update();

        enviro_tiles_export.tiles[enviro_tile_key] = prev_tile;

        return;
    }

    // Left panel actions here.

    if (mouse_selector.x > TILES_L && mouse_selector.x < TILES_R && mouse_selector.y > TILES_T && mouse_selector.y < TILES_B) {
        prev_tile = hover_tile;
        selectbox.x = selectbox_hover.x;
        selectbox.y = selectbox_hover.y;
    }
}, false);

// Manually zoom, fixed a buggy viepower.wheel() function.
document.addEventListener("wheel", function (evt) {
    if (mouse_in_enviro) {
        const wheelAmt = evt.deltaY*2;
        const amt = Math.min(Math.max(wheelAmt, -MAX_ZOOM_AMT), MAX_ZOOM_AMT);
        viewport.zoom(amt, false);
    }
}, false);

// Global /////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////