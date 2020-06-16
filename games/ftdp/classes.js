//
// Sky Hoffert
// Classes for ftdp
//

// Terrain is immovable. One of either Rectangle or RotatedRectangle
class Terrain {
    // x,y is CENTER
    constructor(x,y,w,h,hf) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        // for quick access in collision
        this.bounds = {left:x-w/2,right:x+w/2,top:y-h/2,bottom:y+h/2};
        this.harmful = hf;
        if (this.harmful) {
            this.color = "red";
            this.colorFill = "#040000";
        } else {
            this.color = "#51e023";
            this.colorFill = "#000400";
        }
    }

    // To be overriden.
    Contains(x,y){}
    Tick(dT){}
    Draw(c,cam){}
}

// Rectanlge is FLAT, or aligned with cartesian axis of world.
class Rectangle extends Terrain {
    constructor(x,y,w,h,hf=false) {
        super(x,y,w,h,hf);
        this.hasCollision = true;
    }

    Contains(x,y) {
        if (!this.hasCollision) { return false; }
        
        return x > this.bounds.left && x < this.bounds.right &&
            y > this.bounds.top && y < this.bounds.bottom;
    }

    Draw(c,cam) {
        if (InCam(cam, this)) {
            let px = (-cam.x + cam.width/2 + this.x-this.width/2)/cam.zoom;
            let py = (-cam.y + cam.height/2 + this.y-this.height/2)/cam.zoom;
            c.fillStyle = this.colorFill;
            c.fillRect(px, py, this.width/cam.zoom, this.height/cam.zoom);
            c.strokeStyle = this.color;
            c.strokeRect(px, py, this.width/cam.zoom, this.height/cam.zoom);
        }
    }
}

