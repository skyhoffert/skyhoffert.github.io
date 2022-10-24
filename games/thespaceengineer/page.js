// PACK.SH : Sun Oct 23 21:52:52 EDT 2022
////////////////////////////////////////////////////////////////////////////////
// const.js: Constant values.

const THE_SPACE_ENGINEER_VERSION = 0.1;

const WIDTH = 900;
const HEIGHT = 600;

const LOG_LEVELS = {TRACE:5, DEBUG:4, INFO:3, WARN:2, ERROR:1, FATAL:0};
const LOG_LEVEL = LOG_LEVELS.TRACE;

const PI = 3.1415926;

const LAYER_BACKGROUND    = 0;
const LAYER_MIDBACKGROUND = 1;
const LAYER_MAINSTAGE     = 2;
const LAYER_FOREGROUND    = 3;
const LAYER_PREUI         = 4;
const LAYER_UI            = 5;

const KEYS_INIT = {
    "ArrowDown": {down:false, down_time:0},
    "ArrowUp": {down:false, down_time:0},
    "ArrowLeft": {down:false, down_time:0},
    "ArrowRight": {down:false, down_time:0},
    "Enter": {down:false, down_time:0},
    "Space": {down:false, down_time:0},
    "ControlLeft": {down:false, down_time:0},
    "ControlRight": {down:false, down_time:0},
    "ShiftLeft": {down:false, down_time:0},
    "ShiftRight": {down:false, down_time:0},
    "KeyA": {down:false, down_time:0},
    "KeyS": {down:false, down_time:0},
    "KeyD": {down:false, down_time:0},
    "KeyW": {down:false, down_time:0},
    "KeyQ": {down:false, down_time:0},
    "KeyR": {down:false, down_time:0},
    "Escape": {down:false, down_time:0},
};
////////////////////////////////////////////////////////////////////////////////
// util.js: Utility functions.

function Linspace(a,b,d,incl=true) {
    let t = [];
    const end = incl ? b : b-d;
    for (let i = a; i <= end; i += d) {
        t.push(i);
    }
    return t;
}

function Max(ar) {
    return Math.max.apply(Math, ar);
}

function Min(ar) {
    return Math.min.apply(Math, ar);
}

function Sigs(n, dig=3) {
    return Math.round(n * Math.pow(10, dig)) / Math.pow(10, dig);
}

function RandInt(l,h) {
    // Range = [l,h-1]
    return Math.floor(Math.random() * (h-l)) + l;
}

function RandID(len=6) {
    let result           = "";
    let characters       = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let charactersLength = characters.length;
    for (let i = 0; i < len; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function RandNormal(mu, sigma, nsamples=6){
    if(!sigma) sigma = 1;
    if(!mu) mu=0;

    var run_total = 0
    for(var i=0 ; i<nsamples ; i++){
       run_total += Math.random();
    }

    return sigma*(run_total - nsamples/2)/(nsamples/2) + mu;
}

function CapFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function Cot(v) { return 1 / Math.tan(v); }
function Sin(v) { return Math.sin(v); }
function Cos(v) { return Math.cos(v); }
function Csc(v) { return 1 / Math.sin(v); }
function Ln(v) { return Math.log(v) / Math.log(Math.E); }
function Sqr(v) { return Math.pow(v,2); }
function Sqrt(v) { return Math.sqrt(v); }
function Cube(v) { return Math.pow(v,3); }
function Fourth(v) { return Math.pow(v,4); }
function Exp(v) { return Math.exp(v); }
function Log10(v) { return Math.log10(v); }
function Pow(b,e) { return Math.pow(b, e); }
function Abs(v) { return Math.abs(v); }
function Round(v) { return Math.round(v); }

// Returns value "v" limited by "min" and "max".
function Clamp(v, min, max) {
    if (v < min) { return min; }
    if (v > max) { return max; }
    return v;
}

function FuzzyEquals(v1, v2, fuzz) {
    return Abs(v1 - v2) < fuzz;
}

function GameToPIXIX(x) {
    return GAME_LEFT + x * GAME_SCALE;
}

function GameToPIXIY(y) {
    return GAME_TOP + y * GAME_SCALE;
}

function Contains(x, y, rx, ry, rw, rh) {
    return x > rx - rw/2 && x < rx + rw/2 && y > ry - rh/2 && y < ry + rh/2;
}

function Log(msg) { LogDebug(msg); }

function LogFatal(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.FATAL) { console.log("FTL: "+msg); }
}

function LogError(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.ERROR) { console.log("ERR: "+msg); }
}

