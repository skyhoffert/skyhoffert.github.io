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

class Plot {
    constructor(x,y,w,h) {
        // x, y are CENTER of plot
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.xdata = [];
        this.ydata = [];
        this.xaxislim = [0,0];
        this.yaxislim = [0,0];
        this.valid = false;
        this.left = this.x - this.width/2;
        this.top = this.y - this.height/2;
    }

    setXData(d) {
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
        this.yaxislim = [Min(this.ydata), Max(this.ydata)];
        console.log(this.yaxislim);

        if (this.xdata.length === 0) {
            this.xdata = Linspace(0, this.ydata.length, 1, false);
        }
        this.xaxislim = [Min(this.xdata), Max(this.xdata)];
        console.log(this.xaxislim);

        // TODO: update ticks
        // TODO: update xdata
    }

    Draw() {
        // TODO: move axes appropriately
        graphics.lineStyle(1, 0xffffff);
        // graphics.moveTo(this.x-this.width/2, this.y);
        // graphics.lineTo(this.x+this.width/2, this.y);
        // graphics.moveTo(this.x, this.y-this.height/2);
        // graphics.lineTo(this.x, this.y+this.height/2);
        const xfac = WIDTH / (this.xaxislim[1] - this.xaxislim[0]);
        const yfac = -HEIGHT / (this.yaxislim[1] - this.yaxislim[0]);
        graphics.moveTo(this.left + this.xdata[0] * xfac, this.y + yfac * this.ydata[0]);
        for (let i = 1; i < this.ydata.length-1; i++) {
            let x = this.left + this.xdata[i] * xfac;
            let y = this.y + yfac * this.ydata[i];
            //console.log(""+x+","+y);
            graphics.lineTo(x, y);
            graphics.moveTo(this.left + this.xdata[i] * xfac, this.y + yfac * this.ydata[i]);
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
    return Math.tan((Math.random() - 0.5) * Math.PI);
}

function Init() {
    let p = new Plot(WIDTH/2, HEIGHT/2, WIDTH, HEIGHT);
    objs["p"] = p;

    const A = 1;
    const f = 5;
    const q = 0;
    let s = []; // s will be purely real
    let t = Linspace(0,2,0.01);

    for (let i = 0; i < t.length; i++) {
        let val = A * Math.cos(2*Math.PI*f*t[i] + q);
        val += 0.02 * AWGN();
        s.push(val);
    }

    p.setXData(t);
    p.setYData(s);

    const N = s.length;
    let W = [];
    const R = Math.floor(Math.random()*N);
    for (let k = 0; k < N; k++) {
        let sum = new Complex(0,0);
        for (let i = 0; i < N; i++) {
            const re = s[i] * Math.cos(2*Math.PI*k*i/N);
            const im = s[i] * -Math.sin(2*Math.PI*k*i/N);
            if (i === R) {
                //console.log(""+re+" + i*"+im);
            }
            sum.Add(re,im);
        }
        const m = sum.Magnitude();
        //console.log(m);
        W.push(m);
    }
    p.setYData(W);
}

Init();

app.ticker.add((dT) => {
    graphics.clear();

    for (let k in objs) {
        objs[k].Draw();
    }
});
