// Sky Hoffert

const WIDTH = 600;
const HEIGHT = 800;

const PI = 3.1415926;

const M_s_ratio = 10; // kg / m^2
document.getElementById("out-M_ratio").innerHTML = M_s_ratio;

const M_L_default = 5000; // kg
document.getElementById("dim-M_L").value = M_L_default;

const N_default = 12;
document.getElementById("dim-N").value = N_default;

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

        this.sat_min_size = 50;
        this.sat_max_size = 250;
        this.imgs.sat = new PIXI.Sprite(PIXI.Texture.from("images/sat.png"));
        this.imgs.sat.anchor.set(0.5);
        this.imgs.sat.position.set(112,120);
        this.imgs.sat.width = this.sat_max_size;
        this.imgs.sat.height = this.sat_max_size;
        this.imgs.sat.rotation = -0.6;
        content.addChild(this.imgs.sat);

        this.imgs.earth = new PIXI.Sprite(PIXI.Texture.from("images/earth.png"));
        this.imgs.earth.anchor.set(0.5,1);
        this.imgs.earth.position.set(WIDTH/2,HEIGHT);
        this.imgs.earth.width = WIDTH;
        this.imgs.earth.height = 100;
        content.addChild(this.imgs.earth);

        this.rec_min_size = 50;
        this.rec_max_size = 200;
        this.imgs.rec = new PIXI.Sprite(PIXI.Texture.from("images/rec.png"));
        this.imgs.rec.anchor.set(0.5,1);
        this.imgs.rec.position.set(WIDTH*3/4,HEIGHT-50);
        this.imgs.rec.width = this.rec_max_size;
        this.imgs.rec.height = this.rec_max_size;
        content.addChild(this.imgs.rec);
        
        this.imgs.cloud = new PIXI.Sprite(PIXI.Texture.from("images/cloud.png"));
        this.imgs.cloud.anchor.set(0.5);
        this.imgs.cloud.position.set(WIDTH*3/4-50,HEIGHT-280);
        this.imgs.cloud.width = 300;
        this.imgs.cloud.height = 150;
        this.imgs.cloud.alpha = 1;
        content.addChild(this.imgs.cloud);
        
        this.imgs.cloud2 = new PIXI.Sprite(PIXI.Texture.from("images/cloud.png"));
        this.imgs.cloud2.anchor.set(0.5);
        this.imgs.cloud2.position.set(150,HEIGHT-140);
        this.imgs.cloud2.width = 200;
        this.imgs.cloud2.height = 100;
        this.imgs.cloud2.alpha = 1;
        content.addChild(this.imgs.cloud2);
        
        // this.texts.a = new PIXI.Text("a", {
        //     fontFamily: "Verdana", fontSize: 36, fill: 0xffffff, align: "center",
        // });
        // this.texts.a.anchor.set(0.5,1);
        // this.texts.a.position.set(WIDTH/2, HEIGHT/4-30);
        // content.addChild(this.texts.a);

        this.c = 3e8;
        
        this.f = 0; // Hz
        this.A_t = 0; // m^2
        this.P_t_peak = 0; // W
        this.P_t_avg = 0; // W
        this.d = 0; // m
        this.L_atm = 0; // dB
        this.A_r = 0; // m^2

        this.M_s = 0;
        this.M_L = 0;
        this.N = 0;

        // TODO(sky): set all initial values to 0

        this.lambda = 0; // m
    }

    Update() {
        // Used to track if A_t changes this call.
        let old_A_t = this.A_t;

        // Parse values.
        this.f = parseFloat(dim_f.value) * ToHertz(dim_f_select.value);; // Hz
        this.A_t = ToArea(dim_A_t.value, dim_A_t_select.value); // m^2
        this.P_t_peak = ToWatts(dim_P_t_peak.value, dim_P_t_peak_select.value); // W
        this.P_t_avg = ToWatts(dim_P_t_avg.value, dim_P_t_avg_select.value); // W
        this.d = parseFloat(dim_d.value) * 1e3; // km -> m
        this.L_atm = parseFloat(dim_L_atm.value); // dB
        this.A_r = ToArea(dim_A_r.value, dim_A_r_select.value); // m^2
        this.M_s = parseFloat(dim_M_s.value); // kg
        this.M_L = parseFloat(dim_M_L.value); // kg
        this.N = parseFloat(dim_N.value); // launches per YEAR

        // Detect if A_t was changed for M_s
        let change_A_t = old_A_t != this.A_t;

        // Checks values for realistic/correctness.
        if (this.P_t_peak < this.P_t_avg) {
            this.P_t_peak = this.P_t_avg;
            dim_P_t_peak.value = dim_P_t_avg.value;
        }

        this.lambda = this.c / this.f;

        // Calculate power stuff.
        let tmp = Pow(10, (10*Log10(this.A_t * this.A_r / (Sqr(this.lambda) * Sqr(this.d))) - this.L_atm)/10);
        let tau = Sqrt(tmp);
        let P_r_peak = this.P_t_peak * tmp;
        let P_r_peak_dBW = 10*Log10(P_r_peak);
        let P_r_avg = this.P_t_avg * tmp;
        let P_r_avg_dBW = 10*Log10(P_r_avg);
        
        out_P_r_peak.value = math.format(P_r_peak, {precision:3});
        out_P_r_peak_dBW.value = math.format(P_r_peak_dBW, {precision:3});
        out_P_r_peak_dBm.value = math.format(P_r_peak_dBW + 30, {precision:3});
        out_P_r_avg.value = math.format(P_r_avg, {precision:3});
        out_P_r_avg_dBW.value = math.format(P_r_avg_dBW, {precision:3});
        out_P_r_avg_dBm.value = math.format(P_r_avg_dBW + 30, {precision:3});
        out_P_dr_peak.value = math.format(P_r_peak / this.A_r, {precision:3});
        out_P_dr_avg.value = math.format(P_r_avg / this.A_r, {precision:3});
        out_tau.value = math.format(tau, {precision:3});
        out_eta.value = math.format(1-Exp(-Sqr(tau)), {precision:3});

        // Calculate dimensions stuff.
        if (change_A_t == true) {
            this.M_s = this.A_t * M_s_ratio;
            dim_M_s.value = this.M_s;
        }
        out_t_d.value = this.M_s / (this.M_L * this.N);

        // Calculate factors for sizing objects.
        let maxf = 10*Log10(35e9);
        let minf = 10*Log10(1e6);
        this.freq_factor = Clamp(1 - (10*Log10(this.f) - minf) / (maxf - minf), 0, 1);

        let maxP = 10*Log10(1e9);
        let minP = 10*Log10(10);
        this.P_factor = Clamp((10*Log10(this.P_t_avg) - minP) / (maxP - minP), 0, 1);

        let maxAt = 10*Log10(1e6);
        let minAt = 10*Log10(1);
        this.At_factor = Clamp((10*Log10(this.A_t) - minAt) / (maxAt - minAt), 0,  1);
        
        let maxAr = 10*Log10(1e7);
        let minAr = 10*Log10(1);
        this.Ar_factor = Clamp((10*Log10(this.A_r) - minAr) / (maxAr - minAr), 0,  1);

        let maxL = 10;
        let minL = 0;
        this.L_factor = Clamp((this.L_atm - minL) / (maxL - minL), 0.01, 1);
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

        // Radiation lines.
        let thicks = [14, 18, 30]; // These are MAX widths.
        let rads = [20, 45, 80]; // These are MIN rads.
        let thickfactor = this.P_factor;
        let radfactor = 0.8 + 2 * this.freq_factor;
        for (let i = 0; i < 3; i++) {
            graphics.lineStyle({width:1 + thicks[i] * thickfactor, color:0x28dead, cap:"round"});
            graphics.arc(170, 200, rads[i] * radfactor, 0.6, 1.4);
            graphics.endFill();
        }

        graphics.lineStyle(2, 0x215bb8, 0.4);
        graphics.beginFill(0x4287f5, 0.15);
        graphics.arc(WIDTH/2, HEIGHT*1.8, HEIGHT*5/4, 0, 2*PI);
        graphics.endFill();

        // Resize existing images.
        let tmp = this.sat_min_size + this.At_factor * (this.sat_max_size - this.sat_min_size)
        this.imgs.sat.width = tmp;
        this.imgs.sat.height = tmp;

        tmp = this.rec_min_size + this.Ar_factor * (this.rec_max_size - this.rec_min_size);
        this.imgs.rec.width = tmp;
        this.imgs.rec.height = tmp;

        // Adjust alpha of clouds
        this.imgs.cloud.alpha = this.L_factor;
        this.imgs.cloud2.alpha = this.L_factor;
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

function Clamp(v, min, max) {
    if (v < min) { return min; }
    if (v > max) { return max; }
    return v;
}

function ToHertz(v) {
    if (v == "MHz") { return 1e6; }
    if (v == "GHz") { return 1e9; }
    if (v == "THz") { return 1e12; }
    return 0;
}

function ToArea(v, s) {
    let tmp = parseFloat(v);
    if (s == "m^2") { return tmp; }
    if (s == "rad") { return PI * tmp * tmp; } // pi * r^2
    return 0;
}

function ToWatts(v, s) {
    let tmp = parseFloat(v);
    if (s == "W") { return tmp; }
    if (s == "dBW") { return Pow(10, tmp/10); }
    if (s == "dBm") { return Pow(10, (tmp-30)/10); }
    return 0;
}

function ToMass(v, s) {
    let tmp = parseFloat(v);
    if (s == "kg") { return tmp; }
    if (s == "mt") { return 1000*tmp; }
    return 0;
}

function ToM_s(v, s) {
    if (s == "kg") { return v; }
    if (s == "mt") { return v / 1000; }
    return 0;
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
const dim_f_select = document.getElementById("dim-f_select");
const dim_A_t = document.getElementById("dim-A_t");
const dim_A_t_select = document.getElementById("dim-A_t_select");
const dim_P_t_peak = document.getElementById("dim-P_t_peak");
const dim_P_t_avg = document.getElementById("dim-P_t_avg");
const dim_d = document.getElementById("dim-d");
const dim_L_atm = document.getElementById("dim-L_atm");
const dim_A_r = document.getElementById("dim-A_r");
const dim_A_r_select = document.getElementById("dim-A_r_select");
const dim_P_t_peak_select = document.getElementById("dim-P_t_peak_select");
const dim_P_t_avg_select = document.getElementById("dim-P_t_avg_select");
const dim_M_s = document.getElementById("dim-M_s");
const dim_M_L = document.getElementById("dim-M_L");
const dim_N = document.getElementById("dim-N");
for (const dim of [dim_f, dim_A_t, dim_P_t_peak, dim_P_t_avg, dim_d, dim_L_atm,
        dim_A_r, dim_P_t_peak_select, dim_P_t_avg_select, dim_f_select,
        dim_A_t_select, dim_A_r_select, dim_M_s, dim_M_L, dim_N]) {
    dim.addEventListener("change", function (evt) {
        Update();
    }, false);
}

// Register the output boxes.
const out_P_r_peak = document.getElementById("out-P_r_peak");
const out_P_r_peak_dBW = document.getElementById("out-P_r_peak_dBW");
const out_P_r_peak_dBm = document.getElementById("out-P_r_peak_dBm");
const out_P_r_avg = document.getElementById("out-P_r_avg");
const out_P_r_avg_dBW = document.getElementById("out-P_r_avg_dBW");
const out_P_r_avg_dBm = document.getElementById("out-P_r_avg_dBm");
const out_P_dr_peak = document.getElementById("out-P_dr_peak");
const out_P_dr_avg = document.getElementById("out-P_dr_avg");
const out_tau = document.getElementById("out-tau");
const out_eta = document.getElementById("out-eta");
const out_t_d = document.getElementById("out-t_d");

Init();
