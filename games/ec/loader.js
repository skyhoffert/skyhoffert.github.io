// Sky Hoffert
// Loader for environment creation.

///////////////////////////////////////////////////////////////////////////////////////////////////
// Global /////////////////////////////////////////////////////////////////////////////////////////

const WIDTH_LOADER = window.innerWidth;
const HEIGHT_LOADER = window.innerHeight;

const loader_canvas = document.getElementById("loader-canvas");

const loader_input = document.getElementById("loader-input");
const loader_textarea = document.getElementById("loader-textarea");
const selectbox_texture = PIXI.Texture.from("images/selectbox.png");

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

// Disable right click menu.
loader_canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

let enviro_tiles = {};
let enviro_string = "";

let enviro_tilenums = {};

let texture = null;

let ui_buttons = [];

let TILE_SIZE = 0;

loader_textarea.addEventListener("keydown", function (evt) {
    if (evt.key === "Enter") {
        loader_input.style.display = "none";
        enviro_string = loader_textarea.value;
    }
}, false);

loader_canvas.addEventListener("mousedown", function (evt) {
    for (let i = 0; i < ui_buttons.length; i++) {
        ui_buttons[i].Click(evt.x, evt.y);
    }
}, false);

loader_canvas.addEventListener("mousemove", function (evt) {
    const sp = viewport.toWorld(evt.x, evt.y);

    sp.x += TILE_SIZE/2;
    sp.y += TILE_SIZE/2;

    sp.x = Math.floor(sp.x / 32);
    sp.y = Math.floor(sp.y / 32);

    sp.x = sp.x * 32;
    sp.y = sp.y * 32;

    selectbox_hover.position.set(sp.x, sp.y);
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

const texture_container = new PIXI.ParticleContainer();
const tilenum_container = new PIXI.Container();
viewport.addChild(texture_container);
viewport.addChild(tilenum_container);

tilenum_container.visible = false;

loader_app.stage.addChild(viewport);

viewport
    .drag({mouseButtons: "right"})
    .pinch()
    .decelerate()
    .wheel();

viewport.moveCenter(0,0);

/*
// Display which tile in selector is chosen.
const tile_text = new PIXI.Text("tile 0",{ fontFamily: "monospace", fontSize: 24, fill: 0xffffff, align: "center"});
tile_text.position.set(10, 44);
enviro_app.stage.addChild(tile_text);
*/

const selectbox_hover = new PIXI.Sprite(selectbox_texture);
selectbox_hover.anchor.set(0.5);
selectbox_hover.position.set(0, 0);
selectbox_hover.alpha = 0.8;
viewport.addChild(selectbox_hover);

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
        const enviro_tile_key = enviro_tile_dict_keys[i];
        const tilenum = enviro_tile_dict[enviro_tile_key];

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
        enviro_tilenums[enviro_tile_key].sprite.position.set(x, y);
        enviro_tilenums[enviro_tile_key].sprite.anchor.set(0.5);
        tilenum_container.addChild(enviro_tilenums[enviro_tile_key].sprite);
    }

    // DEBUG
    /*
    let anim_textures = [];
    for (let i = 0; i < 8; i++) {
        anim_textures.push(new PIXI.Texture(texture, new PIXI.Rectangle(i*32, 0, TILE_SIZE, TILE_SIZE)));
    }
    let animatedSprite = new PIXI.AnimatedSprite(anim_textures);
    animatedSprite.position.set(-20,-20);
    animatedSprite.width = 32;
    animatedSprite.height = 32;
    animatedSprite.anchor.set(0.5);
    animatedSprite.animationSpeed = 0.1;
    viewport.addChild(animatedSprite);
    console.log("val: " + animatedSprite.currentFrame);
    animatedSprite.play();
    console.log("val: " + animatedSprite.currentFrame);
    */

    ui_buttons.push(new ShowHideTilenumsButton("Show/Hide Tilenums", 160, 30));
    ui_buttons.push(new ShowHideWallsButton("Show/Hide Walls", 160, 80, ui_buttons[0].Width()));
    ui_buttons.push(new AddWallButton("Add Wall Type", 160, 130, ui_buttons[0].Width()));

    return true;
}

function GetTilenum(x,y) {
    const xt = Math.floor((x+16) / TILE_SIZE);
    const yt = Math.floor((y+16) / TILE_SIZE);
    const ts = "" + xt + "," + yt;
    
    console.log("Searching for " + ts);

    if (ts in enviro_tiles) {
        return enviro_tiles[ts].tilenum;
    }

    return -1;
}

let has_loaded_enviro = false;

// Listen for animate update.
loader_app.ticker.add((delta) => {
    if (!has_loaded_enviro && enviro_string !== "") {
        has_loaded_enviro = LoadEnviro();
    }
});

// Environment ////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
// Classes ////////////////////////////////////////////////////////////////////////////////////////

class Button {
    constructor(str,x,y,w=-1,h=-1) {
        this._bg = PIXI.Sprite.from(PIXI.Texture.WHITE);
        this._bg.tint = 0x101010;
        this._bg.anchor.set(0.5);
        this._bg.position.set(x, y);
        loader_app.stage.addChild(this._bg);

        this._text = new PIXI.Text(str, {fontFamily:"monospace", fontSize:24, fill:0xffffff, align:"center"});

        if (w === -1) {
            this._bg.width = this._text.width + 20;
        } else {
            this._bg.width = w;
        }

        if (h === -1) {
            this._bg.height = this._text.height + 20;
        } else {
            this._bg.height = h;
        }

        this._text.position.set(x, y);
        this._text.anchor.set(0.5);
        loader_app.stage.addChild(this._text);

        this._absorb_next_click = false;
    }

    Width() { return this._bg.width; }

    _ClickAction() {}
    _AbsorbedClickAction(x, y) {}

    Click(x, y) {
        const clicked = this._bg.containsPoint({x:x, y:y});

        if (this._absorb_next_click) {
            this._AbsorbedClickAction(x,y);
        }

        if (clicked) {
            this._ClickAction();
        }

        return clicked;
    }
}

class ShowHideWallsButton extends Button {
    constructor(str,x,y,w,h) {
        super(str,x,y,w,h);

        this._showingWalls = false;
    }

    _ClickAction() {
        this._showingWalls = !this._showingWalls;

        if (this._showingWalls) {
            console.log("showing walls.");
        } else {
            console.log("hiding walls.");
        }
    }
}

class ShowHideTilenumsButton extends Button {
    constructor(str,x,y,w,h) {
        super(str,x,y,w,h);

        this._showingTilenums = false;
    }

    _ClickAction() {
        this._showingTilenums = !this._showingTilenums;

        if (this._showingTilenums) {
            console.log("showing tilenums.");
            tilenum_container.visible = true;
        } else {
            console.log("hiding tilenums.");
            tilenum_container.visible = false;
        }
    }
}

class AddWallButton extends Button {
    constructor(str,x,y,w,h){
        super(str,x,y,w,h);
    }

    _ClickAction() {
        this._absorb_next_click = true;
    }

    _AbsorbedClickAction(x, y) {
        this._absorb_next_click = false;

        const wp = viewport.toWorld(x,y);

        const foundtile = GetTilenum(wp.x,wp.y);
        console.log("Adding wall with type: " + foundtile);
    }
}

class Environment {
    constructor() {
        this._tiles = {};
    }
}

// Classes ////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////