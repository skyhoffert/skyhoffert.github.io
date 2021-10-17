// util.js: Utility functions.

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

function CapFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function RandName(last="") {
    if (last != "") {
        return CapFirst(FIRST_NAMES[RandInt(0, FIRST_NAMES.length)]) + " " + last;
    }
    return CapFirst(FIRST_NAMES[RandInt(0, FIRST_NAMES.length)]) + " " + 
        CapFirst(LAST_NAMES[RandInt(0, LAST_NAMES.length)]);
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