// Rotated rectangle for collision. Angle must be between -pi/2 and pi/2.
class RotatedRectangle extends Terrain {
    constructor(x,y,w,h,a,to=false,hf=false) {
        let phi = Math.atan2(h,w);
        let r = Distance(x,y,x+w/2,y+h/2);
        super(x,y,w,h,hf);
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

        c.fillStyle = this.colorFill;
        c.beginPath();
        c.moveTo(pt1.x, pt1.y);
        c.lineTo(pt2.x, pt2.y);
        c.lineTo(pt3.x, pt3.y);
        c.lineTo(pt4.x, pt4.y);
        c.closePath();
        c.fill();

        if (this.topOnly) {
            c.strokeStyle = this.color;
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

class BlockBlade extends Terrain {
    constructor(x,y,s,sr,p1=null,p2=null,spd=0) {
        super(x,y,s,s,true);
        this.spinRate = sr;
        this.angle = 0;
        this.bounds = {left:x-s/sqrt2,right:x+s/sqrt2,top:y-s/sqrt2,bottom:y+s/sqrt2};
        this.elapsed = 0;
        this.pt1 = p1;
        this.pt2 = p2;
        this.transitionSpeed = spd;
        this.timeInTransition = this.transitionSpeed;
        this.goingToPt2 = true;
        this.colorDark = "darkred";
    }

    Contains(x,y) {
        return x > this.bounds.left && x < this.bounds.right &&
            y > this.bounds.top && y < this.bounds.bottom;
    }

    Tick(dT) {
        this.angle += this.spinRate * dT;
        this.elapsed += dT;

        if (this.pt1 && this.pt2) {
            let pc = this.timeInTransition / this.transitionSpeed;
            if (this.goingToPt2) {
                this.x = (this.pt2.x - this.pt1.x) * pc + this.pt1.x;
                this.y = (this.pt2.y - this.pt1.y) * pc + this.pt1.y;
            } else {
                this.x = (this.pt1.x - this.pt2.x) * pc + this.pt2.x;
                this.y = (this.pt1.y - this.pt2.y) * pc + this.pt2.y;
            }

            if (this.timeInTransition > 0) {
                this.timeInTransition -= dT/1000;
            } else {
                this.timeInTransition = this.transitionSpeed;
                this.goingToPt2 = !this.goingToPt2;
            }

            this.bounds = {left:this.x-this.width/sqrt2,right:this.x+this.width/sqrt2,
                top:this.y-this.height/sqrt2,bottom:this.y+this.height/sqrt2};
        }
    }

    Draw(c,cam) {
        if (this.pt1 !== null && this.pt2 !== null) {
            let preCheckBounds = JSON.parse(JSON.stringify(this.bounds));
            let leftmost = this.pt1.x < this.pt2.x ? this.pt1 : this.pt2;
            let topmost = this.pt1.y < this.pt2.y ? this.pt1 : this.pt2;
            let rightmost = this.pt1.x > this.pt2.x ? this.pt1 : this.pt2;
            let bottommost = this.pt1.y > this.pt2.y ? this.pt1 : this.pt2;
            this.bounds = {left:leftmost.x - this.width,right:rightmost.x + this.width,
                top:topmost - this.height,bottom:bottommost + this.height};
            if (!InCam(cam, this)) { return; }
            this.bounds = JSON.parse(JSON.stringify(preCheckBounds));
        } else {
            if (!InCam(cam, this)) { return; }
        }
        

        // Darker blade
        c.beginPath();
        c.moveTo((-cam.x + cam.width/2 + this.x+Math.cos(this.angle+pi/3)*this.width)/cam.zoom,
            (-cam.y + cam.height/2 + this.y - Math.sin(this.angle+pi/3)*this.height)/cam.zoom);
        c.lineTo((-cam.x + cam.width/2 + this.x+Math.cos(this.angle+pi)*this.width)/cam.zoom,
            (-cam.y + cam.height/2 + this.y - Math.sin(this.angle+pi)*this.height)/cam.zoom);
        c.lineTo((-cam.x + cam.width/2 + this.x+Math.cos(this.angle-pi/3)*this.width)/cam.zoom,
            (-cam.y + cam.height/2 + this.y - Math.sin(this.angle-pi/3)*this.height)/cam.zoom);
        c.closePath();
        c.fillStyle = this.colorFill;
        c.fill();
        c.strokeStyle = this.colorDark;
        c.stroke();

        // Primary blade
        c.beginPath();
        c.moveTo((-cam.x + cam.width/2 + this.x+Math.cos(this.angle-pi*2/3)*this.width)/cam.zoom,
            (-cam.y + cam.height/2 + this.y - Math.sin(this.angle-pi*2/3)*this.height)/cam.zoom);
        c.lineTo((-cam.x + cam.width/2 + this.x+Math.cos(this.angle)*this.width)/cam.zoom,
            (-cam.y + cam.height/2 + this.y - Math.sin(this.angle)*this.height)/cam.zoom);
        c.lineTo((-cam.x + cam.width/2 + this.x+Math.cos(this.angle+pi*2/3)*this.width)/cam.zoom,
            (-cam.y + cam.height/2 + this.y - Math.sin(this.angle+pi*2/3)*this.height)/cam.zoom);
        c.closePath();
        c.fillStyle = this.colorFill;
        c.fill();
        c.strokeStyle = this.color;
        c.stroke();
        
        if (this.pt1 && this.pt2) {
            c.beginPath();
            c.moveTo((-cam.x + cam.width/2 + this.pt1.x)/cam.zoom,(-cam.y + cam.height/2 + this.pt1.y)/cam.zoom);
            c.lineTo((-cam.x + cam.width/2 + this.pt2.x)/cam.zoom,(-cam.y + cam.height/2 + this.pt2.y)/cam.zoom);
            c.globalAlpha = 0.4;
            c.strokeStyle = this.color;
            c.stroke();
            c.globalAlpha = 1.0;
        }
    }
}

class Plant {
    constructor(x,y,w,h,c) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.color = c;
        this.offsetX = 0;
        this.elapsed = 0;
        this.speedRandFactor = Math.random()*2;
        this.bounds = {left:this.x-this.width,right:this.x+this.width,top:this.y-this.height,bottom:this.y};
    }

    Tick(dT) {
        this.elapsed += dT/1000;
        this.offsetX = Math.cos(this.elapsed*(4+this.speedRandFactor))*2;
    }

    Draw(c,cam) {
        if (!InCam(cam,this)) { return; }

        c.beginPath();
        // left leaf
        c.moveTo((-cam.x + cam.width/2 + this.x)/cam.zoom,(-cam.y + cam.height/2 + this.y)/cam.zoom);
        c.quadraticCurveTo((-cam.x + cam.width/2 + this.x+this.offsetX)/cam.zoom,(-cam.y + cam.height/2 + this.y-this.height)/cam.zoom, 
            (-cam.x + cam.width/2 + this.x-this.width+this.offsetX)/cam.zoom,(-cam.y + cam.height/2 + this.y-this.height+this.offsetX)/cam.zoom);
        // right leaf
        c.moveTo((-cam.x + cam.width/2 + this.x)/cam.zoom,(-cam.y + cam.height/2 + this.y)/cam.zoom);
        c.quadraticCurveTo((-cam.x + cam.width/2 + this.x+this.offsetX)/cam.zoom,(-cam.y + cam.height/2 + this.y-this.height)/cam.zoom, 
            (-cam.x + cam.width/2 + this.x+this.width+this.offsetX)/cam.zoom,(-cam.y + cam.height/2 + this.y-this.height*2/3-this.offsetX)/cam.zoom);
        c.strokeStyle = this.color;
        c.stroke();
    }
}

class Key {
    constructor(x,y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.bounds = {left:x-this.width/2,right:x+this.width/2,top:y-this.height/2,bottom:y+this.height/2};
        this.elapsed = 0;
        this.color = "#ff00ff";
        this.colorFill = BG_COLOR;
    }

    Contains(x,y,p=false) {
        if (!p) { return false; }

        return x > this.bounds.left && x < this.bounds.right &&
            y > this.bounds.top && y < this.bounds.bottom;
    }
    
    Tick(dT) {
        this.elapsed += dT/350;
        if (this.elapsed > 2*pi) {
            this.elapsed -= 2*pi;
        }
    }

    Draw(c,cam) {
        if (!InCam(cam,this)) { return; }

        let wid = this.width * Math.cos(this.elapsed);
        let px = (-cam.x + cam.width/2 + this.x - wid/2)/cam.zoom;
        let py = (-cam.y + cam.height/2 + this.y - this.height/2)/cam.zoom;
        c.fillStyle = this.colorFill;
        c.fillRect(px, py, wid/cam.zoom, this.height/cam.zoom);
        c.strokeStyle = this.color;
        c.strokeRect(px, py, wid/cam.zoom, this.height/cam.zoom);
    }
}

class KeyDoor extends Terrain {
    constructor(x,y,w,h,kp) {
        super(x,y,w,h,false);
        this.unlocked = false; // DEBUG
        this.key = new Key(kp.x,kp.y);
        this.color = "#ff00ff";
        this.colorFill = "#1a001a";
    }

    Contains(x,y,p=false) {
        if (this.unlocked) { return false; }

        if (this.key.Contains(x,y,p)) {
            this.unlocked = true;
            return false;
        }

        return x > this.bounds.left && x < this.bounds.right &&
            y > this.bounds.top && y < this.bounds.bottom;
    }

    Tick(dT) {
        this.key.Tick(dT);
    }

    Draw(c,cam) {
        if (!this.unlocked) {
            this.key.Draw(c,cam);
        }

        if (!InCam(cam, this)) { return; }

        if (!this.unlocked) {
            let px = (-cam.x + cam.width/2 + this.x-this.width/2)/cam.zoom;
            let py = (-cam.y + cam.height/2 + this.y-this.height/2)/cam.zoom;
            c.fillStyle = this.colorFill;
            c.fillRect(px, py, this.width/cam.zoom, this.height/cam.zoom);
            c.strokeStyle = this.color;
            c.strokeRect(px, py, this.width/cam.zoom, this.height/cam.zoom);
        } else {
            let px = (-cam.x + cam.width/2 + this.x-this.width/2)/cam.zoom;
            let py = (-cam.y + cam.height/2 + this.y-this.height/2)/cam.zoom;
            c.strokeStyle = this.color;
            c.setLineDash([8, 10]);
            c.strokeRect(px, py, this.width/cam.zoom, this.height/cam.zoom);
            c.setLineDash([]);
        }
    }
}

class OneTouchBlock extends Terrain {
    constructor(x,y,w,h,ts,tg) {
        super(x,y,w,h,false);
        this.color = "#3366ff";
        this.colorFill = "#00061a";
        this.hittable = true;
        this.timeStay = ts; // Controls how long before dissapearing.
        this.timeGone = tg; // How long until the block respawns.
        this.timeLeftStaying = 0;
        this.timeLeftGone = 0;
    }

    Contains(x,y,p=false) {
        if (!this.hittable) { return false; }

        let hit = x > this.bounds.left && x < this.bounds.right &&
            y > this.bounds.top && y < this.bounds.bottom;
        
        if (p && hit && this.timeLeftStaying <= 0 && this.timeLeftGone <= 0) {
            this.timeLeftStaying = this.timeStay;
            this.timeLeftGone = this.timeGone;
        }

        return hit;
    }

    Tick(dT) {
        if (this.timeLeftStaying > 0) {
            this.timeLeftStaying -= dT/1000;
        } else if (this.timeLeftGone > 0) {
            this.hittable = false;
            this.timeLeftGone -= dT/1000;
        } else {
            this.hittable = true;
        }
    }

    Draw(c,cam) {
        if (!InCam(cam, this)) { return; }

        if (this.hittable) {
            let px = (-cam.x + cam.width/2 + this.x-this.width/2)/cam.zoom;
            let py = (-cam.y + cam.height/2 + this.y-this.height/2)/cam.zoom;
            c.fillStyle = this.colorFill;
            c.fillRect(px, py, this.width/cam.zoom, this.height/cam.zoom);
            c.strokeStyle = this.color;
            c.strokeRect(px, py, this.width/cam.zoom, this.height/cam.zoom);
        } else {
            let px = (-cam.x + cam.width/2 + this.x-this.width/2)/cam.zoom;
            let py = (-cam.y + cam.height/2 + this.y-this.height/2)/cam.zoom;
            c.strokeStyle = this.color;

            let totalLineWidth = 15;
            let pc = (1 - this.timeLeftGone / this.timeGone)*0.95 + 0.05;
            c.setLineDash([totalLineWidth*pc, totalLineWidth*(1-pc)]);
            c.strokeRect(px, py, this.width/cam.zoom, this.height/cam.zoom);
            c.setLineDash([]);
        }
    }
}

class Player {
    constructor(x,y,s,c,c2,msgq) {
        this.x = x;
        this.y = y;
        this.size = s;
        this.color = c;
        this.colorFill = c2;
        this.bounds = {left:x-s,right:x+s,top:y-s,bottom:y+s};
        this.vx = 0;
        this.vy = 0;
        this.keys = {a:false,d:false,s:false,w:false};
        this.keyUpdates = [];
        this.horizontalAccel = 0.0008*2;
        this.horizontalFriction = 0.0004*4;
        this.horizontalMaxVel = 0.015;
        this.horizontalMinVel = 0.05;
        this.jumpVelocity = -0.011;
        this.jumpFrames = 0;
        this.maxJumpFrames = 6;
        this.fallFactor = 2.0;
        this.fallMaxVel = 0.035;
        this.wallSlideSpeed = 0.11;
        this.wallSlideJumpVel = 0.02;
        this.wallJumpDisplacement = 8;
        this.wallJumpDummyTime = 0;
        this.wallJumpDummyTimeMax = 0.15;
        this.wallJumpYFactor = 1.2;
        this.canJump = false;
        this.canJumpBeforeWallSlide = false;
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};
        this.collisionsObjs = {left:null,right:null,top:null,bottom:null};
        this.grav = 0.0008;
        this.coins = 0;
        this.offworld = {left:-10000,right:10000,top:-10000,bottom:10000};
        this.spawn = {x:x,y:y};
        this.maxHits = 3; // DEBUG
        this.currentHits = this.maxHits;
        this.iframeTime = 0;
        this.iframeTimeMax = 2;
        this.iframeColor = "gray";
        this.startLocked = true;
        this.isDrawn = true;
        this.active = true;
        this.hitActiveTimer = 0;
        this.hitActiveTimerMax = 0.5;
        this.lurkLocked = false;

        this.elapsed = 0;

        this.messageQueue = msgq;

        this.playerID = 0;
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
        this.active = true;
    }

    CollectCoins(t) {
        if (t === 0) {
            this.coins++;
        } else if (t === 1) {
            this.messageQueue.push({type:"playerAddLurker",cb:function (dT,v) {
                if (!v.good) {
                    v.elapsed = 0;
                    v.good = true;
                    v.rechargeDur = 1;
                    v.fadeDur = 0.6;
                    player.iframeTime = 1000;
                } else {
                    v.elapsed += dT/1000;
                    if (v.elapsed > v.rechargeDur + v.fadeDur) {
                        return false;
                    } else if (v.elapsed > v.rechargeDur) {
                        player.iframeTime = 0;
                        player.currentHits = player.maxHits;
                        return true;
                    }
                }

                return true;
            }, d:function (c,cam,v) {
                if (v.elapsed <= v.rechargeDur) {
                    c.fillStyle = "white";
                    c.globalAlpha = (v.elapsed/v.rechargeDur)*0.3;
                    c.fillRect(0,0,WIDTH,HEIGHT);
                    c.globalAlpha = 1.0;
                } else {
                    c.fillStyle = "white";
                    c.globalAlpha = (1-(v.elapsed-v.rechargeDur)/v.fadeDur)*0.7;
                    c.fillRect(0,0,WIDTH,HEIGHT);
                    c.globalAlpha = 1.0;
                }
            }});
        }
    }

    Hit() {
        if (this.iframeTime <= 0) {
            this.currentHits--;
            this.active = false;

            let dead = false;
            if (this.currentHits <= 0) {
                //this.Respawn();
                dead = true;
            } else {
                this.hitActiveTimer = this.hitActiveTimerMax;
                this.iframeTime = this.iframeTimeMax + this.hitActiveTimerMax;
            }

            this.messageQueue.push({type:"playerHit",id:this.playerID,x:this.x,y:this.y,dead:dead});
        }
    }

    Tick(dT) {
        for (let i = 0; i < this.keyUpdates.length; i++) {
            this.keys[this.keyUpdates[i].key] = this.keyUpdates[i].down;
        }
        this.keyUpdates = [];

        if (!this.active) {
            if (this.hitActiveTimer > 0) {
                this.hitActiveTimer -= dT/1000;
                if (this.hitActiveTimer < 0) {
                    this.active = true;
                }
            }
            return;
        }

        this.elapsed += dT/1000;

        // Wall Sliding logical block.
        if ((this.collisions.left !== -1 || this.collisions.right !== -1) && this.jumpFrames <= 0) {
            // TODO: without this check, things are a bit buggy.
            //if (this.vy > 0) {
                // If "sliding" on a wall.
                this.vy = this.vy > this.wallSlideSpeed ? this.wallSlideSpeed : this.vy;

                if (this.collisions.bottom === -1 && this.collisions.top === -1) {
                    // If a transition to wall slide, store previous jump ability.
                    if (!this.wallSliding) {
                            this.canJumpBeforeWallSlide = this.canJump;
                    }
                    this.wallSliding = true;
                    this.canJump = true;
                } else {
                    this.wallSliding = false;
                }
            //}
        } else {
            if (this.wallSliding) {
                // Regain jump ability if had before starting wall slide.
                this.canJump = this.canJumpBeforeWallSlide;
                this.wallSliding = false;
            }
        }

        // Falling logical block.
        if (this.collisions.bottom === -1) {
            this.vy += this.vy > 0 ? (this.grav * this.fallFactor) * dT : this.grav * dT;

            if (this.vy > this.fallMaxVel * dT) {
                this.vy = this.fallMaxVel * dT;
            }
        } else if (this.collisions.top === -1) {
            // Bottom collision.
            this.vy = this.vy > 0 ? 0 : this.vy;
            this.y -= this.size - this.collisions.bottom + 1;
            this.canJump = true;
            this.wallSliding = false;
            if (this.startLocked) {
                this.startLocked = false;
            }
        }

        if (this.collisions.top !== -1) {
            this.vy = this.vy < 0 ? 0 : this.vy;
            this.y += this.size - this.collisions.top + 1;
        }

        // Left/Right movement logical block.
        if (this.startLocked || this.lurkLocked) {
        } else if (this.wallJumpDummyTime >= 0) {
            this.wallJumpDummyTime -= dT/1000;
        } else {
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
        }
        
        // Jumping logical block.
        if (this.startLocked || this.lurkLocked) {
        } else if ((this.keys[" "] || this.keys["w"]) && this.canJump) {
            if (this.wallSliding && this.collisions.top === -1 && this.collisions.bottom === -1) {
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
                if (this.wallJumpDummyTime <= 0) {
                    this.jumpFrames++;
                    if (this.jumpFrames >= this.maxJumpFrames) {
                        this.canJump = false;
                    }
                    this.vy = this.jumpVelocity * dT * (this.jumpFrames > this.maxJumpFrames/2 ? this.jumpFrames/3 : 1);
                }
            }
        } else if (this.jumpFrames !== 0) {
            this.jumpFrames = 0;
            if (!this.keys[" "] || this.keys["w"]) {
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

        if ((this.collisionsObjs.bottom && this.collisionsObjs.bottom.harmful) ||
            (this.collisionsObjs.left && this.collisionsObjs.left.harmful) ||
            (this.collisionsObjs.right && this.collisionsObjs.right.harmful) ||
            (this.collisionsObjs.top && this.collisionsObjs.top.harmful)) {
            this.Hit();
        }

        if (this.y > this.offworld.bottom) {
            console.log("player is off screen");
            this.y = this.offworld.bottom-1;
            this.grav = 0;
            this.vy = 0;
            this.isDrawn = false;
            this.currentHits = 0;
            this.messageQueue.push({type:"playerHit",id:this.playerID,x:this.x,y:this.y,dead:true});
            this.active = false;
        }

        if (this.iframeTime > 0) {
            this.iframeTime -= dT/1000;
        }
    }

    Collision(t) {
        HandleCollisions(this,t,true);
    }

    Draw(c,cam) {
        if (this.isDrawn) {
            // TODO: This draws the player above terrain if they have collision.
            //       This occurs because collision is done AFTER Tick, and does not modify player
            //       position at all.
            let collOffsetY = this.collisions.bottom === -1 ? 0 : this.size - this.collisions.bottom;
            let collOffsetX = this.collisions.left === -1 ? this.collisions.right === -1 ? 0 : 
                -(this.size - this.collisions.right) : this.size - this.collisions.left;
            let px = (-cam.x + cam.width/2 + this.x + collOffsetX)/cam.zoom;
            let py = (-cam.y + cam.height/2 + this.y - collOffsetY)/cam.zoom;
            let xrad = (this.size/cam.zoom+(Math.abs(this.vx)+Math.abs(this.vy))*3);
            let yrad = (this.size/cam.zoom - Math.abs(this.size/cam.zoom - xrad));
            let ang = Math.atan2(this.vy,this.vx);

            c.fillStyle = this.colorFill;
            if ((this.iframeTime > 0 && ((this.elapsed*100)%50) < 25) || this.currentHits === 0) {
                c.strokeStyle = this.iframeColor;
            } else {
                c.strokeStyle = this.color;
            }
            c.beginPath();
            c.ellipse(px,py,xrad,yrad,ang,0,pi*2);
            c.fill();
            c.stroke();

            if (this.iframeTime > 0) {
                // TODO: Could probably be better.
                c.globalAlpha = 0.4;
                c.fillStyle = "black";
                c.beginPath();
                c.arc(px, py, 1000*this.iframeTime, 0, 2*pi);
                c.fill();
                c.globalAlpha = 0.02;
                c.fillStyle = "#666666";
                c.beginPath();
                c.arc(px, py, 100*this.iframeTime, 0, 2*pi);
                c.fill();
                c.fillStyle = "#444444";
                c.beginPath();
                c.arc(px, py, 200*this.iframeTime, 0, 2*pi);
                c.fill();
                c.globalAlpha = 1.0;
            } else if (this.currentHits === 0) {
                c.globalAlpha = 0.5;
                c.fillStyle = "black";
                c.fillRect(0,0,WIDTH,HEIGHT);
                c.globalAlpha = 1.0;
            }
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
        c.fillStyle = "black";
        c.fillRect(coinsX + coinSymbolSize/2 - coinWid/2, coinsY, coinWid, coinSymbolSize);
        c.strokeStyle = "cyan";
        c.strokeRect(coinsX + coinSymbolSize/2 - coinWid/2, coinsY, coinWid, coinSymbolSize);
        c.font = ""+coinSymbolSize+"px Verdana";
        c.fillStyle = "cyan";
        c.fillText(""+this.coins, coinSymbolSize + coinSymbolSpace*2, HEIGHT-coinSymbolSpace-2);

        c.lineWidth = oldLineWidth;
    }
}

class Mulper {
    constructor(x,y,xmod=1,fmod=1,msgq) {
        this.x = x;
        this.y = y;
        this.vxMax = 0.08;
        this.vx = this.vxMax * xmod;
        this.vy = 0;
        this.grav = 0.0005;
        this.elapsed = 0;
        this.size = 14;
        this.moveFreq = 400 * fmod;
        this.color = "red";
        this.colorFill = "#100404";
        this.bounds = {left:x-this.size,right:x+this.size,top:y-this.size,bottom:y+this.size};
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};
        this.collisionsObjs = {left:null,right:null,top:null,bottom:null};
        this.sensors = {left:-1, right:-1};
        this.messageQueue = msgq;
        this.particleTimerMax = 0.05;
        this.particleTimer = 0;
    }

    Collision(t,p) {
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};

        HandleCollisions(this, t);

        this.sensors = {left:MeasureDistance(this.x-this.size/2,this.y+this.size/2,-pi/2,this.size,t),
            right:MeasureDistance(this.x+this.size/2,this.y+this.size/2,-pi/2,this.size,t)};

        if (Distance(this.x,this.y,p.x,p.y) < this.size+p.size) {
            p.Hit();
        }
    }

    Tick(dT) {
        this.elapsed += dT/this.moveFreq;
        this.elapsed = this.elapsed > 100 ? this.elapsed-100 : this.elapsed;
        this.bounds = {left:this.x-this.size,right:this.x+this.size,top:this.y-this.size,bottom:this.y+this.size};

        this.vy += this.grav * dT;

        if (this.collisions.bottom !== -1) {
            this.vy = 0;
            this.y -= this.size - this.collisions.bottom + 1;
        }

        this.y += this.vy * dT;

        this.vx = this.vxMax * dT * Math.abs(Math.sin(this.elapsed)) * Math.sign(this.vx);

        if (this.collisions.left !== -1) {
            this.vx = this.vx < 0 ? -this.vx : this.vx;
            this.elapsed = 0;
        } else if (this.collisions.right !== -1) {
            this.vx = this.vx > 0 ? -this.vx : this.vx;
            this.elapsed = 0;
        } else if(this.sensors.left === -1) {
            this.vx = this.vx < 0 ? -this.vx : this.vx;
            this.elapsed = 0;
        } else if(this.sensors.right === -1) {
            this.vx = this.vx > 0 ? -this.vx : this.vx;
            this.elapsed = 0;
        }

        // A trail of particles below.
        if (this.particleTimer > 0) {
            this.particleTimer -= dT/1000;
        } else {
            this.particleTimer = this.particleTimerMax;
            this.messageQueue.push({type:"enemyParticle",x:this.x-Math.sign(this.vx)*this.size*3/4,
                y:this.y+this.size-2,n:1,xvar:0,yvar:0});
        }

        this.x += this.vx;
    }

    Draw(c,cam) {
        if (!InCam(cam,this)){ return; }

        let xrad = (this.size/cam.zoom+(Math.abs(this.vx)+Math.abs(this.vy)/2));
        let yrad = this.size/cam.zoom - Math.abs(this.size/cam.zoom - xrad);
        let ang = Math.atan2(this.vy,this.vx);

        c.fillStyle = this.colorFill;
        c.strokeStyle = this.color;
        c.beginPath();
        c.ellipse((-cam.x + cam.width/2 + this.x)/cam.zoom, (-cam.y + cam.height/2 + this.y + (this.size-yrad))/cam.zoom,xrad,yrad,ang,0,pi*2);
        c.fill();
        c.stroke();
    }
}

class Julper {
    constructor(x,y,tw,js,msgq) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.grav = 0.0005;
        this.elapsed = 0;
        this.size = 14;
        this.color = "red";
        this.colorFill = "#100404";
        this.bounds = {left:x-this.size,right:x+this.size,top:y-this.size,bottom:y+this.size};
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};
        this.collisionsObjs = {left:null,right:null,top:null,bottom:null};
        this.timeWait = tw;
        this.jumpStrength = js;
        this.waitingToJump = true;
        this.timeLeftWait = tw;
        this.jumping = false;
        this.onCeiling = false;
        this.messageQueue = msgq;
        this.particleTimerMax = 0.05;
        this.particleTimer = 0;
    }

