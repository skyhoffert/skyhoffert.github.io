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

    AddChild(c) {
        this.children.push({ang:Math.atan2(c.y,c.x),r:Math.sqrt(Math.pow(c.x,2)+Math.pow(c.y,2)),obj:c});
        c.x += this.x;
        c.y += this.y;
    }

    Move(dx,dy) {
        this.x += dx;
        this.y += dy;

        // TODO: adjust children
    }

    MoveTo(x,y) {
        this.x = x;
        this.y = y;

        // TODO: adjust children
    }

    RotateTo(a) {
        this.angle = a;
        
        // TODO: adjust children
    }

    Rotate(dA) {
        this.angle += dA;

        for (let i = 0; i < this.children.length; i++) {
            let c = this.children[i];
            let ang = c.ang + this.angle;
            c.obj.x = this.x + c.r*cosF(ang);
            c.obj.y = this.y - c.r*sinF(ang);
            c.obj.Rotate(dA);
        }
    }

    Tick(dT) {}

    Draw(c) {
        let oldLW = c.lineWidth;
        c.lineWidth = this.thickness;
        c.strokeStyle = this.color;
        c.beginPath();
        c.moveTo(this.x, this.y);
        c.lineTo(this.x + this.len*cosF(this.angle), 
            this.y + this.len*-sinF(this.angle));
        c.stroke();
        c.lineWidth = oldLW;
    }
}
