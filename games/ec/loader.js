// Sky Hoffert
// Loader for environment creation.

///////////////////////////////////////////////////////////////////////////////////////////////////
// Global /////////////////////////////////////////////////////////////////////////////////////////

const WIDTH_LOADER = window.innerWidth;
const HEIGHT_LOADER = window.innerHeight;

const loader_canvas = document.getElementById("loader-canvas");

const loader_input = document.getElementById("loader-input");
const loader_textarea = document.getElementById("loader-textarea");

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

// Disable right click menu.
loader_canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

var enviro_tiles = {};
var enviro_string = "";

var enviro_tilenums = {};

var texture = null;

var TILE_SIZE = 0;

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

const renderer = PIXI.autoDetectRenderer();

const viewport = new Viewport.Viewport({
    screenWidth: WIDTH_LOADER,
    screenHeight: HEIGHT_LOADER,
    worldWidth: WIDTH_LOADER,
    worldHeight: HEIGHT_LOADER,
    interaction: loader_app.renderer.plugins.interation,
});

const texture_container = new PIXI.ParticleContainer();
viewport.addChild(texture_container);

loader_app.stage.addChild(viewport);

viewport
    .drag({mouseButtons: "right"})
    .pinch()
    .decelerate()
    .wheel();

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
*/

function LoadEnviro() {
    const enviro_json = JSON.parse(enviro_string);

    // DEBUG
    console.log("type: " + enviro_json["type"]);
    console.log("version: " + enviro_json["version"]);

    TILE_SIZE = parseInt(enviro_json["tile-size"]);

    console.log("tile-size: " + TILE_SIZE);

    texture = PIXI.Texture.from(enviro_json["tile-file"]);

    const enviro_tile_dict = enviro_json["tiles"];
    const enviro_tile_dict_keys = Object.keys(enviro_tile_dict);
    for (let i = 0; i < enviro_tile_dict_keys.length; i++) {
        enviro_tile_key = enviro_tile_dict_keys[i];
        tilenum = enviro_tile_dict[enviro_tile_key];

        enviro_tiles[enviro_tile_key] = {"tilenum":tilenum, "sprite":null};
        enviro_tiles[enviro_tile_key].sprite = new PIXI.Sprite();
        enviro_tiles[enviro_tile_key].sprite.anchor.set(0.5);
        enviro_tiles[enviro_tile_key].sprite.width = TILE_SIZE;
        enviro_tiles[enviro_tile_key].sprite.height = TILE_SIZE;

        const x = parseInt(enviro_tile_key.split(",")[0]) * 32;
        const y = parseInt(enviro_tile_key.split(",")[1]) * 32;
        const xTex = (tilenum % 8) * TILE_SIZE;
        const yTex = Math.floor(tilenum / 8) * TILE_SIZE;
        console.log("xtex:" + xTex + ",ytex:" + yTex);

        enviro_tiles[enviro_tile_key].sprite.position.set(x, y);
        enviro_tiles[enviro_tile_key].sprite.texture = new PIXI.Texture(texture,
            new PIXI.Rectangle(xTex, yTex, TILE_SIZE, TILE_SIZE));
        enviro_tiles[enviro_tile_key].sprite.texture.update();

        texture_container.addChild(enviro_tiles[enviro_tile_key].sprite);
        
        enviro_tilenums[enviro_tile_key] = {"tilenum":tilenum, "sprite":null};
        enviro_tilenums[enviro_tile_key].sprite = new PIXI.Text(""+tilenum,{ fontFamily: "monospace", fontSize: 12, fill: 0xffffff, align: "center"});
        enviro_tilenums[enviro_tile_key].sprite.position.set(x-TILE_SIZE/2, y-TILE_SIZE/2);
        texture_container.addChild(enviro_tilenums[enviro_tile_key].sprite);
    }

    return true;
}

var has_loaded_enviro = false;

// Listen for animate update.
loader_app.ticker.add((delta) => {
    if (!has_loaded_enviro && enviro_string !== "") {
        has_loaded_enviro = LoadEnviro();
    }
});

// Environment ////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////