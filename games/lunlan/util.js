//
// Sky Hoffert
// Utility Functions.
//

function DrawRect(c,lx,ly,w,h) {
    c.beginPath();
    c.rect(lx,ly,w,h);
    c.closePath();
}

function DrawRectCenter(c,x,y,w,h) {
    DrawRect(c,x-w/2,y-h/2,w,h);
}

function DrawPolygon(c,pts,cx,cy) {
    c.beginPath();
    for (let i = 0; i < pts.length; i++) {
        if (i === 0) {
            c.moveTo(pts[i].x + cx, pts[i].y + cy);
        } else {
            c.lineTo(pts[i].x + cx, pts[i].y + cy);
        }
    }
    c.closePath();
}

function DrawAnglePolygon(c,pts,cx,cy,a) {
    c.beginPath();
    for (let i = 0; i < pts.length; i++) {
        if (i === 0) {
            c.moveTo(Math.cos(a+pts[i].a)*pts[i].r + cx, 
            -Math.sin(a+pts[i].a)*pts[i].r + cy);
        } else {
            c.lineTo(Math.cos(a+pts[i].a)*pts[i].r + cx, 
            -Math.sin(a+pts[i].a)*pts[i].r + cy);
        }
    }
    c.closePath();
}

function DrawPt(c,p) {
    c.beginPath();
    c.rect(p.x,p.y,2,2);
    c.closePath();
    c.fill();
}

function DrawPtAngle(c,cx,cy,ang,r) {
    c.beginPath();
    c.rect(cx + Math.cos(ang)*r,cy - Math.sin(ang)*r,2,2);
    c.closePath();
    c.fill();
}

function Distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x+p2.x,2) + Math.pow(p1.y+p2.y,2));
}

function Magnitude(p) {
    return Math.sqrt(p.x*p.x + p.y*p.y);
}

function RotatePtsAroundPt(pts,p,a) {
    for (let i = 0; i < pts.length; i++) {
        let mag = Magnitude({x:pts[i].y-p.y,y:pts[i].x-p.x});
        let ang = Math.atan2(pts[i].y - p.y, pts[i].x - p.x);
        console.log(mag);
        ang += a;
        pts[i].x = Math.cos(ang) * mag;
        pts[i].y = Math.sin(ang) * mag;
    }
}

function AreaOfTri(p1,p2,p3) {
    let d1 = Distance(p1,p2);
    let d2 = Distance(p2,p3);
    let d3 = Distance(p1,p3);
    let s = (d1 + d2 + d3)/2;
    return Math.sqrt(s * (s - d1) * (s - d2) * (s - d3));
}

class Lurker {
    constructor(cb, d=function(ctx){}) {
        this.cb = cb;
        this.d = d;
        this.elapsed = 0;
        this.active = true;
        this.vals = {good:false}; // Can hold additional values per lurker.
    }

    Tick(dT) {
        if (!this.active) { return; }

        this.elapsed += dT;

        this.active = this.cb(dT);
    }

    Draw(ctx) {
        this.d(ctx);
    }
}
