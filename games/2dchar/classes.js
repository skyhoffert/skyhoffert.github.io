// Sky Hoffert
// Classes for 2dchar.

class Bone {
    constructor(x,y,l,a,t,c) {
        this.x = x;
        this.y = y;
        this.len = l;
        this.angle = a;
        this.thickness = t;
        this.color = c;
        this.children = [];
    }

    RotateTo(a) {
        this.angle = a;
        
        // TODO: adjust children
    }

    Draw(c) {
        let oldLW = c.lineWidth;
        c.lineWidth = this.len;
        c.strokeStyle = this.color;
        c.beginPath();
        c.moveTo(this.x, this.y);
        c.lineTo(this.x + this.len*Math.cos(this.angle), 
            this.y + this.len*-Math.sin(this.angle));
        c.stroke();
        c.lineWidth = oldLW;
    }
}
