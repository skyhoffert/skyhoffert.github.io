// Sky Hoffert

const WIDTH = 1200;
const HEIGHT = 800;

const canvas = document.getElementById("canvas");
const app = new PIXI.Application({
    width: WIDTH, height: HEIGHT,
    backgroundColor: 0x000000,
    resolution: window.devicePixelRatio || 1,
    view: canvas,
});

const content = new PIXI.Container();
const graphics = new PIXI.Graphics();
app.stage.addChild(content);
content.addChild(graphics);

const output_value = document.getElementById("output-value");

let objs = {};

class Mouse {
    constructor() {
        this.x = 0;
        this.y = 0;
    }

    MoveTo(pos) {
        this.x = pos.x;
        this.y = pos.y;
    }

    Log() {
        console.log("x=" + Sigs(this.x,0) + ", y=" + Sigs(this.y,0));
    }
}

class Waveguide {
    constructor() {
        this.texts = {
            a:null, b:null, d:null
        };
        
        this.texts.a = new PIXI.Text("a", {
            fontFamily: "Verdana", fontSize: 36, fill: 0xffffff, align: "center",
        });
        this.texts.a.anchor.set(0.5,1);
        this.texts.a.position.set(WIDTH/2, HEIGHT/4-30);
        content.addChild(this.texts.a);
        
        this.texts.b = new PIXI.Text("b", {
            fontFamily: "Verdana", fontSize: 36, fill: 0xffffff, align: "center",
        });
        this.texts.b.anchor.set(1,0);
        this.texts.b.position.set(WIDTH/4-40, HEIGHT/2);
        content.addChild(this.texts.b);
        
        this.texts.d = new PIXI.Text("d", {
            fontFamily: "Verdana", fontSize: 36, fill: 0xffffff, align: "center",
        });
        this.texts.d.anchor.set(0.5,0);
        this.texts.d.position.set(WIDTH/2, HEIGHT*3/4+30);
        content.addChild(this.texts.d);

        this.a = 0;
        this.b = 0;
        this.f = 0;
        this.iris_type = "symmetric-inductive-iris";
        this.d = 0;
        this.output_value = 0;
        this.c = 3e8;
        this.pi = 3.1415926;

        this.dim_thick = 2;
        this.dim_fill = 0xbbbbbb;
    }

    Update(a,b,f,i,d) {
        this.a = parseFloat(a) * 1e-3; // m
        this.b = parseFloat(b) * 1e-3; // m
        this.f = parseFloat(f) * 1e9; // Hz
        this.iris_type = i;
        this.d = parseFloat(d) * 1e-3; // m

        this.lambda_guide = this.c / (this.f * Sqrt(1-Sqr(this.c/(2*this.a*this.f))));
        this.k = 2*this.pi / (this.c/this.f);

        if (this.iris_type == "symmetric-inductive-iris") {
            let tmp0 = -this.lambda_guide / this.a;
            let tmp1 = Sqr(Cot(this.pi*this.d/(2*this.a)));
            let tmp2 = 1 + ((Sqrt(Sqr(3*this.pi) - Sqr(this.k*this.a)) - 3*this.pi) / (4*this.pi)) * Sqr(Sin(this.pi*this.d/this.a));
            this.output_value = tmp0 * tmp1 * tmp2;
        } else if (this.iris_type == "asymmetric-inductive-iris") {
            let tmp0 = -this.lambda_guide / this.a;
            let tmp1 = Sqr(Cot(this.pi*this.d/(2*this.a)));
            let tmp2 = 1 + Sqr(Csc(this.pi*this.d/(2*this.a)));
            this.output_value = tmp0 * tmp1 * tmp2;
        } else if (this.iris_type == "circular-inductive-aperture") {
            let tmp0 = - 3 / (16*this.pi);
            let tmp1 = this.a * this.b * this.lambda_guide / Cube(this.d/2);
            this.output_value = tmp0 * tmp1;
        } else if (this.iris_type == "symmetric-capacitive-iris") {
            let tmp0 = 4*this.b/this.lambda_guide;
            let tmp1 = Ln(Csc(this.pi*this.d/(2*this.b)));
            let tmp2 = 1/Sqrt(1-Sqr(this.b/this.lambda_guide)) - 1;
            let tmp3 = Fourth(Cos(this.pi*this.d/(2*this.b)));
            this.output_value = tmp0 * (tmp1 + tmp2 * tmp3);
        } else if (this.iris_type == "asymmetric-capacitive-iris") {
            let tmp0 = 8*this.b/this.lambda_guide;
            let tmp1 = Ln(Csc(this.pi*this.d/(2*this.b)));
            let tmp2 = 1/Sqrt(1-Sqr(2*this.b/this.lambda_guide)) - 1;
            let tmp3 = Fourth(Cos(this.pi*this.d/(2*this.b)));
            this.output_value = tmp0 * (tmp1 + tmp2 * tmp3);
        }

        output_value.innerHTML = ""+Sigs(this.output_value);
    }

