
const kWidth = window.innerWidth;
const kHeight = window.innerHeight;

const kDrawDebug = false;

const canvas = document.getElementById("canvas");
const app = new PIXI.Application({
    width: kWidth, height: kHeight,
    backgroundColor: 0x000000,
    resolution: window.devicePixelRatio || 1,
    view: canvas,
});

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

let G_content = new PIXI.Container();
let G_draw_layers = [];
G_draw_layers.push(new PIXI.Container()); // 0: Background.
G_draw_layers.push(new PIXI.Container()); // 1: Mid-Background.
G_draw_layers.push(new PIXI.Container()); // 2: Main stage layer.
G_draw_layers.push(new PIXI.Container()); // 3: Foreground.
G_draw_layers.push(new PIXI.Container()); // 4: UI.
let G_graphics = [];
G_graphics.push(new PIXI.Graphics()); // 0: Background Graphics.
G_graphics.push(new PIXI.Graphics()); // 1: Mid-Background Graphics.
G_graphics.push(new PIXI.Graphics()); // 2: Main stage Graphics.
G_graphics.push(new PIXI.Graphics()); // 3: Foreground Graphics.
G_graphics.push(new PIXI.Graphics()); // 4: UI Graphics.
app.stage.addChild(G_content);
G_content.addChild(G_draw_layers[0]);
G_draw_layers[0].addChild(G_graphics[0]);
G_content.addChild(G_draw_layers[1]);
G_draw_layers[1].addChild(G_graphics[1]);
G_content.addChild(G_draw_layers[2]);
G_draw_layers[2].addChild(G_graphics[2]);
G_content.addChild(G_draw_layers[3]);
G_draw_layers[3].addChild(G_graphics[3]);
G_content.addChild(G_draw_layers[4]);
G_draw_layers[4].addChild(G_graphics[4]);

let G_stage = null;

let G_pause = false;
let G_needs_update = false;
let G_loaded = false;
let G_actions = [];

// Will be used by runner.js to stop code from running for a reset.
let G_stop_for_reset = false;
let G_running = false;

let G_lerpers = {};
let G_lurkers = {};

function Init() {
    G_stage = new DebugStage();
    G_needs_update = true;

    PrintHelp();
}

let G_prev_tick = Date.now();

app.ticker.add(() => {
    if (G_pause == true) { return; }
    if (G_loaded == false) { Init(); G_loaded = true; }

    let now = Date.now();
    let dT = now - G_prev_tick;

    if (G_stage !== null) {
        G_stage.Update(dT);
    }

    for (let k in G_lerpers) {
        G_lerpers[k].Update(dT);
        if (G_lerpers[k].active === false) {
            delete G_lerpers[k];
        }
    }

    for (let k in G_lurkers) {
        G_lurkers[k].Update(dT);
        if (G_lerpers[k].active === false) {
            delete G_lerpers[k];
        }
    }

    // If some class set the global update value to true, redraw graphics.
    if (G_needs_update == true) {
        for (let i = 0; i < G_graphics.length; i++) {
            G_graphics[i].clear();
        }

        if (G_stage !== null) {
            G_stage.Draw();
        }

        G_needs_update = false;
    }

    while (G_actions.length > 0) {
        let act = G_actions[0];

        LogInfo("Global action " + act + ".");

        if (act.includes("load debug")) {
            // Action: load TestGame.

            let toks = act.split(",");
            G_objs["stage"].Destroy();
            delete G_objs["stage"];
            G_objs["stage"] = new GameStage("debug", toks[1], toks[2]);
            G_needs_update = true;

        }

        G_actions.splice(0, 1);
    }

    G_prev_tick = now;
});
