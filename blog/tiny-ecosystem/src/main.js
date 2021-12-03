// main.js: Main program.

const canvas = document.getElementById("canvas");
const app = new PIXI.Application({
    width: WIDTH, height: HEIGHT,
    backgroundColor: 0x000000,
    resolution: window.devicePixelRatio || 1,
    view: canvas,
});

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

const G_content = new pixi_viewport.Viewport({
    screenWidth: WIDTH,
    screenHeight: HEIGHT,
    worldWidth: WIDTH,
    worldHeight: HEIGHT,
    interaction: app.renderer.plugins.interaction,
});

G_content.drag().pinch().wheel().decelerate();

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

let G_keys = KEYS_INIT;

let G_pause = false;
let G_needs_update = false;
let G_loaded = false;
let G_actions = [];

function Init() {
    G_stage = new MainMenu();
    G_needs_update = true;
}

app.ticker.add((dT) => {
    if (G_pause == true) { return; }
    if (G_loaded == false) { Init(); G_loaded = true; }
    if (G_stage == null) { return; }
    
    G_stage.Update(dT);
    
    // TODO: Track lurkers and lerpers for destroy-ing.

    // If some class set the global update value to true, redraw graphics.
    if (G_needs_update == true) {
        for (let i = 0; i < G_graphics.length; i++) {
            G_graphics[i].clear();
        }
        G_stage.Draw();
        G_needs_update = false;
    }

    while (G_actions.length > 0) {
        let act = G_actions[0];

        LogInfo("Global action " + act + ".");

        if (act.includes("load debug")) {
            // Action: load TestGame.

            G_stage.Destroy();
            delete G_stage;
            G_stage = new GameStage("debug");
            G_needs_update = true;

        }

        G_actions.splice(0, 1);
    }

});