function LogWarn(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.WARN) { console.log("WRN: "+msg); }
}

function LogInfo(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.INFO) { console.log("INF: "+msg); }
}

function LogDebug(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.DEBUG) { console.log("DBG: "+msg); }
}

function LogTrace(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.TRACE) { console.log("TRC: "+msg); }
}

function Millis()
{
    return Date.now();
}
////////////////////////////////////////////////////////////////////////////////
// main.js: Main program.

const canvas = document.getElementById("canvas");
const app = new PIXI.Application({
    width: WIDTH, height: HEIGHT,
    backgroundColor: 0x000000,
    resolution: window.devicePixelRatio || 1,
    view: canvas,
});

document.getElementById("version").innerHTML = "v" + THE_SPACE_ENGINEER_VERSION;

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

let content = new PIXI.Container();
let G_draw_layers = [];
G_draw_layers.push(new PIXI.Container()); // 0: Background.
G_draw_layers.push(new PIXI.Container()); // 1: Mid-Background.
G_draw_layers.push(new PIXI.Container()); // 2: Main stage layer.
G_draw_layers.push(new PIXI.Container()); // 3: Foreground.
G_draw_layers.push(new PIXI.Container()); // 3: Pre-UI.
G_draw_layers.push(new PIXI.Container()); // 4: UI.
let G_graphics = [];
G_graphics.push(new PIXI.Graphics()); // 0: Background Graphics.
G_graphics.push(new PIXI.Graphics()); // 1: Mid-Background Graphics.
G_graphics.push(new PIXI.Graphics()); // 2: Main stage Graphics.
G_graphics.push(new PIXI.Graphics()); // 3: Foreground Graphics.
G_graphics.push(new PIXI.Graphics()); // 4: Pre-UI Graphics.
G_graphics.push(new PIXI.Graphics()); // 5: UI Graphics.
app.stage.addChild(content);
content.addChild(G_draw_layers[LAYER_BACKGROUND]);
G_draw_layers[LAYER_BACKGROUND].addChild(G_graphics[LAYER_BACKGROUND]);
content.addChild(G_draw_layers[LAYER_MIDBACKGROUND]);
G_draw_layers[LAYER_MIDBACKGROUND].addChild(G_graphics[LAYER_MIDBACKGROUND]);
content.addChild(G_draw_layers[LAYER_MAINSTAGE]);
G_draw_layers[LAYER_MAINSTAGE].addChild(G_graphics[LAYER_MAINSTAGE]);
content.addChild(G_draw_layers[LAYER_FOREGROUND]);
G_draw_layers[LAYER_FOREGROUND].addChild(G_graphics[LAYER_FOREGROUND]);
content.addChild(G_draw_layers[LAYER_PREUI]);
G_draw_layers[LAYER_PREUI].addChild(G_graphics[LAYER_PREUI]);
content.addChild(G_draw_layers[LAYER_UI]);
G_draw_layers[LAYER_UI].addChild(G_graphics[LAYER_UI]);

let G_cover_alpha = 1;

let G_stage = null;

let G_keys = KEYS_INIT;

let G_pause = false;
let G_needs_update = false;
let G_loaded = false;
let G_actions = [];

let G_last_update_time = Millis();

function Init()
{
    G_stage = new MainMenu();
    G_needs_update = true;
    G_loaded = true;
}

