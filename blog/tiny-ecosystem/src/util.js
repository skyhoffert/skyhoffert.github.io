// util.js: Utility functions.

function BlockCharToBlockType(c) {
    if (c == "r") {
        return BLOCK_TYPES.ROCK;
    } else if (c == "g") {
        return BLOCK_TYPES.GRASS;
    } else if (c == "w") {
        return BLOCK_TYPES.WATER;
    } else if (c == "d") {
        return BLOCK_TYPES.DIRT;
    } else {
        return -1;
    }
}

function ShuffleArray(array) {
    let currentIndex = array.length,  randomIndex;

    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }

    return array;
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
    // Range = [l,h-1]
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

    var run_total = 0
    for(var i=0 ; i<nsamples ; i++){
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
function Abs(v) { return Math.abs(v); }
function Round(v) { return Math.round(v); }

// Returns value "v" limited by "min" and "max".
function Clamp(v, min, max) {
    if (v < min) { return min; }
    if (v > max) { return max; }
    return v;
}

function FuzzyEquals(v1, v2, fuzz) {
    return Abs(v1 - v2) < fuzz;
}

function Contains(x, y, rx, ry, rw, rh) {
    return x > rx - rw/2 && x < rx + rw/2 && y > ry - rh/2 && y < ry + rh/2;
}

function Log(msg) { LogDebug(msg); }

function LogFatal(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.FATAL) { console.log("FATL: "+msg); }
}

function LogError(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.ERROR) { console.log("ERR : "+msg); }
}

function LogWarn(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.WARN) { console.log("WARN: "+msg); }
}

function LogInfo(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.INFO) { console.log("INFO: "+msg); }
}

function LogDebug(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.DEBUG) { console.log("DBUG: "+msg); }
}

function LogTrace(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.TRACE) { console.log("TRAC: "+msg); }
}

class NN {
    constructor(nIn, nOut, layers) {
        this.inputs = []; // Input values in range [-1,1].
        this.outputs = []; // Output values in range [0,1].
        this.layers = []; // Layers should be an array of integers.

        for (let i = 0; i < nIn; i++) {
            this.inputs.push(0);
        }
        for (let i = 0; i < nOut; i++) {
            this.outputs.push(0);
        }
        for (let i = 0; i < layers.length; i++) {
            this.layers.push([]);
            for (let j = 0; j < layers[i]; j++) {
                this.layers[i].push(0);
            }
        }
    }

    Calculate() {
        for (let i = 0; i < this.layers.length; i++) {
            for (let j = 0; j < this.layers[i].length; j++) {
            }
        }
    }
}