//
// Sky Hoffert
// Utility functions for ftdp.
//

function Distance(x,y,x2,y2) {
    return Math.sqrt(Math.pow(x2-x,2) + Math.pow(y2-y,2));
}

function AreaOfTri(p1,p2,p3) {
    let d1 = Distance(p1.x,p1.y,p2.x,p2.y);
    let d2 = Distance(p2.x,p2.y,p3.x,p3.y);
    let d3 = Distance(p1.x,p1.y,p3.x,p3.y);
    let s = (d1 + d2 + d3)/2;
    return Math.sqrt(s * (s - d1) * (s - d2) * (s - d3));
}

function InCam(cam,o) {
    let caml = cam.x - cam.width/2;
    let camr = cam.x + cam.width/2;
    let camt = cam.y - cam.height/2;
    let camb = cam.y + cam.height/2;
    return !(camr < o.bounds.left || caml > o.bounds.right ||
        camt > o.bounds.bottom || camb < o.bounds.top);
}

function HandleCollisions(o,t) {
    o.collisions = {left:-1,right:-1,top:-1,bottom:-1};

    for (let i = 0; i < t.length; i++) {
        for (let h = 0; h < o.size+2; h++) {
            if (t[i].Contains(o.x, o.y + h)) {
                if (h < o.collisions.bottom || o.collisions.bottom === -1) {
                    o.collisions.bottom = h;
                }
            } else if (t[i].Contains(o.x - h, o.y)) {
                if (h < o.collisions.left || o.collisions.left === -1) {
                    o.collisions.left = h;
                }
            } else if (t[i].Contains(o.x + h, o.y)) {
                if (h < o.collisions.right || o.collisions.right === -1) {
                    o.collisions.right = h;
                }
            } else if (t[i].Contains(o.x, o.y - h)) {
                if (h < o.collisions.top || o.collisions.top === -1) {
                    o.collisions.top = h;
                }
            }
        }
    }
}
