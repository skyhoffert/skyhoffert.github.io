///////////////////////////////////////////////////////////////////////////////////////////////////
// Filename: index.js
// Author: Sky Hoffert
// Last Modified: 2022-08-17
///////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////
// Constants

const WIDTH = 800;
const HEIGHT = 400;
const BG_COLOR = 0x111111;

const PI = 3.1415926;

const MAX_FREQ = 4186.01; // Hz. C8, highest piano note.
const MAX_ATTACK = 1; // s
const MAX_DECAY = 1; // s
const MAX_SUSTAIN = 3; // s
const MAX_RELEASE = 1; // s

const SAMPLE_RATE = 10000;

// Constants
///////////////////////////////////////////////////////////////////////////////////////////////////
// Pixi

const canvas = document.getElementById("canvas");
const app = new PIXI.Application({
width: WIDTH, height: HEIGHT,
backgroundColor: BG_COLOR,
resolution: window.devicePixelRatio || 1,
view: canvas,
});

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST; 

const content = new PIXI.Container();
const graphics = new PIXI.Graphics();
const graphics2 = new PIXI.Graphics();
app.stage.addChild(content);
content.addChild(graphics);
content.addChild(graphics2);

// Pixi
///////////////////////////////////////////////////////////////////////////////////////////////////
// Util/Math

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
    let result           = "";
    let characters       = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let charactersLength = characters.length;
    for (let i = 0; i < len; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function RandNormal(mu, sigma, nsamples=6){
    if(!sigma) sigma = 1
    if(!mu) mu=0

    let run_total = 0
    for(let i=0 ; i<nsamples ; i++){
       run_total += Math.random()
    }

    return sigma*(run_total - nsamples/2)/(nsamples/2) + mu
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

// Util/Math
///////////////////////////////////////////////////////////////////////////////////////////////////
// Main

let update = false;
let pause = false;

let waveform = [];

function Init() {
    DrawGraph();
}


app.ticker.add((dT) => {
    if (pause) { return; }

    // graphics.clear();
    // graphics2.clear();
});

// Main
///////////////////////////////////////////////////////////////////////////////////////////////////
// Extra

function DrawGraph()
{
    GenerateWaveform();

    graphics.clear();

    let margin = 10;

    let originx = margin;
    let originy = HEIGHT/2;

    let attackx = originx + elm_attack.value*100;
    let decayx = attackx + elm_decay.value*100;
    let sustainx = decayx + elm_sustain.value*100;
    let releasex = sustainx + elm_release.value*100;

    graphics.lineStyle(1, 0xffffff);

    // X-axis
    graphics.moveTo(originx, originy);
    graphics.lineTo(WIDTH - margin, originy);

    // Y-axis
    graphics.moveTo(originx, HEIGHT - margin);
    graphics.lineTo(originx, margin);
    
    graphics.lineStyle(2, 0xaa2857);

    // Envelope
    graphics.moveTo(originx, originy);
    graphics.lineTo(attackx, margin);
    graphics.lineTo(decayx, HEIGHT/5);
    graphics.lineTo(sustainx, HEIGHT/5);
    graphics.lineTo(releasex, originy);

    graphics.lineStyle(2, 0x28aa57);
    graphics.moveTo(originx, originy - waveform[0]);
    for (let i = 1; i < waveform.length; i++)
    {
        let x = originx + 100 * (i / SAMPLE_RATE);
        graphics.lineTo(x, originy - waveform[i]*(HEIGHT/2-(margin)));
    }
}

function GenerateWaveform()
{
    waveform = [];

    let att = parseFloat(elm_attack.value);
    let dec = parseFloat(elm_decay.value);
    let sus = parseFloat(elm_sustain.value);
    let rel = parseFloat(elm_release.value);
    let length = (att + dec + sus + rel) * SAMPLE_RATE ;

    for (let i = 0; i < length; i++)
    {
        let t = i / SAMPLE_RATE;
        let env = 0;
        if (t <= att) {
            env = t / att;
        }
        else if (t <= (att + dec)) {
            env = 1 - (t-att)/dec * 0.3;
        }
        else if (t <= (att + dec + sus)) {
            env = 0.7;
        }
        else if (t <= (att + dec + sus + rel)) {
            env = 0.7 - ((t - att - dec - sus)/rel * 0.7);
        }
        else {
            env = 0;
        }

        waveform[i] = env * Math.sin(2*Math.PI*i / SAMPLE_RATE * elm_freq.value);
    }
}

function PlayAudio()
{
    let audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    let channels = 2;
    let frameCount = waveform.length;

    let absAmp = 0.25;

    let myAudioBuffer = audioCtx.createBuffer(channels, frameCount, SAMPLE_RATE);
    for (let channel = 0; channel < channels; channel++)
    {
        let nowBuffering = myAudioBuffer.getChannelData(channel,16, SAMPLE_RATE);
        for (let i = 0; i < frameCount; i++)
        {
            nowBuffering[i] = absAmp * waveform[i];
        }
    }

    let source = audioCtx.createBufferSource();
    source.buffer = myAudioBuffer;
    source.connect(audioCtx.destination);
    source.start();
}

// Extra
///////////////////////////////////////////////////////////////////////////////////////////////////
// Listeners

let elm_freq = document.getElementById("freq");
let elm_freqval = document.getElementById("freqval");
let elm_attack = document.getElementById("attack");
let elm_attackval = document.getElementById("attackval");
let elm_decay = document.getElementById("decay");
let elm_decayval = document.getElementById("decayval");
let elm_sustain = document.getElementById("sustain");
let elm_sustainval = document.getElementById("sustainval");
let elm_release = document.getElementById("release");
let elm_releaseval = document.getElementById("releaseval");

document.addEventListener("keydown", function(evt) {
    if (evt.key == "n") {
        // Key: "n"
        // Action: Reset games.

        for (let i = 0; i < N_GAMES; i++) {
            objs["game"+i].Reset();
        }

    } else if (evt.key == "b") {

        pause = !pause;

    } else if (evt.key == "m") {
        // Key: "m"
        // Action: Debug.

        // console.log(objs["nn1"].texts);

    }
}, false);

document.addEventListener("keyup", function(evt) {
}, false);

elm_freq.oninput = function () {
    elm_freqval.value = "" + elm_freq.value;
    DrawGraph();
}
elm_freqval.oninput = function () {
    if (elm_freqval.value > MAX_FREQ){ elm_freqval.value = MAX_FREQ; }
    elm_freq.value = elm_freqval.value;
    DrawGraph();
}

elm_attack.oninput = function () {
    elm_attackval.value = "" + elm_attack.value;
    DrawGraph();
}
elm_attackval.oninput = function () {
    if (elm_attackval.value > MAX_ATTACK){ elm_attackval.value = MAX_ATTACK; }
    elm_attack.value = elm_attackval.value;
    DrawGraph();
}

elm_decay.oninput = function () {
    elm_decayval.value = "" + elm_decay.value;
    DrawGraph();
}
elm_decayval.oninput = function () {
    if (elm_decayval.value > MAX_DECAY){ elm_decayval.value = MAX_DECAY; }
    elm_decay.value = elm_decayval.value;
    DrawGraph();
}

elm_sustain.oninput = function () {
    elm_sustainval.value = "" + elm_sustain.value;
    DrawGraph();
}
elm_sustainval.oninput = function () {
    if (elm_sustainval.value > MAX_SUSTAIN){ elm_sustainval.value = MAX_SUSTAIN; }
    elm_sustain.value = elm_sustainval.value;
    DrawGraph();
}

elm_release.oninput = function () {
    elm_releaseval.value = "" + elm_release.value;
    DrawGraph();
}
elm_releaseval.oninput = function () {
    if (elm_releaseval.value > MAX_RELEASE){ elm_releaseval.value = MAX_RELEASE; }
    elm_release.value = elm_releaseval.value;
    DrawGraph();
}

// Listeners
///////////////////////////////////////////////////////////////////////////////////////////////////

Init();
