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
        if (InCam(cam, this)) {
            let px = (-cam.x + cam.width/2 + this.x-this.width/2)/cam.zoom;
            let py = (-cam.y + cam.height/2 + this.y-this.height/2)/cam.zoom;
            c.strokeStyle = this.color;
            c.strokeRect(px, py, this.width/cam.zoom, this.height/cam.zoom);
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
        if (!InCam(cam, this)) { return; }

        c.strokeStyle = this.color;
        c.beginPath();
        c.moveTo((-cam.x + cam.width/2 + this.drawBox.topLeft.x)/cam.zoom,
            (-cam.y + cam.height/2 + this.drawBox.topLeft.y)/cam.zoom);
        c.lineTo((-cam.x + cam.width/2 + this.drawBox.topRight.x)/cam.zoom,
            (-cam.y + cam.height/2 + this.drawBox.topRight.y)/cam.zoom);
        c.lineTo((-cam.x + cam.width/2 + this.drawBox.bottomRight.x)/cam.zoom,
            (-cam.y + cam.height/2 + this.drawBox.bottomRight.y)/cam.zoom);
        c.lineTo((-cam.x + cam.width/2 + this.drawBox.bottomLeft.x)/cam.zoom,
            (-cam.y + cam.height/2 + this.drawBox.bottomLeft.y)/cam.zoom);
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
        this.wallSlideJumpVel = 0.014;
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
                if (this.collisions.bottom === -1) {
                    this.wallSliding = true;
                    this.canJump = true;
                } else {
                    this.wallSliding = false;
                }
            } else {
                if (this.wallSliding) {
                    this.canJump = false;
                    this.wallSliding = false;
                }
            }
        } else {
            // Bottom collision.
            this.vy = this.vy > 0 ? 0 : this.vy;
            this.y -= this.size - this.collisions.bottom + 1;
            this.canJump = true;
        }

        if (this.collisions.top !== -1) {
            this.vy = this.vy < 0 ? 0 : this.vy;
            this.y += this.size - this.collisions.top + 1;
        
        }

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
            if (this.wallSliding) {
                this.vy = this.jumpVelocity*1.2 * dT;
                this.canJump = false;
                if (this.collisions.left !== -1) {
                    this.vx = this.wallSlideJumpVel * dT;
                    this.x += 4;
                } else {
                    this.vx = -this.wallSlideJumpVel * dT;
                    this.x -= 4;
                }
            } else {
                this.jumpFrames++;
                if (this.jumpFrames >= this.maxJumpFrames) {
                    this.canJump = false;
                }
                this.vy = this.jumpVelocity * dT * (this.jumpFrames > this.maxJumpFrames/2 ? this.jumpFrames/3 : 1);
            }
        } else if (this.jumpFrames !== 0) {
            this.jumpFrames = 0;
            if (!this.keys[" "]) {
                this.canJump = false;
            }
        }

        if (this.collisions.left !== -1) {
            this.vx = this.vx < 0 ? 0 : this.vx;
            this.x += this.size - this.collisions.left + 1;
        } else if (this.collisions.right !== -1) {
            this.vx = this.vx > 0 ? 0 : this.vx;
            this.x -= this.size - this.collisions.right + 1;
        }

        this.y += this.vy * dT;
        this.x += this.vx * dT;
    }

    Collision(t) {
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};

        for (let i = 0; i < t.length; i++) {
            for (let h = 0; h < this.size+2; h++) {
                if (t[i].Contains(this.x, this.y + h)) {
                    if (h < this.collisions.bottom || this.collisions.bottom === -1) {
                        this.collisions.bottom = h;
                    }
                } else if (t[i].Contains(this.x - h, this.y)) {
                    if (h < this.collisions.left || this.collisions.left === -1) {
                        this.collisions.left = h;
                    }
                } else if (t[i].Contains(this.x + h, this.y)) {
                    if (h < this.collisions.right || this.collisions.right === -1) {
                        this.collisions.right = h;
                    }
                } else if (t[i].Contains(this.x, this.y - h)) {
                    if (h < this.collisions.top || this.collisions.top === -1) {
                        this.collisions.top = h;
                    }
                }
            }
        }
    }

    Draw(c,cam) {
        c.strokeStyle = this.color;
        c.beginPath();
        c.arc((-cam.x + cam.width/2 + this.x)/cam.zoom, (-cam.y + cam.height/2 + this.y)/cam.zoom,this.size/cam.zoom,0,pi*2);
        c.stroke();
    }
}

