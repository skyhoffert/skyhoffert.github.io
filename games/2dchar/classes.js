// Sky Hoffert
// Classes for 2dchar.

class HumanBody {
    constructor(x,y) {
        this.x = x;
        this.y = y;
        this.bones = [];

        this.bones.push(new Bone(this.x,this.y,40,pi/2,4,"red")); // Main torso bone. 0
        this.bones.push(new Bone(0,-35,25,pi,4,"blue")); // Main left shoulder. 1
        this.bones[0].AddChild(this.bones[1]);
        this.bones.push(new Bone(-25,0,20,-pi/2,4,"blue")); // Main left forearm. 2
        this.bones[1].AddChild(this.bones[2]);
        this.bones.push(new Bone(0,-35,25,0,4,"green")); // Main right shoulder. 3
        this.bones[0].AddChild(this.bones[3]);
        this.bones.push(new Bone(25,0,20,-pi/2,4,"green")); // Main right forearm. 4
        this.bones[3].AddChild(this.bones[4]);
        this.bones.push(new Bone(0,-50,10,pi/2,4,"yellow","circle")); // Head. 5
        this.bones[0].AddChild(this.bones[5]);
        this.bones.push(new Bone(0,0,30,-pi/2,4,"cyan")); // Main left calf. 6
        this.bones[0].AddChild(this.bones[6]);
        this.bones.push(new Bone(0,30,20,-pi*7/16,4,"cyan")); // Main left shin. 7
        this.bones[6].AddChild(this.bones[7]);
        this.bones.push(new Bone(0,0,30,0,4,"pink")); // Main right calf. 8
        this.bones[0].AddChild(this.bones[8]);
        this.bones.push(new Bone(30,0,20,-pi*9/16,4,"pink")); // Main right shin. 9
        this.bones[8].AddChild(this.bones[9]);
    }

    Tick(dT) {
        for (let i = 0; i < this.bones.length; i++) {
            this.bones[i].Tick(dT);
        }
    }

    Draw(c) {
        for (let i = 0; i < this.bones.length; i++) {
            this.bones[i].Draw(c);
        }
    }
}

class Bone {
    constructor(x,y,l,a,t,c,type="line") {
        this.x = x;
        this.y = y;
        this.len = l;
        this.angle = a;
        this.thickness = t;
        this.color = c;
        this.children = [];
        this.type = type;
    }

    AddChild(c) {
        this.children.push({ang:Math.atan2(c.y,c.x)+this.angle,r:Math.sqrt(Math.pow(c.x,2)+Math.pow(c.y,2)),obj:c});
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
        if (this.type === "line") {
        c.moveTo(this.x, this.y);
        c.lineTo(this.x + this.len*cosF(this.angle), 
            this.y + this.len*-sinF(this.angle));
        } else if (this.type === "circle") {
            c.arc(this.x,this.y,this.len,0,2*pi);
        }
        c.stroke();
        c.lineWidth = oldLW;
    }
}