    Collision(t,p) {
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};

        HandleCollisions(this, t);

        if (Distance(this.x,this.y,p.x,p.y) < this.size+p.size) {
            p.Hit();
        }
    }

    Tick(dT) {
        this.elapsed += dT/this.moveFreq;
        this.elapsed = this.elapsed > 100 ? this.elapsed-100 : this.elapsed;
        this.bounds = {left:this.x-this.size,right:this.x+this.size,top:this.y-this.size,bottom:this.y+this.size};

        this.vy += this.grav * dT;

        if (this.collisions.top !== -1) {
            this.vy = 0;
            this.y += this.size - this.collisions.top - 1;

            if (this.jumping) {
                this.jumping = false;
                this.waitingToJump = true;
                this.timeLeftWait = this.timeWait;
                this.onCeiling = true;
            }
        } else if (this.collisions.bottom !== -1) {
            this.vy = 0;
            this.y -= this.size - this.collisions.bottom + 1;

            if (this.jumping) {
                this.jumping = false;
                this.waitingToJump = true;
                this.timeLeftWait = this.timeWait;
            }
        }
        
        if (this.waitingToJump) {
            if (this.timeLeftWait > 0) {
                this.timeLeftWait -= dT/1000;
            }

            if (this.timeLeftWait <= 0) {
                this.waitingToJump = false;
                this.jumping = true;

                if (this.onCeiling) {
                    this.messageQueue.push({type:"enemyParticle",x:this.x,y:this.y-this.size+2,n:10,xvar:this.size*3/4,yvar:0});
                } else {
                    this.messageQueue.push({type:"enemyParticle",x:this.x,y:this.y+this.size-2,n:10,xvar:this.size*3/4,yvar:0});
                }

                if (this.onCeiling) {
                    this.y += 3;
                    this.onCeiling = false;
                } else {
                    this.vy -= this.jumpStrength * dT;
                }
            }
        }

        this.y += this.vy * dT;

        this.x += this.vx;
        
        // A trail of particles below.
    }

    Draw(c,cam) {
        if (!InCam(cam,this)){ return; }

        let mod = 1-this.timeLeftWait/this.timeWait;
        if (this.timeLeftWait < 0) { mod = 0; }
        let xrad = (this.size/cam.zoom+(Math.abs(mod*3)+Math.abs(this.vy*6)));
        let yrad = this.size/cam.zoom - Math.abs(this.size/cam.zoom - xrad);
        let ang = Math.atan2(this.vy,this.vx);
        if (this.onCeiling) {
            ang += pi/2;
        }

        c.fillStyle = this.colorFill;
        c.strokeStyle = this.color;
        c.beginPath();
        c.ellipse((-cam.x + cam.width/2 + this.x)/cam.zoom, (-cam.y + cam.height/2 + this.y + (this.size-yrad))/cam.zoom,xrad,yrad,ang,0,pi*2);
        c.fill();
        c.stroke();
    }
}

