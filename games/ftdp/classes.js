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
            c.fillStyle = BG_COLOR;
            c.fillRect(px, py, this.width/cam.zoom, this.height/cam.zoom);
            c.strokeStyle = this.color;
            c.strokeRect(px, py, this.width/cam.zoom, this.height/cam.zoom);
        }
    }
}

// Rotated rectangle for collision. Angle must be between -pi/2 and pi/2.
class RotatedRectangle extends Terrain {
    constructor(x,y,w,h,a,to=false) {
        let phi = Math.atan2(h,w);
        let r = Distance(x,y,x+w/2,y+h/2);
        super(x,y,w,h);
        this.phi = phi;
        this.r = r;
        this.ang = a;
        this.topOnly = to;
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

        let pt1 = {x:(-cam.x + cam.width/2 + this.drawBox.topLeft.x)/cam.zoom,
            y:(-cam.y + cam.height/2 + this.drawBox.topLeft.y)/cam.zoom};
        let pt2 = {x:(-cam.x + cam.width/2 + this.drawBox.topRight.x)/cam.zoom,
            y:(-cam.y + cam.height/2 + this.drawBox.topRight.y)/cam.zoom};
        let pt3 = {x:(-cam.x + cam.width/2 + this.drawBox.bottomRight.x)/cam.zoom,
            y:(-cam.y + cam.height/2 + this.drawBox.bottomRight.y)/cam.zoom};
        let pt4 = {x:(-cam.x + cam.width/2 + this.drawBox.bottomLeft.x)/cam.zoom,
            y:(-cam.y + cam.height/2 + this.drawBox.bottomLeft.y)/cam.zoom};

        c.fillStyle = BG_COLOR;
        c.beginPath();
        c.moveTo(pt1.x, pt1.y);
        c.lineTo(pt2.x, pt2.y);
        c.lineTo(pt3.x, pt3.y);
        c.lineTo(pt4.x, pt4.y);
        c.closePath();
        c.fill();

        if (this.topOnly) {c.strokeStyle = this.color;
            c.beginPath();
            c.moveTo(pt1.x, pt1.y);
            c.lineTo(pt2.x, pt2.y);
            c.stroke();
        } else {
            c.strokeStyle = this.color;
            c.beginPath();
            c.moveTo(pt1.x, pt1.y);
            c.lineTo(pt2.x, pt2.y);
            c.lineTo(pt3.x, pt3.y);
            c.lineTo(pt4.x, pt4.y);
            c.closePath();
            c.stroke();
        }

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
        this.bounds = {left:x-s,right:x+s,top:y-s,bottom:y+s};
        this.vx = 0;
        this.vy = 0;
        this.keys = {a:false,d:false,s:false,w:false};
        this.keyUpdates = [];
        this.horizontalAccel = 0.0008*3;
        this.horizontalFriction = 0.0004*4;
        this.horizontalMaxVel = 0.017;
        this.horizontalMinVel = 0.05;
        this.jumpVelocity = -0.011;
        this.jumpFrames = 0;
        this.maxJumpFrames = 6;
        this.fallFactor = 1.1;
        this.wallSlideSpeed = 0.08;
        this.wallSlideJumpVel = 0.02;
        this.wallJumpDisplacement = 8;
        this.wallJumpDummyTime = 0;
        this.wallJumpDummyTimeMax = 0.15;
        this.wallJumpYFactor = 1.2;
        this.canJump = false;
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};
        this.grav = 0.0008;
        this.coins = 0;
        this.offworld = {left:-500,right:10000,top:-1000,bottom:0};
        this.spawn = {x:x,y:y};
        this.maxHits = 2; // DEBUG
        this.currentHits = this.maxHits;
        this.iframeTime = 0;
        this.iframeTimeMax = 2;
        this.iframeColor = "gray";
        this.startLocked = true;
        this.isDrawn = true;

        this.elapsed = 0;