app.ticker.add(() => {
    if (G_pause == true) { return; }
    if (G_loaded == false) { Init(); }
    if (G_stage == null) { return; }

    let now = Millis();
    let dT = now - G_last_update_time;
    G_last_update_time = now;

    G_stage.Update(dT);

    // If some class set the global update value to true, redraw graphics.
    if (G_needs_update == true)
    {
        LogTrace("Graphics update.");

        for (let i = 0; i < G_graphics.length; i++)
        {
            G_graphics[i].clear();
        }
        
        G_graphics[LAYER_PREUI].beginFill(0x000000, G_cover_alpha);
        G_graphics[LAYER_PREUI].drawRect(0, 0, WIDTH, HEIGHT);

        G_stage.Draw();
        G_needs_update = false;
    }

    while (G_actions.length > 0)
    {
        let act = G_actions[0];

        LogInfo("Global action " + act + ".");

        if (act.includes("load debug"))
        {
            // Action: load debug stage.

            let toks = act.split(",");
            G_stage.Destroy();
            delete G_stage;
            G_stage = new DebugLevel();
            
            G_cover_alpha = 1;
            G_needs_update = true;
        }

        G_actions.splice(0, 1);
    }

});
////////////////////////////////////////////////////////////////////////////////
// entities.js: Entities.

class Entity
{
    constructor(a)
    {
        this.active = true;

        this.id = a.id;
        this.x = a.x;
        this.y = a.y;

        this.sprites = [];
        this.texts = [];
        this.textures = [];

        this.loaded = false;
    }

    AddSprite(a)
    {
        let id = a.id;
        let x = a.x;
        let y = a.y;
        let w = a.width;
        let h = a.height;
        let fname = "gfx/"+a.filename;
        let anc = {x:0.5, y:0.5};
        let dl = 2;

        if (a.hasOwnProperty("anchor_x")) { anc.x = a.anchor_x; }
        if (a.hasOwnProperty("anchor_y")) { anc.y = a.anchor_y; }
        if (a.hasOwnProperty("draw_layer")) { dl = a.draw_layer; }
        
        this.textures[fname] = PIXI.Texture.from(fname);

        let idx = this.sprites.push(new PIXI.Sprite(this.textures[fname])) - 1;
        this.sprites[idx].anchor.set(anc.x, anc.y);
        this.sprites[idx].position.set(x, y);
        this.sprites[idx].width = w;
        this.sprites[idx].height = h;
        this.sprites[idx].draw_layer = dl;
        G_draw_layers[dl].addChild(this.sprites[idx]);
    }

    AddText(a)
    {
        let id = a.id;
        let x = a.x;
        let y = a.y;
        let t = a.text;
        let ff = "monospace";
        let fs = 12;
        let fc = 0xffffff;
        let align = "center";
        let dl = LAYER_UI;

        if (a.hasOwnProperty("fontFamily")) { ff = a.fontFamily; }
        if (a.hasOwnProperty("fontSize")) { fs = a.fontSize;}
        if (a.hasOwnProperty("fill")) { fc = a.fill; }
        if (a.hasOwnProperty("align")) { align = a.align; }
        if (a.hasOwnProperty("draw_layer")) { dl = a.draw_layer; }

        let anc = {x:0.5, y:0.5};
        if (align == "left") { anc.x = 0; }
        else if (align == "right") { anc.x = 1; }

        this.texts[id] = new PIXI.Text(t, {
            fontFamily: ff, fontSize: fs, fill: fc, align: align,
        });
        this.texts[id].anchor.set(anc.x, anc.y);
        this.texts[id].position.set(x, y);
        this.texts[id].draw_layer = dl;
        G_draw_layers[dl].addChild(this.texts[id]);
    }

    Loaded()
    {
        let loaded = true;
        for (let k in this.textures) {
            if (k.loaded == false) {
                loaded = false;
                break;
            }
        }
        return loaded;
    }

