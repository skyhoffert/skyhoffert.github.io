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
    Contains(){}
    Tick(dT){}
    Draw(c,cam){}
}

// Rectanlge is FLAT, or aligned with cartesian axis of world.
class Rectangle extends Terrain {
    constructor(x,y,w,h,hf=false) {
        super(x,y,w,h,hf);
    }

    Contains(x,y) {
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
        if (!InCam(cam, this)) { return; }

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
        this.active = true;
    }

    CollectCoins(v) {
        this.coins += v;
    }

    Hit() {
        if (this.iframeTime <= 0) {
            this.currentHits--;
            this.iframeTime = this.iframeTimeMax + this.hitActiveTimerMax;
            this.active = false;
            this.hitActiveTimer = this.hitActiveTimerMax;

            let dead = false;
            if (this.currentHits === 0) {
                this.Respawn();
                dead = true;
            }

            this.messageQueue.push({type:"playerHit",id:this.playerID,x:this.x,y:this.y,dead:dead});
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

                /* DEBUG : just showing off the power of a lurker.
                this.messageQueue.push({type:"playerAddLurker",cb:function(dT,v) {
                    if (!v.good) {
                        v.elapsed = 0;
                        v.good = true;
                        player.lurkLocked = true;
                    } else {
                        v.elapsed += dT;
                    }

                    camera.target = {x:2000,y:-400};
                    
                    if (v.elapsed > 3000) {
                        camera.target = player;
                        player.lurkLocked = false;
                        return false;
                    }
                    return true;
                },d:function(c,cam){}});
                */
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
        
        // Jumping logical block.
        if (this.startLocked || this.lurkLocked) {
        } else if (this.keys[" "] && this.canJump) {
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

        if ((this.collisionsObjs.bottom && this.collisionsObjs.bottom.harmful) ||
            (this.collisionsObjs.left && this.collisionsObjs.left.harmful) ||
            (this.collisionsObjs.right && this.collisionsObjs.right.harmful) ||
            (this.collisionsObjs.top && this.collisionsObjs.top.harmful)) {
            this.Hit();
        }

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
            if (this.iframeTime > 0 && ((this.elapsed*100)%50) < 25) {
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
    constructor(x,y,xmod=1,fmod=1) {
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

        // TODO: something can possibly glitch out with vx?
        this.vx = this.vxMax * dT * Math.abs(Math.cos(this.elapsed)) * Math.sign(this.vx);

        if (this.collisions.left !== -1) {
            this.vx = this.vx < 0 ? -this.vx : this.vx;
        } else if (this.collisions.right !== -1) {
            this.vx = this.vx > 0 ? -this.vx : this.vx;
        } else if(this.sensors.left === -1) {
            this.vx = this.vx < 0 ? -this.vx : this.vx;
        } else if(this.sensors.right === -1) {
            this.vx = this.vx > 0 ? -this.vx : this.vx;
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
            this.y -= this.y + this.height/2 - this.bounds.bottom;
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

        let wid = this.width * Math.cos(this.elapsed);
        let px = (-cam.x + cam.width/2 + this.x - wid/2)/cam.zoom;
        let py = (-cam.y + cam.height/2 + this.y - this.height/2)/cam.zoom;
        c.fillStyle = BG_COLOR;
        c.fillRect(px, py, wid/cam.zoom, this.height/cam.zoom);
        c.strokeStyle = this.color;
        c.strokeRect(px, py, wid/cam.zoom, this.height/cam.zoom);
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
            c.fillStyle = BG_COLOR;
            c.fillRect(px, py, this.width/cam.zoom, this.height/cam.zoom);
            c.strokeStyle = this.color;
            c.strokeRect(px, py, this.width/cam.zoom, this.height/cam.zoom);
        }
    }
}

class HitParticle {
    constructor(x,y,s,c,vx,vy,tA,drag=false,collision=false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.size = s;
        this.color = c;
        this.timeAlive = tA;
        this.hasDrag = drag;
        this.hasCollision = collision;
        this.grav = 0.0008;
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
        this.d(ctx,cam);
    }
}