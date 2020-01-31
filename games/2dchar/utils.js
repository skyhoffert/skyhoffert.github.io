// Sky Hoffert
// Utility things for 2dchar.

var SIN_LUT = [];
const SIN_LUT_DIVS = 1000;
const SIN_LUT_LEN = pi/2*SIN_LUT_DIVS;

let range = pi/2;
for (let i = 0; i < SIN_LUT_LEN+1; i++) {
    SIN_LUT.push(Math.sin(i/SIN_LUT_LEN*pi/2));
}

function sinF(ang) {
    while (ang > 2*pi) {
        ang -= 2*pi;
    }
    while (ang < 0) {
        ang += 2*pi;
    }

    let mod = 1;
    let inv = false;
    if (ang > 3*pi/2) {
        mod = -1;
        ang -= 3*pi/2;
        inv = true;
    } else if (ang > pi) {
        mod = -1;
        ang -= pi;
    } else if (ang > pi/2) {
        ang -= pi/2;
        inv = true;
    }

    if (inv) {
        return mod * SIN_LUT[Math.round((pi/2-ang)*SIN_LUT_DIVS)];;
    } else {
        return mod * SIN_LUT[Math.round(ang*SIN_LUT_DIVS)];;
    }
}

function cosF(ang) {
    return sinF(pi/2+ang);
}