    Destroy()
    {
        this.active = false;
        while (this.sprites.length > 0) {
            G_draw_layers[this.sprites[0].draw_layer].removeChild(this.sprites[0]);
            delete this.sprites[0];
            this.sprites.splice(0, 1);
        }
        for (let k in this.texts) {
            G_draw_layers[this.texts[k].draw_layer].removeChild(this.texts[k]);
            delete this.texts[k];
        }
        for (let k in this.textures) {
            this.textures[k].destroy();
            delete this.textures[k];
        }
    }

    Update(dT) {}
    Draw() {}
}

// Lerper is a cool class. It will call a callback and provide a value between
// 0 and 1 until the entire Lerp duration has completed. The callback can also
// optionally have a second parameter that is given as "true" on final call.
// Lerpers can also be drawn for debug purposes with the "d" function.
// Lerper is a "quasi-entity".
class Lerper
{
    constructor(dur, cb, d=function(){})
    {
        this.id = "lerper";
        this.dur = dur;
        this.cb = cb;
        this.d = d;
        this.elapsed = 0;
        this.active = true;
        this.vals = {good:false}; // Can hold additional values per lerper.
    }

    Destroy() {}

    Update(dT)
    {
        if (this.active == false) { return; }
        
        this.elapsed += dT;

        // On the final tick, call the callback with an argument of 1 = 100%.
        if (this.elapsed > this.dur) {
            this.cb(1, true);
            this.active = false;
            return;
        }

        this.cb(this.elapsed / this.dur, false);
    }

    Draw()
    {
        this.d();
    }
}

// Lurker is similar to lerper, but it will run continuously until the callback
// returns a value of "false". At that point it no longer calls the callback.
// Lurkers can also be drawn for debug with the "d" function.
// Lerper is a "quasi-entity".
class Lurker
{
    constructor(cb, d=function(){})
    {
        this.id = "lerper";
        this.cb = cb;
        this.d = d;
        this.elapsed = 0;
        this.active = true;
        this.vals = {good:false}; // Can hold additional values per lurker.
    }

    Destroy() {}

    Update(dT)
    {
        if (!this.active) { return; }

        this.elapsed += dT;

        this.active = this.cb(dT);
    }

    Draw()
    {
        this.d();
    }
}

class FloatyString extends Entity
{
    constructor(t, x, y)
    {
        super({id: "FloatyString,"+t, x, y});

        this.AddSprite({id: "letter", x:x, y:y, width:16, height:16, filename:"font/A.png"});

        this.c_y = y;
    }

    Update(dT)
    {
        super.Update(dT);

        for (let i = 0; i < this.sprites.length; i++)
        {
            this.sprites[i].y = this.c_y + 5*Sin(Millis()/500);
        }
    }
}
////////////////////////////////////////////////////////////////////////////////
// stages.js: Game stages. 

class Stage extends Entity
{
    constructor()
    {
        super({"id":"stage", "x":0, "y":0});
        this.active = true;

        this.lerpers = [];
        this.lurkers = [];

        this.objs = [];
    }

    Update(dT)
    {
        super.Update(dT);

        for (let i = 0; i < this.lerpers.length; i++)
        {
            this.lerpers[i].Update(dT);
            if (this.lerpers[i].active == false)
            {
                this.lerpers[i].Destroy();
                delete this.lerpers[i];
                this.lerpers.splice(i,1);
                i--;
            }
        }

        for (let i = 0; i < this.lurkers.length; i++)
        {
            this.lurkers[i].Update(dT);
            if (this.lurkers[i].active == false)
            {
                this.lurkers[i].Destroy();
                delete this.lurkers[i];
                this.lurkers.splice(i,1);
                i--;
            }
        }

        for (let i = 0; i < this.objs.length; i++)
        {
            this.objs[i].Update(dT);
            if (this.objs[i].active == false)
            {
                this.objs[i].Destroy();
                delete this.objs[i];
                this.objs.splice(i, 1);
                i--;
            }
        }
    }
    