class Sulper {
    constructor(x,y,s,msgq) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.speed = Math.abs(s);
        this.dir = Math.sign(s);
        this.elapsed = 0;
        this.size = 14;
        this.color = "red";
        this.colorFill = "#100404";
        this.bounds = {left:x-this.size,right:x+this.size,top:y-this.size,bottom:y+this.size};
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};
        this.collisionsObjs = {left:null,right:null,top:null,bottom:null};
        this.clingObject = null;
        this.face = -1; // face is important, it tells which face the sulper is currently on
            // relative to the clingObject. Face 0 is the right face, Face 1 is top, etc. going
            // counterclockwise around the object.
        this.inCam = false;
        this.messageQueue = msgq;
        this.particleTimerMax = 0.05;
        this.particleTimer = 0;
    }

    Collision(t,p) {
        if (this.face === -1) {
            this.collisions = {left:-1,right:-1,top:-1,bottom:-1};

            HandleCollisions(this, t);

            if (this.collisions.left !== -1) {
                this.clingObject = this.collisionsObjs.left;
                this.face = 0;
                this.vy = this.dir === 1 ? this.speed : -this.speed;
            } else if (this.collisions.right !== -1) {
                this.clingObject = this.collisionsObjs.right;
                this.face = 2;
                this.vy = this.dir === 1 ? -this.speed : this.speed;
            } else if (this.collisions.top !== -1) {
                this.clingObject = this.collisionsObjs.top;
                this.face = 3;
                this.vx = this.dir === 1 ? this.speed : -this.speed;
            } else if (this.collisions.bottom !== -1) {
                this.clingObject = this.collisionsObjs.bottom;
                this.face = 1;
                this.vx = this.dir === 1 ? -this.speed : this.speed;
            }
        }

        if (Distance(this.x,this.y,p.x,p.y) < this.size+p.size) {
            p.Hit();
        }
    }

    Tick(dT) {
        this.elapsed += dT/this.moveFreq;
        this.elapsed = this.elapsed > 100 ? this.elapsed-100 : this.elapsed;
        this.bounds = {left:this.x-this.size,right:this.x+this.size,top:this.y-this.size,bottom:this.y+this.size};

        if (this.face === 0) {
            if (this.y < this.clingObject.y - this.clingObject.height/2 - this.size) {
                this.face = 1;
                this.y = this.clingObject.y - this.clingObject.height/2 - this.size;
                this.vy = 0;
                this.vx = -this.speed;
            } else if (this.y > this.clingObject.y + this.clingObject.height/2 + this.size) {
                this.face = 3;
                this.y = this.clingObject.y + this.clingObject.height/2 + this.size;
                this.vy = 0;
                this.vx = -this.speed;
            }
        } else if (this.face === 1) {
            if (this.x < this.clingObject.x - this.clingObject.width/2 - this.size) {
                this.face = 2;
                this.x = this.clingObject.x - this.clingObject.width/2 - this.size;
                this.vy = this.speed;
                this.vx = 0;
            } else if (this.x > this.clingObject.x + this.clingObject.width/2 + this.size) {
                this.face = 0;
                this.x = this.clingObject.x + this.clingObject.width/2 + this.size;
                this.vy = this.speed;
                this.vx = 0;
            }
        } else if (this.face === 2) {
            if (this.y > this.clingObject.y + this.clingObject.height/2 + this.size) {
                this.face = 3;
                this.y = this.clingObject.y + this.clingObject.height/2 + this.size;
                this.vy = 0;
                this.vx = this.speed;
            } else if (this.y < this.clingObject.y - this.clingObject.height/2 - this.size) {
                this.face = 1;
                this.y = this.clingObject.y - this.clingObject.height/2 - this.size;
                this.vy = 0;
                this.vx = this.speed;
            }
        } else if (this.face === 3) {
            if (this.x > this.clingObject.x + this.clingObject.width/2 + this.size) {
                this.face = 0;
                this.x = this.clingObject.x + this.clingObject.width/2 + this.size;
                this.vy = -this.speed;
                this.vx = 0;
            } else if (this.x < this.clingObject.x - this.clingObject.width/2 - this.size) {
                this.face = 2;
                this.x = this.clingObject.x - this.clingObject.width/2 - this.size;
                this.vy = -this.speed;
                this.vx = 0;
            }
        }
        
        // A trail of particles below.
        if (this.particleTimer > 0) {
            this.particleTimer -= dT/1000;
        } else {
            this.particleTimer = this.particleTimerMax;
            this.messageQueue.push({type:"enemyParticle",x:this.x-Math.sign(this.vy)*this.size*3/4,
                y:this.y+Math.sign(this.vx)*this.size*3/4,n:1,xvar:0,yvar:0});
        }

        this.y += this.vy * dT;
        this.x += this.vx * dT;
    }

    Draw(c,cam) {
        if (!InCam(cam,this)){ return; }

        let xrad = (this.size/cam.zoom+Math.abs(this.speed*20));
        let yrad = this.size/cam.zoom - Math.abs(this.size/cam.zoom - xrad);
        let ang = Math.atan2(this.vy,this.vx);

        c.fillStyle = this.colorFill;
        c.strokeStyle = this.color;
        c.beginPath();
        c.ellipse((-cam.x + cam.width/2 + this.x)/cam.zoom, (-cam.y + cam.height/2 + this.y)/cam.zoom,xrad,yrad,ang,0,pi*2);
        c.fill();
        c.stroke();
    }
}

