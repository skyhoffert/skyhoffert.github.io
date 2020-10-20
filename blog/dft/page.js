// Sky Hoffert

const WIDTH = 600;
const HEIGHT = 400;

const canvas = document.getElementById("canv1");
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

let s_time = null;
let s_freq = null;
let t_time = null;
let t_freq = null;
let plot = null;
let disp_mode = "time";
let update = false;
let Fs = 1/0.01;
let f = 25;

class Plot {
    constructor(x,y,w,h) {
        // x, y are CENTER of plot
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.xdata = [];
        this.ydata = [];
        this.lims = {
            ydata_min: 0, ydata_max: 0,
            yaxis_min: 0, yaxis_max: 0,
            xdata_min: 0, xdata_max: 0,
            xaxis_min: 0, xaxis_max: 0,
            yrange: 0, xrange: 0,
        };
        this.valid = false;
        this.left = this.x - this.width/2;
        this.right = this.x + this.width/2;
        this.top = this.y - this.height/2;
        this.bottom = this.y + this.height/2;

        this.texts = {
            xmin: null, xmax: null,
            ymin: null, ymax: null,
        };
    }

    Destroy() {
        console.log("TODO: remove text");
    }

    clearXData(d) {
        this.xdata = [];
    }

    setXData(d) {
        if (d.length !== this.ydata.length) {
            console.log("ERROR: could not set x data, length mismatch");
            return;
        }
        this.xdata = d;
        this._Update();
    }

    setYData(d) {
        this.ydata = d;
        this._Update();
    }
 
    _Update() {
        this.valid = true;
        if (this.ydata.length === 0){
            this.valid = false;
            return;
        }
        this.lims.ydata_min = Min(this.ydata);
        this.lims.ydata_max = Max(this.ydata);

        if (this.xdata.length === 0) {
            this.xdata = Linspace(0, this.ydata.length, 1, false);
        }
        this.lims.xdata_min = Min(this.xdata);
        this.lims.xdata_max = Max(this.xdata);

        this.lims.xaxis_min = this.lims.xdata_min;
        this.lims.xaxis_max = this.lims.xdata_max;
        this.lims.yaxis_min = this.lims.ydata_min;
        this.lims.yaxis_max = this.lims.ydata_max;

        this.lims.yrange = this.lims.ydata_max - this.lims.ydata_min;
        this.lims.xrange = this.lims.xdata_max - this.lims.xdata_min;

        if (this.texts.xmin === null) {
            this.texts.xmin = new PIXI.Text(""+Sigs(this.lims.xdata_min,0), {
                fontFamily: "Verdana", fontSize: 14, fill: 0xffffff, align: "left",
            });
            this.texts.xmin.anchor.set(0,0.5);
            this.texts.xmin.position.set(0, HEIGHT/2);

            this.texts.xmax = new PIXI.Text(""+Sigs(this.lims.xdata_max,0), {
                fontFamily: "Verdana", fontSize: 14, fill: 0xffffff, align: "right",
            });
            this.texts.xmax.anchor.set(1,0.5);
            this.texts.xmax.position.set(WIDTH, HEIGHT/2);

            this.texts.ymin = new PIXI.Text(""+Sigs(this.lims.ydata_min,0), {
                fontFamily: "Verdana", fontSize: 14, fill: 0xffffff, align: "center",
            });
            this.texts.ymin.anchor.set(0.5,1);
            this.texts.ymin.position.set(WIDTH/2, HEIGHT);

            this.texts.ymax = new PIXI.Text(""+Sigs(this.lims.ydata_max,0), {
                fontFamily: "Verdana", fontSize: 14, fill: 0xffffff, align: "center",
            });
            this.texts.ymax.anchor.set(0.5,0);
            this.texts.ymax.position.set(WIDTH/2, 0);

            content.addChild(this.texts.xmin);
            content.addChild(this.texts.xmax);
            content.addChild(this.texts.ymin);
            content.addChild(this.texts.ymax);
        } else {
            this.texts.xmin.text = ""+Sigs(this.lims.xdata_min, 0);
            this.texts.xmax.text = ""+Sigs(this.lims.xdata_max, 0);
            this.texts.ymin.text = ""+Sigs(this.lims.ydata_min, 0);
            this.texts.ymax.text = ""+Sigs(this.lims.ydata_max, 0);
        }
    }