    Loaded()
    {
        if (this.loaded == true) { return true; }

        for (let k in this.textures)
        {
            if (k.loaded == false)
            {
                return false;
            }
        }

        for (let i = 0; i < this.objs.length; i++)
        {
            if (this.objs[i].Loaded() == false)
            {
                return false;
            }
        }

        this.loaded = true;
        return true;
    }

    Reset() {}
}

class MainMenu extends Stage
{
    constructor()
    {
        super();

        this.menu_line_x = 200;
        this.menu_line_x_spacing = 10;
        this.menu_line_y = 100;
        this.menu_line_y_spacing = 100;
        this.menu_fontSize = 64;
        this.menu_num_items = 2;

        // Play menu item.
        this.AddText({id:"play", x: this.menu_line_x + this.menu_line_x_spacing,
            y: this.menu_line_y, text:"Play", fontSize: this.menu_fontSize,
            align:"left"});

        // About menu item.
        this.AddText({id:"about", x: this.menu_line_x + this.menu_line_x_spacing,
            y: this.menu_line_y + this.menu_line_y_spacing, text:"xyz",
            fontSize: this.menu_fontSize, align:"left"});

        // Menu pointer.
        this.AddText({id:"ptr", x: this.menu_line_x - this.menu_line_x_spacing,
            y: this.menu_line_y, text:">", fontSize: this.menu_fontSize,
            align:"right"});

        this.pointer = this.texts["ptr"];

        this.pointer_moved = false;
    }

    Update(dT)
    {
        super.Update(dT);

        if (this.active == false) { return; }

        if (G_keys.KeyQ.down)
        {
            // DEBUG KEY.
            G_actions.push("load debug,00,00");
            this.active = false;
        }
        else if (G_keys.KeyW.down || G_keys.ArrowUp.down)
        {
            if (this.pointer_moved == false && this.pointer.y > this.menu_line_y+1)
            {
                this.pointer_moved = true;
                this.pointer.y -= this.menu_line_y_spacing;
            }
        }
        else if (G_keys.KeyS.down || G_keys.ArrowDown.down)
        {
            if (this.pointer_moved == false && this.pointer.y < this.menu_line_y + (this.menu_line_y_spacing*(this.menu_num_items-1)))
            {
                this.pointer_moved = true;
                this.pointer.y += this.menu_line_y_spacing;
            }
        }
        else if (G_keys.Enter.down)
        {
            let item_number = Round((this.pointer.y - this.menu_line_y) / this.menu_line_y_spacing);
            if (item_number == 0)
            {
                this.active = false;
                G_actions.push("load debug,00,00");
            }
            else if (item_number == 1)
            {
                // TODO: other buttons.
            }
        }
        else
        {
            this.pointer_moved = false;
        }
    }
}

class DebugLevel extends Stage
{
    constructor()
    {
        super();

        // Play menu item.
        this.AddText({id:"debug", x: WIDTH/2,
            y: 100, text:"Debug Stage", fontSize: 24,
            align:"center", draw_layer: LAYER_MAINSTAGE});

        this.lerpers.push(new Lerper(1000, function (p, d)
        {
            if (d) 
            {
                G_stage.lerpers.push(new Lerper(250, function (p,d)
                {
                    G_cover_alpha = 1 - p;
                    G_needs_update = true;
                }));
            }
        }));

        this.objs.push(new FloatyString("A", WIDTH/2, HEIGHT/2));
    }

    Update(dT)
    {
        super.Update(dT);

        if (this.active == false) { return; }
    }
}
////////////////////////////////////////////////////////////////////////////////
// listeners.js: Interaction listeners.

document.addEventListener("keydown", function(evt)
{
    if (G_keys.hasOwnProperty(evt.key) == false)
    {
        G_keys[evt.code] = {down: true, time_down:Date.now(), time_up:0};
        return;
    }

    G_keys[evt.code].down = true;
    G_keys[evt.code].time_down = Date.now();
}, false);

document.addEventListener("keyup", function(evt)
{
    G_keys[evt.code].down = false;
    G_keys[evt.code].time_up = Date.now();
}, false);
////////////////////////////////////////////////////////////////////////////////