class Dulper {
    constructor(lb,rb,tb,bb,vx,tm,ts,msgq) {
        this.x = lb;
        this.y = tb;
        this.movementBounds = {left:lb,right:rb,top:tb,bottom:bb};
        this.timeMove = tm;
        this.timeSwoop = ts;
        this.vxMax = vx;
        this.vx = this.vxMax;
        this.vy = 0;
        this.elapsed = 0;
        this.size = 14;
        this.color = "red";
        this.colorFill = "#100404";
        this.colorWing = "orange";
        this.bounds = {left:this.x-this.size,right:this.x+this.size,top:this.y-this.size,bottom:this.y+this.size};
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};
        this.collisionsObjs = {left:null,right:null,top:null,bottom:null};
        this.sensors = {left:-1, right:-1};
        this.messageQueue = msgq;
        this.particleTimerMax = 0.05;
        this.particleTimer = 0;

        this.xMoveState = 1; // 1 or -1 for right or left
        this.yMoveState = 0; // TODO
    }

    Collision(t,p) {
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};

        HandleCollisions(this, t);

        this.sensors = {left:MeasureDistance(this.x-this.size/2,this.y+this.size/2,-pi/2,this.size,t),
            right:MeasureDistance(this.x+this.size/2,this.y+this.size/2,-pi/2,this.size,t)};

        if (Distance(this.x,this.y,p.x,p.y) < this.size+p.size) {
            p.Hit();
        }
    }

    Tick(dT) {
        this.elapsed += dT/this.moveFreq;
        this.elapsed = this.elapsed > 100 ? this.elapsed-100 : this.elapsed;
        this.bounds = {left:this.x-this.size,right:this.x+this.size,top:this.y-this.size,bottom:this.y+this.size};

        if (this.xMoveState === 1 && this.x > this.movementBounds.right) {
            this.xMoveState = -1;
        } else if (this.xMoveState === -1 && this.x < this.movementBounds.left) {
            this.xMoveState = 1;
        }

        this.y += this.vy * dT;

        this.vx = this.vxMax * this.xMoveState;

        // A trail of particles below.
        if (this.particleTimer > 0) {
            this.particleTimer -= dT/1000;
        } else {
            this.particleTimer = this.particleTimerMax;
            this.messageQueue.push({type:"enemyParticle",x:this.x-Math.sign(this.vx)*this.size*3/4,
                y:this.y,n:1,xvar:0,yvar:0});
        }

        this.x += this.vx * dT;
    }

    Draw(c,cam) {
        if (!InCam(cam,this)){ return; }

        let xrad = (this.size/cam.zoom+(Math.abs(this.vx)+Math.abs(this.vy)/2));
        let yrad = this.size/cam.zoom - Math.abs(this.size/cam.zoom - xrad);
        let ang = Math.atan2(this.vy,this.vx);

        
        c.fillStyle = this.colorFill;
        c.strokeStyle = this.color;
        c.beginPath();
        c.ellipse((-cam.x + cam.width/2 + this.x)/cam.zoom, (-cam.y + cam.height/2 + this.y + (this.size-yrad))/cam.zoom,xrad,yrad,ang,0,pi*2);
        c.fill();
        c.stroke();

        c.fillStyle = this.colorFill;
        c.strokeStyle = this.colorWing;
        c.beginPath();
        c.ellipse((-cam.x + cam.width/2 + this.x-this.size*2/3*this.xMoveState)/cam.zoom, (-cam.y + cam.height/2 + this.y - this.size/3)/cam.zoom,xrad*2/3,yrad*2/3,ang,0,pi*2);
        c.fill();
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

        this.shaking = false;
        this.shakeMag = 0;
        this.shakeTime = 0;
    }

    Shake(m, t) {
        this.shakeMag = m;
        this.shakeTime = t;
        this.shaking = true;
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

        if (this.target.bounds){
            if (!InCam(this,this.target)) {
                this.x += (this.target.x - this.x)/10;
                this.y += (this.target.y - this.y)/10;
                return;
            }
        } else {
            this.x += (this.target.x - this.x)/3;
            this.y += (this.target.y - this.y)/3;
            return;
        }

        // "Lead" the target if it has horizontal velocity.
        if (this.target.vx) {
            let mv = (this.x - (this.target.x + this.target.vx*this.velocityGain))*this.horizontalFactor;
            mv = Math.abs(mv)/this.zoom > this.maxMove ? this.maxMove * Math.sign(mv) : mv;
            this.x -= mv;
        } else {
            let mv = (this.x - (this.target.x))*this.horizontalFactor;
            mv = Math.abs(mv)/this.zoom > this.maxMove ? this.maxMove * Math.sign(mv) : mv;
            this.x -= mv;
        }

        if (this.x - this.width/2 < this.bounds.left) {
            this.x -= this.x - this.width/2 - this.bounds.left;
        } else if (this.x + this.width/2 > this.bounds.right) {
            this.x -= this.x + this.width/2 - this.bounds.right;
        }

        this.y -= (this.y - (this.target.y-40))*this.verticalFactor;

        if (this.y + this.height/2 > this.bounds.bottom) {
            this.y = this.bounds.bottom - this.height/2;
        }

        if (this.shaking) {
            let env = this.shakeTime * this.shakeMag;
            let offX = env * (2*Math.random()-1);
            let offY = env * (2*Math.random()-1);
            this.x += offX;
            this.y += offY;

            if (this.shakeTime > 0) {
                this.shakeTime -= dT/1000;
                if (this.shakeTime <= 0) {
                    this.shaking = false;
                }
            }
        }
    }
}

