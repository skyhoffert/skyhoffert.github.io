// Sky Hoffert

const WIDTH = 1000;
const HEIGHT = 750;

const PI = 3.1415926;

const canvas = document.getElementById("canvas");
const app = new PIXI.Application({
    width: WIDTH, height: HEIGHT,
    backgroundColor: 0x0000ff,
    resolution: window.devicePixelRatio || 1,
    view: canvas,
});

const content = new PIXI.Container();
const graphics = new PIXI.Graphics();
app.stage.addChild(content);
content.addChild(graphics);

let objs = {};

class NN_Node {
    constructor(id="") {
        this.id = id;
        console.log("Node added with ID " + this.id);

        this.targets = [];
        this.links = {};

        this.value = 0; // [0, 1]

        this.weights = {};

        this.bias = 0;
        if (this.id[0] != "0") {
            this.bias = Math.random();
        }
    }

    LinkTarget(id) {
        // Point to target id.
        this.targets.push(id);
    }

    LinkSource(id) {
        // Receive from id.
        this.links[id] = 0;
        this.weights[id] = (Math.random()*2)-1;
    }

    Process() {
        if (this.id[0] == "0") { return; }
        this.value = this.bias;
        for (let id in this.links) {
            this.value += objs["nn"].NodeAt(id).value * this.weights[id];
        }
        this.value = NNLimitFunc(this.value);
    }

    ReceiveValFrom(v,id) {
        this.links[id] = v;
    }
}

class NN {
    constructor() {
        this.active = false;

        this.x = WIDTH/4;
        this.y = 10;

        this.ids = [];
        this.nLayers = RandInt(3,6);
        this.layers = [];
        this.heights = [];
        
        this.layers_min = 2;
        this.layers_max = 5;

        // Create the network here.
        for (let layer = 0; layer < this.nLayers; layer++) {
            this.layers.push([]);
            if (layer == 0) { this.heights.push(2); }
            else if (layer == this.nLayers-1) { this.heights.push(2); }
            else { this.heights.push(RandInt(this.layers_min, this.layers_max+1)); }
            for (let node = 0; node < this.heights[layer]; node++) {
                let id = "" + layer + node;
                this.ids.push(id);
                this.layers[layer].push(new NN_Node(id));
            }
        }

        // Link all nodes here.
        for (let layer = 0; layer < this.nLayers-1; layer++) {
            for (let node = 0; node < this.heights[layer]; node++) {
                let source = this.layers[layer][node];
                for (let i = 0; i < this.layers[layer+1].length; i++) {
                    let target = this.layers[layer+1][i];
                    source.LinkTarget(target.id);
                    target.LinkSource(source.id);
                }
            }
        }

        let final_layer = this.layers.length-1;
        this.final_nodes = [this.layers[final_layer][0], this.layers[final_layer][1]]
    }

    SetInputs(ins) {
        this.layers[0][0].value = ins[0];
        this.layers[0][1].value = ins[1];
    }

    GetOutputs() {
        return [this.final_nodes[0].value, this.final_nodes[1].value];
    }

    NodeAt(id) {
        let layer = parseInt(id[0]);
        let node = parseInt(id[1]);
        return this.layers[layer][node];
    }

    Update(dT) {
        if (this.active == false) { return; }

        for (let layer = 0; layer < this.nLayers; layer++) {
            for (let node = 0; node < this.heights[layer]; node++) {
                this.layers[layer][node].Process();
            }
        }
    }

    Destroy() {
        for (let k in this.imgs) {
            content.removeChild(this.imgs[k]);
            this.imgs[k] = null;
        }
        for (let k in this.texts) {
            content.removeChild(this.texts[k]);
            this.texts[k] = null;
        }
    }

    Draw() {
        let rad = 5;
        let x_spacing = 35;
        let y_spacing = 35;

        for (let l = 0; l < this.layers.length; l++) {
            for (let n = 0; n < this.layers[l].length; n++) {
                let x = this.x + l*x_spacing;
                let y = this.y + n*y_spacing;

                // First, draw links.
                for (let t = 0; t < this.layers[l][n].targets.length; t++) {
                    let id_l = parseInt(this.layers[l][n].targets[t][0]);
                    let id_n = parseInt(this.layers[l][n].targets[t][1]);
                    let weight = this.layers[id_l][id_n].weights[this.layers[l][n].id];
                    graphics.lineStyle(3,WeightToHex(weight));
                    graphics.moveTo(x,y);
                    graphics.lineTo(this.x + id_l*x_spacing, this.y + id_n*y_spacing);
                }

                // Then, draw node overtop.
                graphics.lineStyle(0,0);
                graphics.beginFill(WeightToHex(this.layers[l][n].value));
                graphics.arc(x, y, rad, 0, 2*PI);
                graphics.endFill();
            }
        }
    }
}