        // DEBUG
        this.debugMoveMode = 0;
    }

    ResetKeys() {
        this.keys = {a:false,d:false,s:false,w:false};
    }

    Respawn() {
        this.currentHits = this.maxHits;
        this.iframeTime = 0;
        this.startLocked = true;
        this.canJump = false;
        this.x = this.spawn.x;
        this.y = this.spawn.y;
        this.vx = 0;
        this.vy = 0;
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};
        this.isDrawn = true;
    }

    CollectCoins(v) {
        this.coins += v;
        console.log("player now has "+this.coins+" coins");
    }

    Hit() {
        if (this.iframeTime <= 0) {
            this.currentHits--;
            this.iframeTime = this.iframeTimeMax;
        }

        if (this.currentHits === 0) {
            this.Respawn();
        }
    }

    Tick(dT) {
        for (let i = 0; i < this.keyUpdates.length; i++) {
            this.keys[this.keyUpdates[i].key] = this.keyUpdates[i].down;
            if (this.keyUpdates[i].key === "p" && this.keyUpdates[i].down === true) {
                this.debugMoveMode = Math.abs(this.debugMoveMode - 1);
            }
        }
        this.keyUpdates = [];

        this.elapsed += dT/1000;

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
            this.wallSliding = false;
            this.startLocked = false;
        }

        if (this.collisions.top !== -1) {
            this.vy = this.vy < 0 ? 0 : this.vy;
            this.y += this.size - this.collisions.top + 1;
        
        }

        if (this.startLocked) {
        } else if (this.wallJumpDummyTime >= 0) {
            this.wallJumpDummyTime -= dT/1000;
        } else {
            if (this.keys.a) {
                this.vx -= this.horizontalAccel * dT;

                if (this.debugMoveMode === 1) {
                    this.vx = -this.horizontalMaxVel * 3/4 * dT;
                }

                this.vx = this.vx < -this.horizontalMaxVel*dT ? -this.horizontalMaxVel*dT : this.vx;
            } else if (this.keys.d) {
                this.vx += this.horizontalAccel * dT;

                if (this.debugMoveMode === 1) {
                    this.vx = this.horizontalMaxVel * 3/4 * dT;
                }
                this.vx = this.vx > this.horizontalMaxVel*dT ? this.horizontalMaxVel*dT : this.vx;
            } else {
                if (Math.abs(this.vx) > this.horizontalMinVel) {
                    this.vx -= Math.sign(this.vx) * this.horizontalFriction * dT;
                } else {
                    this.vx = 0;
                }
                if (this.debugMoveMode === 1) {
                    this.vx = 0;
                }
            }
        }
        
        if (this.keys[" "] && this.canJump) {
            if (this.wallSliding) {
                this.vy = this.jumpVelocity*this.wallJumpYFactor * dT;
                this.canJump = false;
                if (this.collisions.left !== -1) {
                    this.vx = this.wallSlideJumpVel * dT;
                    this.x += this.wallJumpDisplacement;
                    this.wallJumpDummyTime = this.wallJumpDummyTimeMax;
                } else {
                    this.vx = -this.wallSlideJumpVel * dT;
                    this.x -= this.wallJumpDisplacement;
                    this.wallJumpDummyTime = this.wallJumpDummyTimeMax;
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

        this.bounds = {left:this.x-this.size,right:this.x+this.size,
            top:this.y-this.size,bottom:this.y+this.size};

        if (this.y > this.offworld.bottom) {
            console.log("player is off screen");
            this.Respawn();
        }

        if (this.iframeTime > 0) {
            this.iframeTime -= dT/1000;
        }
    }

    Collision(t) {
        HandleCollisions(this,t);
    }

    Draw(c,cam) {
        // TODO: This draws the player above terrain if they have collision.
        //       This occurs because collision is done AFTER Tick, and does not modify player
        //       position at all.
        if (this.isDrawn) {
            let collOffsetY = this.collisions.bottom === -1 ? 0 : this.size - this.collisions.bottom;
            let collOffsetX = this.collisions.left === -1 ? this.collisions.right === -1 ? 0 : 
                -(this.size - this.collisions.right) : this.size - this.collisions.left;

            if (this.iframeTime > 0) {
                c.strokeStyle = this.iframeColor;
            } else {
                c.strokeStyle = this.color;
            }
            c.beginPath();
            c.arc((-cam.x + cam.width/2 + this.x + collOffsetX)/cam.zoom, (-cam.y + cam.height/2 + this.y - collOffsetY)/cam.zoom,this.size/cam.zoom,0,pi*2);
            c.stroke();
        }

        // Don't affect line width by scale.
        let oldLineWidth = c.lineWidth;
        c.lineWidth = 2;

        // Draw hits information.
        let hitsSize = 10;
        let hitsSpacing = 4;
        let hitsX = WIDTH/2 - this.maxHits*hitsSize + hitsSize - hitsSpacing*(this.maxHits-1)/2;
        let hitsY = HEIGHT - hitsSize - 5;
        for (let i = 0; i < this.maxHits; i++) {
            c.beginPath();
            c.arc(hitsX + i*(hitsSpacing+2*hitsSize), hitsY, hitsSize, 0, 2*pi);
            if (i < this.currentHits) {
                c.fillStyle = "#444488";
                c.fill();
            }
            c.strokeStyle = "#aaaaff";
            c.stroke();
        }

        // Draw coins information.
        let coinSymbolSize = hitsSize*2;
        let coinWid = Math.cos(this.elapsed) * coinSymbolSize;
        let coinSymbolSpace = 5;
        let coinsX = coinSymbolSpace;
        let coinsY = HEIGHT - coinSymbolSpace - coinSymbolSize;
        c.strokeStyle = "cyan";
        c.strokeRect(coinsX + coinSymbolSize/2 - coinWid/2, coinsY, coinWid, coinSymbolSize);
        c.font = ""+coinSymbolSize+"px Verdana";
        c.fillStyle = "cyan";
        c.fillText(""+this.coins, coinSymbolSize + coinSymbolSpace*2, HEIGHT-coinSymbolSpace-2);

        c.lineWidth = oldLineWidth;
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
            p.Hit();
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
    constructor(x,y,w,h,z=1.0) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.bounds = {left:-500,right:10000,bottom:0,top:100000};
        this.target = null;
        this.zoom = z;
        this.defaultWidth = 800;
        this.defaultHeight = 600;
        this.horizontalFactor = 0.15;
        this.verticalFactor = 0.1;
        this.velocityGain = 200;
        this.maxMove = 11;
        this.maxZoom = 2;
        this.minZoom = 0.5;
    }

    Zoom(f, s=false) {
        if (s) {
            this.zoom = f;
        } else {
            this.zoom *= f;
        }

        if (this.zoom > this.maxZoom) {
            this.zoom = this.maxZoom;
        } else if (this.zoom < this.minZoom) {
            this.zoom = this.minZoom;
        }
        
        this.width = this.defaultWidth * this.zoom;
        this.height = this.defaultHeight * this.zoom;
    }

    Tick(dT) {
        if (!this.target) { return; }

        if (!InCam(this,this.target)) {
            this.x = this.target.x + this.width/2;
            this.y = this.target.y + this.height/2;
            return;
        }

        // "Lead" the target if it has horizontal velocity.
        if (this.target.vx) {
            let mv = (this.x - (this.target.x + this.target.vx*this.velocityGain))*this.horizontalFactor;
            mv = Math.abs(mv) > this.maxMove ? this.maxMove * Math.sign(mv) : mv;
            this.x -= mv;
        } else {
            let mv = (this.x - (this.target.x + this.target.vx*this.velocityGain))*this.horizontalFactor;
            mv = Math.abs(mv) > this.maxMove ? this.maxMove * Math.sign(mv) : mv;
            this.x -= mv;
        }

        if (this.x - this.width/2 < this.bounds.left) {
            this.x -= this.x - this.width/2 - this.bounds.left;
        }

        this.y -= (this.y - (this.target.y-40))*this.verticalFactor;

        if (this.y + this.height/2 > this.bounds.bottom) {
            this.y -= this.y + this.height/2 - this.bounds.bottom;
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

class BGShape {
    constructor(x,y,d,c,pts) {
        this.x = x;
        this.y = y;
        this.distance = d;
        this.pts = pts;
        this.color = c;
    }

    Draw(c,cam) {
        let px = (-cam.x + cam.width/2 + this.x)/cam.zoom/(1+this.distance);
        let py = (-cam.y + cam.height/2 + this.y)/cam.zoom/(1.1);
        c.fillStyle = BG_COLOR;
        c.strokeStyle = this.color;
        c.beginPath();
        c.moveTo(px + this.pts[0].x/cam.zoom, py + this.pts[0].y/cam.zoom);
        for (let i = 1; i < this.pts.length; i++) {
            c.lineTo(px + this.pts[i].x/cam.zoom, py + this.pts[i].y/cam.zoom);
        }
        c.closePath();
        c.fill();
        c.stroke();
    }
}

class BGRect {
    constructor(x,y,w,h,d,c) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.color = c;
        this.distance = d;
        this.bounds = {left:x-w/2,right:x+w/2,top:y-h/2,bottom:y+h/2};
    }

    Draw(c, cam) {
        // DEBUG
        //if (InCam(cam,this)) {
            let px = (-cam.x + cam.width/2 + this.x)/cam.zoom/(1+this.distance);
            let py = (-cam.y + cam.height/2 + this.y)/cam.zoom/(1.1);
            c.fillStyle = BG_COLOR;
            c.strokeStyle = this.color;
            c.rect(px-this.width/2/cam.zoom,py-this.height/2/cam.zoom,
                this.width/cam.zoom,this.height/cam.zoom);
            c.fill();
            c.stroke();
        //}
    }
}
