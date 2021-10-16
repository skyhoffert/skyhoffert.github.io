// main.js: Main program.

const canvas = document.getElementById("canvas");
const app = new PIXI.Application({
    width: WIDTH, height: HEIGHT,
    backgroundColor: 0x194180,
    resolution: window.devicePixelRatio || 1,
    view: canvas,
});

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

const content = new PIXI.Container();
const graphics = new PIXI.Graphics();
app.stage.addChild(content);
content.addChild(graphics);

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

    if (needs_update == true) {
        graphics.clear();
        for (let k in global_objs) {
            global_objs[k].Draw(graphics);
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
