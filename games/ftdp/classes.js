//
// Sky Hoffert
// Classes for ftdp
//

// Terrain is immovable. One of either Rectangle or RotatedRectangle
class Terrain {
    // x,y is CENTER
    constructor(x,y,w,h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        // for quick access in collision
        this.bounds = {left:x-w/2,right:x+w/2,top:y-h/2,bottom:y+h/2};
        this.color = "#51e023";
    }

    Contains(){}
    Draw(c,cam){}
}

// Rectanlge is FLAT, or aligned with cartesian axis of world.
class Rectangle extends Terrain {
    constructor(x,y,w,h) {
        super(x,y,w,h);
    }

    Contains(x,y) {
        return x > this.bounds.left && x < this.bounds.right &&
            y > this.bounds.top && y < this.bounds.bottom;
    }

    Draw(c,cam) {
        c.strokeStyle = this.color;
        c.strokeRect(-cam.x + cam.width/2 + this.x-this.width/2, 
            -cam.y + cam.height/2 + this.y-this.height/2, this.width, this.height);
    }
}

// Rotated rectangle for collision. Angle must be between -pi/2 and pi/2.
class RotatedRectangle extends Terrain {
    constructor(x,y,w,h,a) {
        let phi = Math.atan2(h,w);
        let r = Distance(x,y,x+w/2,y+h/2);
        super(x,y,w,h);
        this.phi = phi;
        this.r = r;
        this.ang = a;
        if (a > 0) {
            this.bounds = {left:x+Math.cos(pi-phi+a)*r,right:x+Math.cos(-phi+a)*r,top:y-Math.sin(phi+a)*r,bottom:y-Math.sin(pi+phi+a)*r};
        } else {
            this.bounds = {left:x+Math.cos(pi+phi+a)*r,right:x+Math.cos(phi+a)*r,top:y-Math.sin(pi-phi+a)*r,bottom:y-Math.sin(-phi+a)*r};
        }
        this.drawBox = {topLeft:{x:this.x + Math.cos(pi-this.phi+this.ang)*this.r,y:this.y - Math.sin(pi-this.phi+this.ang)*this.r},
            topRight:{x:this.x + Math.cos(this.phi+this.ang)*this.r,y:this.y - Math.sin(this.phi+this.ang)*this.r},
            bottomRight:{x:this.x + Math.cos(-this.phi+this.ang)*this.r,y:this.y - Math.sin(-this.phi+this.ang)*this.r},
            bottomLeft:{x:this.x + Math.cos(pi+this.phi+this.ang)*this.r,y:this.y - Math.sin(pi+this.phi+this.ang)*this.r}};
    }

    Contains(x,y) {
        if (x < this.bounds.left || x > this.bounds.right ||
                y < this.bounds.top || y > this.bounds.bottom) {
            return false;
        }

        let area = Math.round(AreaOfTri(this.drawBox.topLeft,this.drawBox.topRight,{x:x,y:y}) +
            AreaOfTri(this.drawBox.topRight,this.drawBox.bottomRight,{x:x,y:y}) +
            AreaOfTri(this.drawBox.bottomRight,this.drawBox.bottomLeft,{x:x,y:y}) +
            AreaOfTri(this.drawBox.bottomLeft,this.drawBox.topLeft,{x:x,y:y}));
        let totArea = Math.round(this.width * this.height);
        
        return area <= totArea;
    }

    Draw(c,cam) {
        c.strokeStyle = this.color;
        c.beginPath();
        c.moveTo(-cam.x + cam.width/2 + this.drawBox.topLeft.x, 
            -cam.y + cam.height/2 + this.drawBox.topLeft.y);
        c.lineTo(-cam.x + cam.width/2 + this.drawBox.topRight.x, 
            -cam.y + cam.height/2 + this.drawBox.topRight.y);
        c.lineTo(-cam.x + cam.width/2 + this.drawBox.bottomRight.x, 
            -cam.y + cam.height/2 + this.drawBox.bottomRight.y);
        c.lineTo(-cam.x + cam.width/2 + this.drawBox.bottomLeft.x, 
            -cam.y + cam.height/2 + this.drawBox.bottomLeft.y);
        c.closePath();
        c.stroke();

        /* Bounding Box *
        c.strokeStyle = "#000077";
        c.strokeRect(this.bounds.left,this.bounds.top,this.bounds.right-this.bounds.left,this.bounds.bottom-this.bounds.top);
        /* */
    }
}

