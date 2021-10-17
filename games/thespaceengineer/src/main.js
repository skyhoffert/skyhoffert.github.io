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
let draw_layers = [];
draw_layers.push(new PIXI.Container()); // 0: Background.
draw_layers.push(new PIXI.Container()); // 1: Mid-Background.
draw_layers.push(new PIXI.Container()); // 2: Main stage layer.
draw_layers.push(new PIXI.Container()); // 3: Foreground.
draw_layers.push(new PIXI.Container()); // 4: UI.
let graphics = [];
graphics.push(new PIXI.Graphics()); // 0: Background Graphics.
graphics.push(new PIXI.Graphics()); // 1: Mid-Background Graphics.
graphics.push(new PIXI.Graphics()); // 2: Main stage Graphics.
graphics.push(new PIXI.Graphics()); // 3: Foreground Graphics.
graphics.push(new PIXI.Graphics()); // 4: UI Graphics.
app.stage.addChild(content);
content.addChild(draw_layers[0]);
draw_layers[0].addChild(graphics[0]);
content.addChild(draw_layers[1]);
draw_layers[1].addChild(graphics[1]);
content.addChild(draw_layers[2]);
draw_layers[2].addChild(graphics[2]);
content.addChild(draw_layers[3]);
draw_layers[3].addChild(graphics[3]);
content.addChild(draw_layers[4]);
draw_layers[4].addChild(graphics[4]);

let global_objs = {};

let pause = false;
let needs_update = false;
let loaded = false;
let global_actions = [];

function Init() {
    let stage = new MainMenu();
    global_objs["stage"] = stage;
    needs_update = true;
}

app.ticker.add((dT) => {
    if (pause == true) { return; }
    if (loaded == false) { Init(); loaded = true; }
    if (global_objs.hasOwnProperty("stage") == false) { return; }

    for (let k in global_objs) {
        global_objs[k].Update(dT);
    }
    
    // TODO: Track lurkers and lerpers for destroy-ing.

    if (needs_update == true) {
        for (let i = 0; i < graphics.length; i++) {
            graphics[i].clear();
        }
        for (let k in global_objs) {
            global_objs[k].Draw();
        }
        needs_update = false;
    }

    while (global_actions.length > 0) {
        let act = global_actions[0];

        if (LOG_LEVEL >= LOG_LEVELS.INFO) {
            console.log("INFO: Global action " + act);
        }

        if (act == "load TestGame") {
            // Action: load TestGame.

            global_objs["stage"].Destroy();
            global_objs["stage"] = new TestGame();
            needs_update = true;

        }

        global_actions.splice(0, 1);
    }

});
