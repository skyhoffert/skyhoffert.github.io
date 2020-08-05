// Sky Hoffert
// Loader for environment creation.

///////////////////////////////////////////////////////////////////////////////////////////////////
// Global /////////////////////////////////////////////////////////////////////////////////////////

const WIDTH_LOADER = window.innerWidth;
const HEIGHT_LOADER = window.innerHeight;

const loader_canvas = document.getElementById("loader-canvas");

const loader_input = document.getElementById("loader-input");
const loader_textarea = document.getElementById("loader-textarea");

var enviro_string = "";

loader_textarea.addEventListener("keydown", function (evt) {
    if (evt.key === "Enter") {
        loader_input.style.display = "none";
        enviro_string = loader_textarea.value;
    }
}, false);

// Global /////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
// Environment ////////////////////////////////////////////////////////////////////////////////////

const loader_app = new PIXI.Application({
    width: WIDTH_LOADER,
    height: HEIGHT_LOADER,
    backgroundColor: 0x1099bb,
    resolution: window.devicePixelRatio || 1,
    view: loader_canvas,
});

const viewport = new Viewport.Viewport({
    screenWidth: WIDTH_LOADER,
    screenHeight: HEIGHT_LOADER,
    worldWidth: WIDTH_LOADER,
    worldHeight: HEIGHT_LOADER,
    interaction: loader_app.renderer.plugins.interation,
});

loader_app.stage.addChild(viewport);

viewport
    .drag({mouseButtons: "right"})
    .pinch()
    .decelerate();

viewport.moveCenter(0,0);

/*
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
*/

// Environment ////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////