class Game {
    constructor() {
        this.imgs = {};
        this.texts = {};

        this.active = false;

        this.tree_spawn = WIDTH*5/4;
        this.dino_spawn = WIDTH/4;
        this.max_separation = this.tree_spawn - this.dino_spawn;

        this.score = 0;

        this.textures = {};
        this.textures.dino_regular = PIXI.Texture.from("images/dino.png");
        this.textures.dino_ducking = PIXI.Texture.from("images/dino_duck.png");

        this.imgs.dino = new PIXI.Sprite(this.textures.dino_regular);
        this.imgs.dino.anchor.set(0.5);
        this.imgs.dino.position.set(this.dino_spawn, HEIGHT/2);
        this.imgs.dino.width = 32;
        this.imgs.dino.height = 32;
        content.addChild(this.imgs.dino);

        this.imgs.tree = new PIXI.Sprite(PIXI.Texture.from("images/tree.png"));
        this.imgs.tree.anchor.set(0.5);
        this.imgs.tree.position.set(this.tree_spawn, HEIGHT/2);
        this.imgs.tree.width = 32;
        this.imgs.tree.height = 32;
        content.addChild(this.imgs.tree);
        
        this.texts.lbl_score = new PIXI.Text("Score:", {
            fontFamily: "Verdana", fontSize: 36, fill: 0xffffff, align: "right",
        });
        this.texts.lbl_score.anchor.set(1,0.5);
        this.texts.lbl_score.position.set(WIDTH*3/4, 20);
        content.addChild(this.texts.lbl_score);

        this.texts.score = new PIXI.Text("0", {
            fontFamily: "Verdana", fontSize: 36, fill: 0xffffff, align: "left",
        });
        this.texts.score.anchor.set(0,0.5);
        this.texts.score.position.set(WIDTH*3/4, 20);
        content.addChild(this.texts.score);

        this.action_up = false;
        this.action_down = false;

        this.dino_state = "standing"; // one of "standing", "ducking", or "jumping".
        this.dino_vely = 0;
        this.dino_jump_time = 0;
        this.dino_jump_duration = 200;
    }

    Reset() {
        this.dino_state = "standing";
        this.dino_vely = 0;
        this.imgs.tree.x = this.tree_spawn;
        this.score = 0;
        this.imgs.dino.y = HEIGHT/2;
        objs["nn"] = new NN();
    }

    DinoJump() {
        this.dino_state = "jumping";
        this.dino_vely = -6;
        this.imgs.dino.y -= 4;
        this.dino_jump_time = Date.now();
    }

    DinoStateVal() {
        if (this.dino_state == "standing") { return 0; }
        if (this.dino_state == "ducking") { return 0.5; }
        if (this.dino_state == "jumping") { return 1; }
        return -1;
    }

    Update(dT) {
        if (this.active == false) { return; }

        this.score += dT;
        this.texts.score.text = ""+parseInt(this.score);

        this.imgs.tree.x -= 5 * dT;

        if (this.imgs.tree.x < -WIDTH/4) {
            this.imgs.tree.x = WIDTH*5/4;
        }

        let dist = this.imgs.tree.x - this.imgs.dino.x;
        if (dist < 0) { dist = this.max_separation; }
        let v = Clamp(dist / this.max_separation, 0, 1);
        objs["nn"].SetInputs([v, this.DinoStateVal()]);
        objs["nn"].Update(dT);

        if (objs["nn"].active) {
            let outputs = objs["nn"].GetOutputs();
            this.action_up = outputs[0] > 0;
            this.action_down = outputs[1] > 0;
        }

        if (this.imgs.dino.x > this.imgs.tree.x - this.imgs.tree.width/2 &&
                this.imgs.dino.x < this.imgs.tree.x + this.imgs.tree.width/2 &&
                this.imgs.dino.y > this.imgs.tree.y - this.imgs.tree.height/2 &&
                this.imgs.dino.y < this.imgs.tree.y + this.imgs.tree.height/2) {
            // Lose.
            this.Reset();
            return;
        }

        // Dino state machine.
        if (this.dino_state == "standing") {
            // State = standing.

            if (this.action_up) {
                this.DinoJump();
            } else if (this.action_down) {
                this.dino_state = "ducking";
                this.imgs.dino.texture = this.textures.dino_ducking;
            }

        } else if (this.dino_state == "jumping") {
            // State = jumping.

            this.imgs.dino.y += this.dino_vely * dT;

            if (Date.now() - this.dino_jump_time < this.dino_jump_duration && this.action_up) {
            } else {
                this.dino_vely += 0.5;
            }

            if (this.action_down) {
                this.dino_vely += 0.3;
                this.imgs.dino.y += 1;
            }

            if (this.imgs.dino.y > HEIGHT/2) {
                this.imgs.dino.y = HEIGHT/2;
                this.dino_state = "standing";
            }

        } else if (this.dino_state == "ducking") {
            // State = ducking.

            if (this.action_up) {
                this.DinoJump();
                this.imgs.dino.texture = this.textures.dino_regular;
            } else if (this.action_down == false) {
                this.dino_state = "standing";
                this.imgs.dino.texture = this.textures.dino_regular;
            }
        }
    }

