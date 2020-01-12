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