    Draw() {
        // Draw axes.
        let xaypp = -this.lims.ydata_min / this.lims.yrange;
        let yaxpp = -this.lims.xdata_min / this.lims.xrange;
        graphics.lineStyle(2, 0xbb5599);
        graphics.moveTo(this.left, this.bottom - xaypp * HEIGHT);
        graphics.lineTo(this.right, this.bottom - xaypp * HEIGHT);
        graphics.moveTo(this.left + yaxpp * WIDTH, this.bottom);
        graphics.lineTo(this.left + yaxpp * WIDTH, this.top);

        // Draw data.
        graphics.lineStyle(1, 0xccffcc);
        let px = 0;
        let py = 0;
        for (let i = 0; i < this.ydata.length-1; i++) {
            px = (this.xdata[i] - this.lims.xdata_min) / this.lims.xrange;
            py = (this.ydata[i] - this.lims.ydata_min) / this.lims.yrange;
            graphics.moveTo(this.left + px * WIDTH, this.bottom - py * HEIGHT);
            px = (this.xdata[i+1] - this.lims.xdata_min) / this.lims.xrange;
            py = (this.ydata[i+1] - this.lims.ydata_min) / this.lims.yrange;
            graphics.lineTo(this.left + px * WIDTH, this.bottom - py * HEIGHT);
        }
    }
}

class Complex {
    constructor(r,i) {
        this.real = r;
        this.imag = i;
    }

    Add(r,i) {
        this.real += r;
        this.imag += i;
    }

    Set(r,i) {
        this.real = r;
        this.imag = i;
    }

    Magnitude() {
        return Math.hypot(this.real, this.imag);
    }

    Angle() {
        return Math.atan2(this.imag, this.real);
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
function AWGN(u=0,s2=1) {
    return Math.tan((Math.random() - 0.5) * Math.PI*0.9);
}

function Sigs(n, dig=3) {
    return Math.round(n * Math.pow(10, dig)) / Math.pow(10, dig);
}

function GenSignal() {

    const A = 1;
    const q = Math.random() * 2*Math.PI;
    let s = []; // s will be purely real
    let t = Linspace(0,2,1/Fs);

    for (let i = 0; i < t.length; i++) {
        let val = A * Math.cos(2*Math.PI*f*t[i] + q);
        val += 0.02 * AWGN();
        s.push(val);
    }

    s_time = s;
    t_time = t;

    // const N = s.length;
    const N = 1024;
    let W = [];
    const R = Math.floor(Math.random()*N);
    for (let k = 0; k < N; k++) {
        let sum = new Complex(0,0);
        for (let i = 0; i < s.length; i++) {
            const re = s[i] * Math.cos(2*Math.PI*k*i/N);
            const im = s[i] * -Math.sin(2*Math.PI*k*i/N);
            if (i === R) {
                //console.log(""+re+" + i*"+im);
            }
            sum.Add(re,im);
        }
        let m = sum.Magnitude();
        m = 10 * Math.log10(m); // LOG domain?
        W.push(m);
    }

    s_freq = W.slice(Math.floor(N/2), N);
    s_freq = s_freq.concat(W.slice(0, Math.floor(N/2)));
    t_freq = Linspace(-Fs/2,Fs/2,Fs/N, false);

    UpdatePlot();
}

function UpdatePlot() {
    if (disp_mode === "time") {
        plot.setYData(s_time);
        plot.setXData(t_time);
    } else {
        plot.setYData(s_freq);
        plot.setXData(t_freq);
    }

    update = true;
}

function Init() {
    let p = new Plot(WIDTH/2, HEIGHT/2, WIDTH, HEIGHT);
    objs["p"] = p;
    plot = p;

    GenSignal();
}

Init();

app.ticker.add((dT) => {
    if (update) {
        graphics.clear();

        for (let k in objs) {
            objs[k].Draw();
        }
        
        update = false;
    }
});

document.getElementById("btn-time").addEventListener("click", function (evt) {
    disp_mode = "time";
    UpdatePlot();
    console.log("Changed to time domain.");
}, false);

document.getElementById("btn-freq").addEventListener("click", function (evt) {
    disp_mode = "freq";
    UpdatePlot();
    console.log("Changed to freq domain.");
}, false);

document.getElementById("btn-refr").addEventListener("click", function (evt) {
    GenSignal();
    console.log("Refresh.");
}, false);