    Destroy() {
        for (let k in this.texts) {
            content.removeChild(this.texts[k]);
            this.texts[k] = null;
        }
    }

    Draw() {
        graphics.lineStyle(0,0);
        graphics.beginFill(0x100005);
        graphics.drawRect(WIDTH/4,HEIGHT/4,WIDTH/2,HEIGHT/2);
        graphics.endFill();

        // TODO: draw iris, depending on which is selected.
        if (this.iris_type == "symmetric-inductive-iris") {
            graphics.lineStyle(0,0);
            graphics.beginFill(0xd17d08, 0.6);
            graphics.drawRect(WIDTH/4, HEIGHT/4, WIDTH/6, HEIGHT/2);
            graphics.drawRect(WIDTH*3/4-WIDTH/6, HEIGHT/4, WIDTH/6, HEIGHT/2);
            graphics.endFill();
            
            graphics.lineStyle(this.dim_thick,this.dim_fill);
            graphics.moveTo(WIDTH/4+WIDTH/6, HEIGHT*3/4+10);
            graphics.lineTo(WIDTH/4+WIDTH/6, HEIGHT*3/4+50);
            graphics.moveTo(WIDTH*3/4-WIDTH/6, HEIGHT*3/4+10);
            graphics.lineTo(WIDTH*3/4-WIDTH/6, HEIGHT*3/4+50);
            graphics.moveTo(WIDTH/4+WIDTH/6, HEIGHT*3/4+30);
            graphics.lineTo(WIDTH*3/4-WIDTH/6, HEIGHT*3/4+30);

            this.texts.d.anchor.set(0.5,0);
            this.texts.d.position.set(WIDTH/2, HEIGHT*3/4+30);
        } else if (this.iris_type == "asymmetric-inductive-iris") {
            graphics.lineStyle(0,0);
            graphics.beginFill(0xd17d08, 0.6);
            graphics.drawRect(WIDTH/4, HEIGHT/4, WIDTH/6, HEIGHT/2);
            graphics.endFill();
            
            graphics.lineStyle(this.dim_thick,this.dim_fill);
            graphics.moveTo(WIDTH/4+WIDTH/6, HEIGHT*3/4+10);
            graphics.lineTo(WIDTH/4+WIDTH/6, HEIGHT*3/4+50);
            graphics.moveTo(WIDTH*3/4, HEIGHT*3/4+10);
            graphics.lineTo(WIDTH*3/4, HEIGHT*3/4+50);
            graphics.moveTo(WIDTH/4+WIDTH/6, HEIGHT*3/4+30);
            graphics.lineTo(WIDTH*3/4, HEIGHT*3/4+30);

            this.texts.d.anchor.set(0.5,0);
            this.texts.d.position.set((WIDTH/4+WIDTH/6+WIDTH*3/4)/2, HEIGHT*3/4+30);
        } else if (this.iris_type == "circular-inductive-aperture") {
            graphics.lineStyle(0,0);
            graphics.beginFill(0xd17d08, 0.6);
            graphics.drawRect(WIDTH/4, HEIGHT/4, WIDTH/2, HEIGHT/2);
            graphics.endFill();
            graphics.beginFill(0x100005);
            graphics.drawCircle(WIDTH/2,HEIGHT/2,HEIGHT/8);
            graphics.endFill();
            
            graphics.lineStyle(this.dim_thick,this.dim_fill);
            graphics.moveTo(WIDTH/4+WIDTH/6, HEIGHT*3/4+10);
            graphics.lineTo(WIDTH/4+WIDTH/6, HEIGHT*3/4+50);
            graphics.moveTo(WIDTH*3/4-WIDTH/6, HEIGHT*3/4+10);
            graphics.lineTo(WIDTH*3/4-WIDTH/6, HEIGHT*3/4+50);
            graphics.moveTo(WIDTH/4+WIDTH/6, HEIGHT*3/4+30);
            graphics.lineTo(WIDTH*3/4-WIDTH/6, HEIGHT*3/4+30);

            this.texts.d.anchor.set(0.5,0);
            this.texts.d.position.set(WIDTH/2, HEIGHT*3/4+30);
        } else if (this.iris_type == "symmetric-capacitive-iris") {
            graphics.lineStyle(0,0);
            graphics.beginFill(0xd17d08, 0.6);
            graphics.drawRect(WIDTH/4, HEIGHT/4, WIDTH/2, HEIGHT/6);
            graphics.drawRect(WIDTH/4, HEIGHT*3/4-HEIGHT/6, WIDTH/2, HEIGHT/6);
            graphics.endFill();
            
            graphics.lineStyle(this.dim_thick,this.dim_fill);
            graphics.moveTo(WIDTH*3/4+10, HEIGHT/4+HEIGHT/6);
            graphics.lineTo(WIDTH*3/4+50, HEIGHT/4+HEIGHT/6);
            graphics.moveTo(WIDTH*3/4+10, HEIGHT*3/4-HEIGHT/6);
            graphics.lineTo(WIDTH*3/4+50, HEIGHT*3/4-HEIGHT/6);
            graphics.moveTo(WIDTH*3/4+30, HEIGHT/4+HEIGHT/6);
            graphics.lineTo(WIDTH*3/4+30, HEIGHT*3/4-HEIGHT/6);

            this.texts.d.anchor.set(0,0.5);
            this.texts.d.position.set(WIDTH*3/4+40, HEIGHT/2);
        } else if (this.iris_type == "asymmetric-capacitive-iris") {
            graphics.lineStyle(0,0);
            graphics.beginFill(0xd17d08, 0.6);
            graphics.drawRect(WIDTH/4, HEIGHT/4, WIDTH/2, HEIGHT/6);
            graphics.endFill();
            
            graphics.lineStyle(this.dim_thick,this.dim_fill);
            graphics.moveTo(WIDTH*3/4+10, HEIGHT/4+HEIGHT/6);
            graphics.lineTo(WIDTH*3/4+50, HEIGHT/4+HEIGHT/6);
            graphics.moveTo(WIDTH*3/4+10, HEIGHT*3/4);
            graphics.lineTo(WIDTH*3/4+50, HEIGHT*3/4);
            graphics.moveTo(WIDTH*3/4+30, HEIGHT/4+HEIGHT/6);
            graphics.lineTo(WIDTH*3/4+30, HEIGHT*3/4);

            this.texts.d.anchor.set(0,0.5);
            this.texts.d.position.set(WIDTH*3/4+40, (HEIGHT/4+HEIGHT/6+HEIGHT*3/4)/2);
        }

        // Waveguide outer.
        graphics.lineStyle(16, 0xbb5599);
        graphics.drawRect(WIDTH/4,HEIGHT/4,WIDTH/2,HEIGHT/2);

        // "a" dimension.
        graphics.lineStyle(this.dim_thick,this.dim_fill);
        graphics.moveTo(WIDTH/4, HEIGHT/4-50);
        graphics.lineTo(WIDTH/4, HEIGHT/4-10);
        graphics.moveTo(WIDTH*3/4, HEIGHT/4-50);
        graphics.lineTo(WIDTH*3/4, HEIGHT/4-10);
        graphics.moveTo(WIDTH/4, HEIGHT/4-30);
        graphics.lineTo(WIDTH*3/4, HEIGHT/4-30);

        // "b" dimension.
        graphics.lineStyle(this.dim_thick,this.dim_fill);
        graphics.moveTo(WIDTH/4-50, HEIGHT/4);
        graphics.lineTo(WIDTH/4-10, HEIGHT/4);
        graphics.moveTo(WIDTH/4-50, HEIGHT*3/4);
        graphics.lineTo(WIDTH/4-10, HEIGHT*3/4);
        graphics.moveTo(WIDTH/4-30, HEIGHT/4);
        graphics.lineTo(WIDTH/4-30, HEIGHT*3/4);
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

function Cot(v) { return 1 / Math.tan(v); }
function Sin(v) { return Math.sin(v); }
function Cos(v) { return Math.cos(v); }
function Csc(v) { return 1 / Math.sin(v); }
function Ln(v) { return Math.log(v) / Math.log(Math.E); }
function Sqr(v) { return Math.pow(v,2); }
function Sqrt(v) { return Math.sqrt(v); }
function Cube(v) { return Math.pow(v,3); }
function Fourth(v) { return Math.pow(v,4); }

let update = true;

let mouse = new Mouse();

function Init(){
    objs["wg"] = new Waveguide();
}

function Update() {
    objs["wg"].Update(dim_a.value, dim_b.value, dim_freq.value, dim_aperture.value, dim_d.value);

    update = true;
}

app.ticker.add((dT) => {
    if (update) {
        graphics.clear();

        for (let k in objs) {
            objs[k].Draw();
        }
        
        update = false;
    }
});

function  getMousePos(canvas, evt) {
    let rect = canvas.getBoundingClientRect(); // abs. size of element
    let scaleX = canvas.width / rect.width;    // relationship bitmap vs. element for X
    let scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y

    return {
        x: (evt.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
        y: (evt.clientY - rect.top) * scaleY     // been adjusted to be relative to element
    };
}

canvas.addEventListener("mousemove", function (evt) {
    mouse.MoveTo(getMousePos(canvas, evt));
}, false);

// Listen for changes on ANY of these ids.
const dim_a = document.getElementById("dim-a");
const dim_b = document.getElementById("dim-b");
const dim_d = document.getElementById("dim-d");
const dim_freq = document.getElementById("dim-freq");
const dim_aperture = document.getElementById("aperture-type");
for (const dim of [dim_a, dim_b, dim_d, dim_freq, dim_aperture]) {
    dim.addEventListener("change", function (evt) {
        Update();
    }, false);
}

Init();