class Coin {
    constructor(x,y) {
        this.x = x;
        this.y = y;
        this.type = 0; // 0 is default coin
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

        let wid = this.width * Math.cos(this.elapsed);
        let px = (-cam.x + cam.width/2 + this.x - wid/2)/cam.zoom;
        let py = (-cam.y + cam.height/2 + this.y - this.height/2)/cam.zoom;
        c.fillStyle = BG_COLOR;
        c.fillRect(px, py, wid/cam.zoom, this.height/cam.zoom);
        c.strokeStyle = this.color;
        c.strokeRect(px, py, wid/cam.zoom, this.height/cam.zoom);
    }
}

class RechargeCoin {
    constructor(x,y) {
        this.x = x;
        this.y = y;
        this.type = 1; // 1 is a recharge coin
        this.width = 12;
        this.height = 12;
        this.color = "#9999ff";
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

        let wid = Math.abs(this.width * Math.cos(this.elapsed));
        let px = (-cam.x + cam.width/2 + this.x)/cam.zoom;
        let py = (-cam.y + cam.height/2 + this.y)/cam.zoom;
        c.beginPath();
        c.ellipse(px,py,wid,this.height,0,0,2*pi);
        c.fillStyle = BG_COLOR;
        c.fill();
        c.strokeStyle = this.color;
        c.stroke();
    }
}

