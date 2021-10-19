// main.js: Main program.

const canvas = document.getElementById("canvas");
const app = new PIXI.Application({
    width: WIDTH, height: HEIGHT,
    backgroundColor: 0x000000,
    resolution: window.devicePixelRatio || 1,
    view: canvas,
});

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

let content = new PIXI.Container();
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
app.stage.addChild(content);
content.addChild(G_draw_layers[0]);
G_draw_layers[0].addChild(G_graphics[0]);
content.addChild(G_draw_layers[1]);
G_draw_layers[1].addChild(G_graphics[1]);
content.addChild(G_draw_layers[2]);
G_draw_layers[2].addChild(G_graphics[2]);
content.addChild(G_draw_layers[3]);
G_draw_layers[3].addChild(G_graphics[3]);
content.addChild(G_draw_layers[4]);
G_draw_layers[4].addChild(G_graphics[4]);

let G_objs = {};

let G_keys = KEYS_INIT;

let G_pause = false;
let G_needs_update = false;
let G_loaded = false;
let G_actions = [];

function Init() {
    let stage = new MainMenu();
    G_objs["stage"] = stage;
    G_needs_update = true;
}

app.ticker.add((dT) => {
    if (G_pause == true) { return; }
    if (G_loaded == false) { Init(); G_loaded = true; }
    if (G_objs.hasOwnProperty("stage") == false) { return; }

    for (let k in G_objs) {
        G_objs[k].Update(dT);
    }
    
    // TODO: Track lurkers and lerpers for destroy-ing.

    // If some class set the global update value to true, redraw graphics.
    if (G_needs_update == true) {
        for (let i = 0; i < G_graphics.length; i++) {
            G_graphics[i].clear();
        }
        for (let k in G_objs) {
            G_objs[k].Draw();
        }
        G_needs_update = false;
    }

    while (G_actions.length > 0) {
        let act = G_actions[0];

        if (LOG_LEVEL >= LOG_LEVELS.INFO) {
            console.log("INFO: Global action " + act);
        }

        if (act == "load TestGame") {
            // Action: load TestGame.

            G_objs["stage"].Destroy();
            G_objs["stage"] = new TestGame();
            G_needs_update = true;

        }

        G_actions.splice(0, 1);
    }

});
