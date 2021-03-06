// Sky Hoffert

const WIDTH = 600;
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

class Display {
    constructor() {
        this.imgs = {};
        this.texts = {};

        this.imgs.sun = new PIXI.Sprite(PIXI.Texture.from("images/sun.png"));
        this.imgs.sun.anchor.set(0.5);
        this.imgs.sun.position.set(WIDTH-20, 20);
        this.imgs.sun.width = 140;
        this.imgs.sun.height = 140;
        content.addChild(this.imgs.sun);

        this.imgs.sat = new PIXI.Sprite(PIXI.Texture.from("images/sat.png"));
        this.imgs.sat.anchor.set(0.5);
        this.imgs.sat.position.set(100,120);
        this.imgs.sat.width = 200;
        this.imgs.sat.height = 200;
        content.addChild(this.imgs.sat);

        this.imgs.earth = new PIXI.Sprite(PIXI.Texture.from("images/earth.png"));
        this.imgs.earth.anchor.set(0.5,1);
        this.imgs.earth.position.set(WIDTH/2,HEIGHT);
        this.imgs.earth.width = WIDTH;
        this.imgs.earth.height = 100;
        content.addChild(this.imgs.earth);

        // TODO: add receiver img.
        // TODO: add lines for transmission waveform:
        //         -> Increasing frequency brings lines closer together.
        //         -> Increasing power makes lines darker/larger.
        // TODO: how is "d" reflected in the imagery?
        // TODO: how is "L_atm" reflected in the imagery?

        // TODO: make sizes of transmitter and receiver scale with A_t and A_r, respectively.
        
        // this.texts.a = new PIXI.Text("a", {
        //     fontFamily: "Verdana", fontSize: 36, fill: 0xffffff, align: "center",
        // });
        // this.texts.a.anchor.set(0.5,1);
        // this.texts.a.position.set(WIDTH/2, HEIGHT/4-30);
        // content.addChild(this.texts.a);

        this.c = 3e8;
        this.pi = 3.1415926;
        
        this.f = 0; // Hz
        this.A_t = 0; // m^2
        this.P_t_peak = 0; // W
        this.P_t_avg = 0; // W
        this.d = 0; // m
        this.L_atm = 0; // dB
        this.A_r = 0; // m^2

        this.lambda = 0; // m
    }

    Update() {
        // Parse values.
        this.f = parseFloat(dim_f.value) * 1e6; // MHz -> Hz
        this.A_t = parseFloat(dim_A_t.value); // m^2
        this.P_t_peak = ToWatts(dim_P_t_peak.value, dim_P_t_peak_select.value); // W
        this.P_t_avg = ToWatts(dim_P_t_avg.value, dim_P_t_avg_select.value); // W
        this.d = parseFloat(dim_d.value) * 1e3; // km -> m
        this.L_atm = parseFloat(dim_L_atm.value); // dB
        this.A_r = parseFloat(dim_A_r.value); // m^2

        // Checks values for realistic/correctness.
        if (this.P_t_peak < this.P_t_avg) {
            this.P_t_peak = this.P_t_avg;
            dim_P_t_peak.value = dim_P_t_avg.value;
        }

        this.lambda = this.c / this.f;

        let tmp = this.A_t * this.A_r / (Sqr(this.lambda) * Sqr(this.d));
        let tau = Sqrt(tmp);
        let P_r_peak = this.P_t_peak * tmp;
        let P_r_peak_dB = 10*Log10(P_r_peak);
        let P_r_avg = this.P_t_avg * tmp;
        let P_r_avg_dB = 10*Log10(P_r_avg);
        
        out_P_r_peak.value = math.format(P_r_peak, {precision:3});
        out_P_r_peak_dB.value = math.format(P_r_peak_dB, {precision:3});
        out_P_r_avg.value = math.format(P_r_avg, {precision:3});
        out_P_r_avg_dB.value = math.format(P_r_avg_dB, {precision:3});
        out_tau.value = math.format(tau, {precision:3});
        out_eta.value = math.format(1-Exp(-Sqr(tau)), {precision:3});
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
        graphics.lineStyle(0,0);
        graphics.beginFill(0x000000);
        graphics.drawRect(0, 0, WIDTH, HEIGHT);
        graphics.endFill();
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
function Exp(v) { return Math.exp(v); }
function Log10(v) { return Math.log10(v); }
function Pow(b,e) { return Math.pow(b, e); }

function ToWatts(v, s) {
    let tmp = parseFloat(v);
    if (s == "W") {
        return tmp;
    } else if (s == "dBW") {
        return Pow(10, tmp/10);
    } else if (s == "dBm") {
        return Pow(10, (tmp-30)/10);
    }
}

let update = false;

let mouse = new Mouse();

function Init(){
    objs["display"] = new Display();

    Update();
}

function Update() {
    objs["display"].Update();

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
const dim_f = document.getElementById("dim-f");
const dim_A_t = document.getElementById("dim-A_t");
const dim_P_t_peak = document.getElementById("dim-P_t_peak");
const dim_P_t_avg = document.getElementById("dim-P_t_avg");
const dim_d = document.getElementById("dim-d");
const dim_L_atm = document.getElementById("dim-L_atm");
const dim_A_r = document.getElementById("dim-A_r");
const dim_P_t_peak_select = document.getElementById("dim-P_t_peak_select");
const dim_P_t_avg_select = document.getElementById("dim-P_t_avg_select");
for (const dim of [dim_f, dim_A_t, dim_P_t_peak, dim_P_t_avg, dim_d, dim_L_atm, dim_A_r, dim_P_t_peak_select, dim_P_t_avg_select]) {
    dim.addEventListener("change", function (evt) {
        Update();
    }, false);
}

// Register the output boxes.
const out_P_r_peak = document.getElementById("out-P_r_peak");
const out_P_r_peak_dB = document.getElementById("out-P_r_peak_dB");
const out_P_r_avg = document.getElementById("out-P_r_avg");
const out_P_r_avg_dB = document.getElementById("out-P_r_avg_dB");
const out_tau = document.getElementById("out-tau");
const out_eta = document.getElementById("out-eta");

Init();
