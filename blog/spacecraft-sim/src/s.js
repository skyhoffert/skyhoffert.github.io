// Filename: s.js.
// Description: A library of js utility functions and variables.
// Revision: RevA.
// Release Date: 2022-01-21.
// Primary Author: Sky Hoffert.
// Secondary Author(s): N/A.
// Target Audience: Sky Hoffert and similar programmers looking for simple JS utility library.

function sLinspace(a,b,d,incl=true) {
  let t = [];
  const end = incl ? b : b-d;
  for (let i = a; i <= end; i += d) {
      t.push(i);
  }
  return t;
}

function sMax(ar) {
  return Math.max.apply(Math, ar);
}

function sMin(ar) {
  return Math.min.apply(Math, ar);
}

function sSigs(n, dig=3) {
  return Math.round(n * Math.pow(10, dig)) / Math.pow(10, dig);
}

function sRandInt(l,h) {
  // Range = [l,h]
  return Math.floor(Math.random() * (h-l+1)) + l;
}

function sRandID(len=6) {
  let result           = "";
  let characters       = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < len; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function sRandNormal(mu, sigma, nsamples=10){
  if(!sigma) sigma = 1
  if(!mu) mu=0

  var run_total = 0
  for(var i=0 ; i<nsamples ; i++){
     run_total += Math.random()
  }

  return sigma*(run_total - nsamples/2)/(nsamples/2) + mu
}

function sCot(v) { return 1 / Math.tan(v); }
function sSin(v) { return Math.sin(v); }
function sCos(v) { return Math.cos(v); }
function sCsc(v) { return 1 / Math.sin(v); }
function sLn(v) { return Math.log(v) / Math.log(Math.E); }
function sSqr(v) { return Math.pow(v,2); }
function sSqrt(v) { return Math.sqrt(v); }
function sCube(v) { return Math.pow(v,3); }
function sFourth(v) { return Math.pow(v,4); }
function sExp(v) { return Math.exp(v); }
function sLog10(v) { return Math.log10(v); }
function sPow(b,e) { return Math.pow(b, e); }
function sAbs(v) { return Math.abs(v); }
function sRound(v) { return Math.round(v); }

// Returns value "v" limited by "min" and "max".
function sClamp(v, min, max) {
  if (v < min) { return min; }
  if (v > max) { return max; }
  return v;
}

function sFuzzyEquals(v1, v2, fuzz=0.001) {
  return Abs(v1 - v2) < fuzz;
}

function sContains(x, y, rx, ry, rw, rh) {
  return x > rx - rw/2 && x < rx + rw/2 && y > ry - rh/2 && y < ry + rh/2;
}

const sk_log_levels = {trace:5, debug:4, info:3, warn:2, error:1, fatal:0};
const sk_log_level = sk_log_levels.trace;

function sLog(msg) { sLogDebug(msg); }

function sLogFatal(msg) {
  if (sk_log_level >= sk_log_levels.trace) { console.log("FATL: "+msg); }
}

function sLogError(msg) {
  if (sk_log_level >= sk_log_levels.error) { console.log("ERR : "+msg); }
}

function sLogWarn(msg) {
  if (sk_log_level >= sk_log_levels.warn) { console.log("WARN: "+msg); }
}

function sLogInfo(msg) {
  if (sk_log_level >= sk_log_levels.info) { console.log("INFO: "+msg); }
}

function sLogDebug(msg) {
  if (sk_log_level >= sk_log_levels.debug) { console.log("DBUG: "+msg); }
}

function sLogTrace(msg) {
  if (sk_log_level >= sk_log_levels.trace) { console.log("TRAC: "+msg); }
}
