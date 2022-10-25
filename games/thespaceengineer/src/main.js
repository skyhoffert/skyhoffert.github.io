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