class BGShape {
    constructor(x,y,d,c,c2,pts) {
        this.x = x;
        this.y = y;
        this.distance = d;
        this.pts = pts;
        this.color = c;
        this.colorFill = c2;
    }

    Draw(c,cam) {
        // TODO: this should be drawn only if on the screen.
        let px = (-cam.x + cam.width/2 + this.x)/cam.zoom/(1+this.distance);
        let py = (-cam.y + cam.height/2 + this.y)/cam.zoom/(1.1);

        c.beginPath();
        c.moveTo(px + this.pts[0].x/cam.zoom, py + this.pts[0].y/cam.zoom);
        for (let i = 1; i < this.pts.length; i++) {
            c.lineTo(px + this.pts[i].x/cam.zoom, py + this.pts[i].y/cam.zoom);
        }
        c.closePath();
        c.fillStyle = this.colorFill;
        c.fill();

        c.strokeStyle = this.color;
        let oldWidth = c.lineWidth;
        c.globalAlpha = 0.35;
        c.lineWidth = 10;
        c.stroke();
        c.globalAlpha = 0.6;
        c.lineWidth = 6;
        c.stroke();
        c.globalAlpha = 1.0;
        c.lineWidth = oldWidth;
        c.stroke();
    }
}

class BGRect {
    constructor(x,y,w,h,d,c,c2) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.color = c;
        this.colorFill = c2;
        this.distance = d;
        this.bounds = {left:x-w/2,right:x+w/2,top:y-h/2,bottom:y+h/2};
    }

    Draw(c, cam) {
        // TODO: this should be drawn only if on the screen.
        // TODO: make this better
        // DEBUG
        //if (InCam(cam,this)) {
            let px = (-cam.x + cam.width/2 + this.x)/cam.zoom/(1+this.distance);
            let py = (-cam.y + cam.height/2 + this.y)/cam.zoom/(1.1);
            c.beginPath();
            c.rect(px-this.width/2/cam.zoom,py-this.height/2/cam.zoom,
                this.width/cam.zoom,this.height/cam.zoom);
            c.fillStyle = this.colorFill;
            c.fill();

            c.strokeStyle = this.color;
            let oldWidth = c.lineWidth;
            c.globalAlpha = 0.35;
            c.lineWidth = 10;
            c.stroke();
            c.globalAlpha = 0.6;
            c.lineWidth = 6;
            c.stroke();
            c.globalAlpha = 1.0;
            c.lineWidth = oldWidth;
            c.stroke();
        //}
    }
}

