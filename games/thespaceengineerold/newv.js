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
var bolty = {
    x: 720/4,
    y: 720/4,
    size: 32,
    rot: 0.02
};

// Set scaling to NearestNeighbor to avoid blur.
PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
// Create the PIXI application.
const renderer = new PIXI.Renderer({
    view: canvas,
    width: 720,
    height: 720,
    backgroundColor: 0x666666
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

const boltTex = PIXI.Texture.from("gfx2/bolt.png");
const bolt = new PIXI.Sprite(boltTex);

bolt.width = bolty.size;
bolt.height = bolty.size;
bolt.x = bolty.x;
bolt.y = bolty.y;

bolt.anchor.x = 0.5;
bolt.anchor.y = 0.5;

stage.addChild(bolt);

const ticker = new PIXI.Ticker();
ticker.add(Update);
ticker.start();

function Collision() {
    if (guy.x - guy.width/2 < bolty.x &&
        guy.x + guy.width/2 > bolty.x &&
        guy.y - guy.height/2 < bolty.y &&
        guy.y + guy.height/2 > bolty.y) {
        stage.removeChild(bolt);
    }
}

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

    bolt.rotation += bolty.rot;

    Collision();

    renderer.render(stage);
}

document.addEventListener("keydown", function(evt) {
    keys[evt.key] = true;
}, false);

document.addEventListener("keyup", function(evt) {
    keys[evt.key] = false;
}, false);