    Destroy() {
        for (let k in this.imgs) {
            content.removeChild(this.imgs[k]);
            this.imgs[k] = null;
        }
        for (let k in this.texts) {
            content.removeChild(this.texts[k]);
            this.texts[k] = null;
        }
    }

    Draw() {
        // Background.
        graphics.lineStyle(0,0);
        graphics.beginFill(0x000000);
        graphics.drawRect(0, 0, WIDTH, HEIGHT);
        graphics.endFill();

        // Ground.
        graphics.lineStyle(2, 0x888888);
        graphics.beginFill(0x444444);
        graphics.drawRect(0, HEIGHT/2+20, WIDTH, HEIGHT/2);
        graphics.endFill();

        // Vertical line for output display.
        graphics.moveTo(this.imgs.dino.x - 20, this.imgs.dino.y - 40);
        graphics.lineTo(this.imgs.dino.x - 20, this.imgs.dino.y - 80);

        // Arrow for up/down actions.
        if (this.action_up) {
            graphics.moveTo(this.imgs.dino.x - 20, this.imgs.dino.y - 80);
            graphics.lineTo(this.imgs.dino.x - 30, this.imgs.dino.y - 70);
            graphics.moveTo(this.imgs.dino.x - 20, this.imgs.dino.y - 80);
            graphics.lineTo(this.imgs.dino.x - 10, this.imgs.dino.y - 70);
        }
        if (this.action_down) {
            graphics.moveTo(this.imgs.dino.x - 20, this.imgs.dino.y - 40);
            graphics.lineTo(this.imgs.dino.x - 30, this.imgs.dino.y - 50);
            graphics.moveTo(this.imgs.dino.x - 20, this.imgs.dino.y - 40);
            graphics.lineTo(this.imgs.dino.x - 10, this.imgs.dino.y - 50);
        }
    }
}

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
    return Math.floor(Math.random() * (h-l)) + l;
}
function RandID(len=6) {
    let result           = '';
    let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < len; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
function WeightToHex(w) {
    if (w < -0.667) { return 0x0000ff; }
    if (w < -0.333) { return 0x00ffff; }
    if (w < 0.333) { return 0xff0000; }
    if (w < 0.667) { return 0xffff00; }
    return 0x00ff00;
}
function NNLimitFunc(v) {
    if (v > 1) {
        return 1;
    }
    if (v < -1) {
        return -1;
    }
    return v;
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

function Clamp(v, min, max) {
    if (v < min) { return min; }
    if (v > max) { return max; }
    return v;
}

let update = false;

function Init(){
    objs["game"] = new Game();
    objs["nn"] = new NN();
}

app.ticker.add((dT) => {
    graphics.clear();

    objs["game"].Update(dT);

    for (let k in objs) {
        objs[k].Draw();
    }
});

document.addEventListener("keydown", function(evt) {
    if (evt.key == 'g') {
        // Key: 'g'
        // Action: Activate game.

        objs["game"].active = true;
        objs["nn"].active = true;
    
    } else if (evt.key == 'h') {
        // Key: 'h'
        // Action: Activate manual mode.

        objs["game"].active = true;
    
    } else if (evt.key == 'w') {
        // Key: 'w'
        // Action: Jump!

        objs["game"].action_up = true;

    } else if (evt.key == 's') {
        // Key: 's'
        // Action: Duck.

        objs["game"].action_down = true;

    } else if (evt.key == 'm') {
        // Key: 'm'
        // Action: Debug.

        console.log(RandID());

    }
}, false);

document.addEventListener("keyup", function(evt) {
    if (evt.key == 'w') {
        // Key: 'w'
        // Action: Release jump.

        objs["game"].action_up = false;

    } else if (evt.key == 's') {
        // Key: 's'
        // Action: Release duck.

        objs["game"].action_down = false;

    }
}, false);

Init();