class SimpleEnemy {
    constructor(x,y) {
        this.x = x;
        this.y = y;
        this.vx = -0.08;
        this.vy = 0;
        this.grav = 0.0005;
        this.elapsed = 0;
        this.size = 14;
        this.color = "red";
        this.bounds = {left:x-this.size,right:x+this.size,top:y-this.size,bottom:y+this.size};
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};
    }

    Collision(t,p) {
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};

        for (let i = 0; i < t.length; i++) {
            for (let h = 0; h < this.size+2; h++) {
                if (t[i].Contains(this.x, this.y + h)) {
                    if (h < this.collisions.bottom || this.collisions.bottom === -1) {
                        this.collisions.bottom = h;
                    }
                } else if (t[i].Contains(this.x - h, this.y)) {
                    if (h < this.collisions.left || this.collisions.left === -1) {
                        this.collisions.left = h;
                    }
                } else if (t[i].Contains(this.x + h, this.y)) {
                    if (h < this.collisions.right || this.collisions.right === -1) {
                        this.collisions.right = h;
                    }
                } else if (t[i].Contains(this.x, this.y - h)) {
                    if (h < this.collisions.top || this.collisions.top === -1) {
                        this.collisions.top = h;
                    }
                }
            }
        }

        if (Distance(this.x,this.y,p.x,p.y) < this.size+p.size) {
            console.log("hit player");
        }
    }

    Tick(dT) {
        this.elapsed += dT/400;
        this.elapsed = this.elapsed > 100 ? this.elapsed-100 : this.elapsed;
        this.x += this.vx * dT * Math.abs(Math.cos(this.elapsed));
        this.bounds = {left:this.x-this.size,right:this.x+this.size,top:this.y-this.size,bottom:this.y+this.size};

        this.vy += this.grav * dT;

        if (this.collisions.bottom !== -1) {
            this.vy = 0;
            this.y -= this.size - this.collisions.bottom + 1;
        }

        this.y += this.vy * dT;

        if (this.collisions.left !== -1) {
            this.vx = this.vx < 0 ? -this.vx : this.vx;
        } else if (this.collisions.right !== -1) {
            this.vx = this.vx > 0 ? -this.vx : this.vx;
        }
    }

    Draw(c,cam) {
        if (!InCam(cam,this)){ return; }

        c.strokeStyle = this.color;
        c.beginPath();
        c.arc((-cam.x + cam.width/2 + this.x)/cam.zoom, (-cam.y + cam.height/2 + this.y)/cam.zoom,this.size/cam.zoom,0,pi*2);
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
        this.zoom = 1.0;
        this.defaultWidth = 800;
        this.defaultHeight = 600;
    }

    Zoom(f) {
        this.zoom *= f;
        this.width = this.defaultWidth * this.zoom;
        this.height = this.defaultHeight * this.zoom;
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
        this.bounds = {left:x-this.width/2,right:x+this.width/2,top:y-this.height/2,bottom:y+this.height/2};
    }

    Collision(p) {
        if (Distance(this.x,this.y,p.x,p.y) < p.size+this.width) {
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
        if (!InCam(cam,this)) { return; }

        c.strokeStyle = this.color;
        let wid = this.width * Math.cos(this.elapsed);
        c.strokeRect((-cam.x + cam.width/2 + this.x - wid/2)/cam.zoom, 
            (-cam.y + cam.height/2 + this.y - this.height/2)/cam.zoom,
            wid/cam.zoom, this.height/cam.zoom);
    }
}
