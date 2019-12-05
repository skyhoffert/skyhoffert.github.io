//
// Sky Hoffert
// Last Modified Dec 4, 2019
// new version of The Space Engineer
//

var keys = {};
const canvas = document.getElementById("canvas");

// DEV
var player = {
    flipRdy: true,
    mvR: true,
    size: 64
};

// Set scaling to NearestNeighbor to avoid blur.
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
// Create the PIXI application.
const renderer = new PIXI.Renderer({
    view: canvas,
    width: window.innerWidth,
    height: window.innerHeight
});
const stage = new PIXI.Container();

const guyTex = PIXI.Texture.from("gfx2/still_1.png");
const guy = new PIXI.Sprite(guyTex);

guy.width = player.size;
guy.height = player.size;
guy.x = renderer.width / 2;
guy.y = renderer.height / 2;

// Anchor at center of guy.
guy.anchor.x = 0.5;
guy.anchor.y = 0.5;

stage.addChild(guy);

const ticker = new PIXI.Ticker();
ticker.add(Update);
ticker.start();

function Update() {
    if (keys["a"]) {
        guy.x -= 4;
        if (player.mvR) {
            guy.scale.x = -guy.scale.x;
            player.mvR = false;
        }
    } else if (keys["d"]) {
        guy.x += 4;
        if (!player.mvR) {
            guy.scale.x = -guy.scale.x;
            player.mvR = true;
        }
    }
    if (keys["w"]) {
        guy.y -= 4;
    } else if (keys["s"]) {
        guy.y += 4;
    }
    
    if (player.flipRdy) {
        if (keys[" "]) {
            guy.height = -guy.height;
            player.flipRdy = false;
        }
    } else {
        if (!keys[" "]) {
            player.flipRdy = true;
        }
    }

    renderer.render(stage);
}

document.addEventListener("keydown", function(evt) {
    keys[evt.key] = true;
}, false);

document.addEventListener("keyup", function(evt) {
    keys[evt.key] = false;
}, false);
