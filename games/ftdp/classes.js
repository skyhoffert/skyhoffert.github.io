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

    // To be overriden.
    Contains(){}
    Draw(c,cam){}

    // For all terrain types.
    _InCam(cam) {
        let caml = cam.x - cam.width/2;
        let camr = cam.x + cam.width/2;
        let camt = cam.y - cam.height/2;
        let camb = cam.y + cam.height/2;
        return !(camr < this.bounds.left || caml > this.bounds.right ||
            camt > this.bounds.bottom || camb < this.bounds.top);
    }
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
        if (this._InCam(cam)) {
            let px = -cam.x + cam.width/2 + this.x-this.width/2;
            let py = -cam.y + cam.height/2 + this.y-this.height/2;
            c.strokeStyle = this.color;
            c.strokeRect(px, py, this.width, this.height);
        }
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
        this.horizontalAccel = 0.0008;
        this.horizontalFriction = 0.0004;
        this.horizontalMaxVel = 0.017;
        this.horizontalMinVel = 0.001;
        this.jumpVelocity = -0.011;
        this.fallFactor = 1.1;
        this.wallSlideSpeed = 0.08;
        this.canJump = false;
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};
        this.jumpFrames = 0;
        this.maxJumpFrames = 6;
        this.grav = 0.0008;
        this.coins = 0;
    }

    ResetKeys() {
        this.keys = {a:false,d:false,s:false,w:false};
    }

    CollectCoins(v) {
        this.coins += v;
        console.log("player now has "+this.coins+" coins");
    }

    Tick(dT) {
        for (let i = 0; i < this.keyUpdates.length; i++) {
            this.keys[this.keyUpdates[i].key] = this.keyUpdates[i].down;
        }
        this.keyUpdates = [];

        if (this.collisions.bottom === -1) {
            this.vy += this.vy > 0 ? (this.grav * this.fallFactor) * dT: this.grav * dT;
            if ((this.collisions.left !== -1 || this.collisions.right !== -1) && this.vy > 0) {
                // If "sliding" on a wall.
                this.vy = this.vy > this.wallSlideSpeed ? this.wallSlideSpeed : this.vy;
            }
        }
        this.y += this.vy * dT;

        if (this.keys.a) {
            this.vx -= this.horizontalAccel * dT;
            this.vx = this.vx < -this.horizontalMaxVel*dT ? -this.horizontalMaxVel*dT : this.vx;
        } else if (this.keys.d) {
            this.vx += this.horizontalAccel * dT;
            this.vx = this.vx > this.horizontalMaxVel*dT ? this.horizontalMaxVel*dT : this.vx;
        } else {
            if (Math.abs(this.vx) > this.horizontalMinVel) {
                this.vx -= Math.sign(this.vx) * this.horizontalFriction * dT;
            } else {
                this.vx = 0;
            }
        }
        
        if (this.keys[" "] && this.canJump) {
            this.jumpFrames++;
            if (this.jumpFrames >= this.maxJumpFrames) {
                this.canJump = false;
            }
            this.vy = this.jumpVelocity * dT * (this.jumpFrames > this.maxJumpFrames/2 ? this.jumpFrames/3 : 1);
        } else if (this.jumpFrames !== 0) {
            this.jumpFrames = 0;
            if (!this.keys[" "]) {
                this.canJump = false;
            }
        }

        this.x += this.vx * dT;
    }

    Collision(t) {
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};

        for (let i = 0; i < t.length; i++) {
            for (let h = 0; h < this.size+2; h++) {
                if (t[i].Contains(this.x, this.y + h)) {
                    // Bottom
                    this.vy = this.vy > 0 ? 0 : this.vy;
                    this.y -= this.size - h + 1;
                    this.canJump = true;
                    this.collisions.bottom = h;
                } else if (t[i].Contains(this.x - h, this.y)) {
                    // Left
                    this.vx = 0;
                    this.x += this.size - h + 1;
                    this.collisions.left = h;
                } else if (t[i].Contains(this.x + h, this.y)) {
                    // Right
                    this.vx = 0;
                    this.x -= this.size - h + 1;
                    this.collisions.right = h;
                } else if (t[i].Contains(this.x, this.y - h)) {
                    // Top
                    this.vy = 0;
                    this.y += this.size - h + 1;
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

class Coin {
    constructor(x,y) {
        this.x = x;
        this.y = y;
        this.value = 1;
        this.width = 20;
        this.height = 20;
        this.color = "cyan";
        this.elapsed = 0;
    }

    Collision(p) {
        if (this.x > p.x - p.size*1.2 && this.x < p.x + p.size*1.2 &&
            this.y > p.y - p.size*1.2 && this.y < p.y + p.size*1.2) {
            return true;
        }
        return false;
    }

    Tick(dT) {
        this.elapsed += dT/250;
        if (this.elapsed > 2*pi) {
            this.elapsed -= 2*pi;
        }
    }

    Draw(c,cam) {
        c.strokeStyle = this.color;
        let wid = this.width * Math.cos(this.elapsed);
        c.strokeRect(-cam.x + cam.width/2 + this.x - wid/2, -cam.y + cam.height/2 + this.y - this.height/2,
            wid, this.height);
    }
}