class LevelEnd {
    constructor(x,y,w,h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.bounds = {left:x-this.width/2,right:x+this.width/2,top:y-this.height/2,bottom:y+this.height/2};
        this.reached = false;
        this.color = "white";
    }

    Contains(x,y) {
        let got = x > this.bounds.left && x < this.bounds.right &&
            y > this.bounds.top && y < this.bounds.bottom;
        if (!this.reached && got) { this.reached = true; }
        return got;
    }

    // DEBUG
    Draw(c,cam) {
        if (InCam(cam, this)) {
            let px = (-cam.x + cam.width/2 + this.x-this.width/2)/cam.zoom;
            let py = (-cam.y + cam.height/2 + this.y-this.height/2)/cam.zoom;
            c.strokeStyle = this.color;
            c.strokeRect(px, py, this.width/cam.zoom, this.height/cam.zoom);
        }
    }
}

class HitParticle {
    constructor(x,y,s,c,vx,vy,tA,drag=false,collision=false,grav=true) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = s;
        this.color = c;
        this.timeAlive = tA;
        this.hasDrag = drag;
        this.hasCollision = collision;
        this.grav = grav ? 0.0008 : 0;
        this.active = true;
        this.bounds = {left:this.x-this.size,right:this.x+this.size,top:this.y-this.size,bottom:this.y+this.size};
        this.collisions = {left:-1,right:-1,top:-1,bottom:-1};
    }

    Collision(t) {
        if (this.hasCollision) {
            HandleCollisions(this,t);
        }
    }

    Tick(dT) {
        if (!this.active) { return; }

        this.timeAlive -= dT/1000;

        if (this.timeAlive <= 0) {
            this.active = false;
        }

        if (this.collisions.bottom === -1) {
            this.vy += this.grav * dT;
        } else {
            this.y -= this.collisions.bottom;
            this.vy = this.vy > 0 ? -this.vy*0.6 : this.vy;
        }

        if (this.collisions.left !== -1) {
            if (this.vx < 0) {
                this.vx = -this.vx*0.6;
            }
        } else if (this.collisions.right !== -1) {
            if (this.vx > 0) {
                this.vx = -this.vx*0.6;
            }
        }

        if (this.hasDrag) {
            this.vx *= 0.99;
            this.vy *= 0.99;
        }

        this.x += this.vx * dT;
        this.y += this.vy * dT;

        this.bounds = {left:this.x-this.size,right:this.x+this.size,top:this.y-this.size,bottom:this.y+this.size};
    }

    Draw(c,cam) {
        if (!this.active) { return; }
        if (InCam(cam, this)) {
            let px = (-cam.x + cam.width/2 + this.x)/cam.zoom;
            let py = (-cam.y + cam.height/2 + this.y)/cam.zoom;
            c.fillStyle = this.color;
            c.beginPath();
            c.arc(px, py, this.size/cam.zoom, 0, 2*pi);
            c.fill();
        } else {
            // Kill if not in the current view.
            this.active = false;
        }
    }
}

// Lurker is similar to lerper, but it will run continuously until the callback returns a value
// of "false". At that point it will no longer call the callback.
class Lurker {
    constructor(cb, d=function(ctx){}) {
        this.cb = cb;
        this.d = d;
        this.active = true;
        this.vals = {good:false}; // Can hold additional values per lurker.
    }

    Tick(dT) {
        if (!this.active) { return; }

        this.active = this.cb(dT,this.vals);
    }

    Draw(ctx,cam) {
        this.d(ctx,cam,this.vals);
    }
}