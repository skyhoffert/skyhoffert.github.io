// Sky Hoffert
// Util for saeg.

function Raycast(x,y,a,md,w,t,ss=1) {
    let dx = cosF(a);
    let dy = -sinF(a);
    let mag = Distance(0,0,dx,dy);
    dx = dx / mag;
    dy = dy / mag;
    let rv = {hit:false};

    for (let i = 0; i <= md && !rv.hit; i += ss) {
        for (let j=0; j < t.length; j++) {
            if (w[t[j]].Contains({x:x+dx*i,y:y+dy*i})) {
                rv.hit = true;
                rv.dist = i;
                rv.tidx = j;
                rv.hitpt = {x:x+dx*i,y:y+dy*i};
                rv.obj = w[t[j]];
                break;
            }
        }
    }

    return rv;
}

function Distance(x,y,x2,y2) {
    return Math.sqrt(Math.pow(x2-x,2)+Math.pow(y2-y,2));
}

// Area of Triangle Squared
// This function returns the area of a given triangle specified at 3 points.
function AOTS(p1,p2,p3) {
    let d1 = Distance(p1.x,p1.y,p2.x,p2.y);
    let d2 = Distance(p2.x,p2.y,p3.x,p3.y);
    let d3 = Distance(p1.x,p1.y,p3.x,p3.y);
    let s = (d1 + d2 + d3)/2;
    return s * (s - d1) * (s - d2) * (s - d3);
}

var SIN_LUT = [];
const SIN_LUT_DIVS = 1000;
const SIN_LUT_LEN = PI/2*SIN_LUT_DIVS;

let range = PI/2;
for (let i = 0; i < SIN_LUT_LEN+1; i++) {
    SIN_LUT.push(Math.sin(i/SIN_LUT_LEN*PI/2));
}

function sinF(ang) {
    while (ang > 2*PI) {
        ang -= 2*PI;
    }
    while (ang < 0) {
        ang += 2*PI;
    }

    let mod = 1;
    let inv = false;
    if (ang > 3*PI/2) {
        mod = -1;
        ang -= 3*PI/2;
        inv = true;
    } else if (ang > PI) {
        mod = -1;
        ang -= PI;
    } else if (ang > PI/2) {
        ang -= PI/2;
        inv = true;
    }

    if (inv) {
        return mod * SIN_LUT[Math.round((PI/2-ang)*SIN_LUT_DIVS)];;
    } else {
        return mod * SIN_LUT[Math.round(ang*SIN_LUT_DIVS)];;
    }
}

function cosF(ang) {
    return sinF(PI/2+ang);
}

function DrawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof stroke === 'undefined') {
        stroke = true;
    }
    if (typeof radius === 'undefined') {
        radius = 5;
    }
    if (typeof radius === 'number') {
        radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
        var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
        for (var side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
        }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) {
        ctx.fill();
    }
    if (stroke) {
        ctx.stroke();
    }
  
  }