class Player {
    constructor(x,y,s,c) {
        this.x = x;
        this.y = y;
        this.size = s;
        this.color = c;
        this.vx = 0;
        this.vy = 0;
        this.keys = {a:false,d:false,s:false,w:false};
        this.keyUpdates = [];
        this.horizontalAccel = 0.02;
        this.horizontalFriction = 0.004;
        this.horizontalMaxVel = 8;
        this.jumpVelocity = -0.3;
        this.fallFactor = 1.1;
        this.wallSlideSpeed = 0.08;
        this.canJump = false;
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};
    }

    Tick(dT) {
        for (let i = 0; i < this.keyUpdates.length; i++) {
            this.keys[this.keyUpdates[i].key] = this.keyUpdates[i].down;
        }
        this.keyUpdates = [];

        this.vy += this.vy > 0 ? (GRAV * this.fallFactor) * dT: GRAV * dT;
        if ((this.collisions.left !== -1 || this.collisions.right !== -1) && this.vy > 0) {
            // If "sliding" on a wall.
            this.vy = this.vy > this.wallSlideSpeed ? this.wallSlideSpeed : this.vy;
        }
        this.y += this.vy * dT;

        if (this.keys.a) {
            this.vx -= this.horizontalAccel * dT;
            this.vx = this.vx < -this.horizontalMaxVel ? -this.horizontalMaxVel : this.vx;
        } else if (this.keys.d) {
            this.vx += this.horizontalAccel * dT;
            this.vx = this.vx > this.horizontalMaxVel ? this.horizontalMaxVel : this.vx;
        } else {
            this.vx -= Math.sign(this.vx) * this.horizontalFriction * dT;
        }
        
        if (this.keys[" "] && this.canJump) {
            this.vy = this.jumpVelocity;
            this.canJump = false;
        }

        this.x += this.vx;
    }

    Collision(t) {
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};

        for (let i = 0; i < t.length; i++) {
            for (let h = 0; h < this.size; h++) {
                if (t[i].Contains(this.x, this.y + h)) {
                    // Bottom
                    this.vy = this.vy > 0 ? 0 : this.vy;
                    this.y -= this.size - h - 1;
                    this.canJump = true;
                    this.collisions.bottom = h;
                } else if (t[i].Contains(this.x - h, this.y)) {
                    // Left
                    this.vx = 0;
                    this.x += this.size - h - 1;
                    this.collisions.left = h;
                } else if (t[i].Contains(this.x + h, this.y)) {
                    // Right
                    this.vx = 0;
                    this.x -= this.size - h - 1;
                    this.collisions.right = h;
                } else if (t[i].Contains(this.x, this.y - h)) {
                    // Top
                    this.vy = 0;
                    this.y += this.size - h - 1;
                    this.collisions.top = h;
                }
            }
        }
    }

    Draw(c,cam) {
        c.strokeStyle = this.color;
        c.beginPath();
        c.arc(-cam.x + cam.width/2 + this.x, -cam.y + cam.height/2 + this.y,this.size,0,pi*2);
        c.stroke();
    }
}

class Camera {
    constructor(x,y,w,h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.bottomBound = 0;
        this.target = null;
    }

    Tick(dT) {
        if (!this.target) { return; }

        this.x = this.target.x;
        this.y -= (this.y - (this.target.y-40))*0.2;

        if (this.y + this.height/2 > this.bottomBound) {
            this.y -= this.y + this.height/2 - this.bottomBound;
        }
    }
}
