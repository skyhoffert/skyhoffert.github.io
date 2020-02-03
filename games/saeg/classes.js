// Sky Hoffert
// Classes for saeg.

class GameObject {
    constructor(x,y,z,c) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.color = c;
        this.bounds = {left:0,right:0,top:0,bottom:0};
        this.active = true;
    }
    
    Contains(p) { return false; }
    Tick(dT) {}
    Draw(c) {}
}

class DebugRay extends GameObject {
    constructor(x,y,x2,y2,c,sf=true) {
        super(x,y,10,c);
        this.x2 = x2;
        this.y2 = y2;
        this.lineWidth = 1;
        this.singleFrame = sf;
    }

    Tick(dT) {
    }

    Draw(c) {
        let pos = gameStage.camera.ScreenPosition(this.x,this.y);
        let pos2 = gameStage.camera.ScreenPosition(this.x2,this.y2);
        c.beginPath();
        c.moveTo(pos.x,pos.y);
        c.lineTo(pos2.x,pos2.y);
        c.strokeStyle = this.color;
        c.lineWidth = this.lineWidth;
        c.stroke();
        
        if (this.singleFrame) {
            this.active = false;
        }
    }
}

class Player extends GameObject {
    constructor(x,y,id,gs) {
        super(x,y,0,"#404080");
        this.colorFill = "#101020";
        this.vx = 0;
        this.vy = 0;
        this.accel = 0.0006;
        this.size = 20;
        this.id = id;
        this.keys = {};
        this.mouse = {x:0,y:0,down:false};
        this.gameStage = gs;
        this.bounds = {left:this.x-this.size,right:this.x+this.size,top:this.y-this.size,bottom:this.y+this.size};
        this.angle = 0;
        this.sensors = [
            {angle:0,dist:-1,ray:new DebugRay(this.x,this.y,this.x,this.y,"red",false)},
            {angle:PI/4,dist:-1,ray:new DebugRay(this.x,this.y,this.x,this.y,"red",false)},
            {angle:PI/2,dist:-1,ray:new DebugRay(this.x,this.y,this.x,this.y,"red",false)},
            {angle:PI*3/4,dist:-1,ray:new DebugRay(this.x,this.y,this.x,this.y,"red",false)},
            {angle:PI,dist:-1,ray:new DebugRay(this.x,this.y,this.x,this.y,"red",false)},
            {angle:PI*5/4,dist:-1,ray:new DebugRay(this.x,this.y,this.x,this.y,"red",false)},
            {angle:PI*3/2,dist:-1,ray:new DebugRay(this.x,this.y,this.x,this.y,"red",false)},
            {angle:PI*7/4,dist:-1,ray:new DebugRay(this.x,this.y,this.x,this.y,"red",false)},
        ];
        for (let i = 0; i < this.sensors.length; i++) {
            this.gameStage.Add(this.sensors[i].ray,"debug");
        }

        this.bumpTimer = 0.0;
        this.bumpTimerMax = 100;
        this.bumpRange = this.size/2;
        this.bumpFactor = 0.5;
    }

    Contains(p) {
        return false;
    }

    Tick(dT) {
        let pos = this.gameStage.camera.ScreenPosition(this.x,this.y);
        this.angle = Math.atan2(-(this.mouse.y-pos.y),this.mouse.x-pos.x);
        
        if (this.keys[" "]) {
            this.vx += cosF(this.angle) * this.accel * dT;
            this.vy -= sinF(this.angle) * this.accel * dT;
        }

        this.x += this.vx * dT;
        this.y += this.vy * dT;

        let numHits = 0;
        let maxDist = -1;
        let maxDistIdx = -1;
        let castDist = 200;
        for (let i = 0; i < this.sensors.length; i++) {
            let rc = Raycast(this.x,this.y,this.sensors[i].angle,castDist,this.gameStage.world,this.gameStage.terrain,3);
            this.sensors[i].ray.x = this.x;
            this.sensors[i].ray.y = this.y;
            if (rc.hit) {
                this.sensors[i].ray.x2 = rc.hitpt.x;
                this.sensors[i].ray.y2 = rc.hitpt.y;
                this.sensors[i].ray.color = "red";
                this.sensors[i].dist = rc.dist;
                if (rc.dist < this.bumpRange) {
                    numHits++;
                }
                if (rc.dist > maxDist) {
                    maxDist = rc.dist;
                    maxDistIdx = i;
                }
            } else {
                this.sensors[i].ray.x2 = this.x+castDist*cosF(this.sensors[i].angle);
                this.sensors[i].ray.y2 = this.y-castDist*sinF(this.sensors[i].angle);
                this.sensors[i].ray.color = "green";
                this.sensors[i].dist = -1;
                if (castDist > maxDist) {
                    maxDist = rc.dist;
                    maxDistIdx = i;
                }
            }
        }
        
        if (this.bumpTimer <= 0) {
            if (numHits < 8) {
                if (this.sensors[0].dist !== -1 && this.sensors[0].dist <= this.bumpRange) {
                    this.bumpTimer = this.bumpTimerMax;
                    this.vx = this.vx > 0 ? -this.vx*this.bumpFactor : this.vx;
                    this.x -= this.sensors[0].dist + 1;
                } 
                if (this.sensors[4].dist !== -1 && this.sensors[4].dist <= this.bumpRange) {
                    this.bumpTimer = this.bumpTimerMax;
                    this.vx = this.vx < 0 ? -this.vx*this.bumpFactor : this.vx;
                    this.x += this.sensors[4].dist + 1;
                }
                if (this.sensors[2].dist !== -1 && this.sensors[2].dist <= this.bumpRange) {
                    this.bumpTimer = this.bumpTimerMax;
                    this.vy = this.vy < 0 ? -this.vy*this.bumpFactor : this.vy;
                    this.y += this.sensors[2].dist + 1;
                }
                if (this.sensors[6].dist !== -1 && this.sensors[6].dist <= this.bumpRange) {
                    this.bumpTimer = this.bumpTimerMax;
                    this.vy = this.vy > 0 ? -this.vy*this.bumpFactor : this.vy;
                    this.y -= this.sensors[6].dist + 1;
                }
            } else {
                this.vx = 0;
                this.vy = 0;
            }
        } else {
            this.bumpTimer -= dT;
        }
    }

    Draw(ctx) {
        if (!this.gameStage.camera.InCam(this)) { return; }

        let pos = this.gameStage.camera.ScreenPosition(this.x,this.y);
        ctx.beginPath();
        ctx.moveTo(pos.x+cosF(this.angle)*this.size,pos.y-sinF(this.angle)*this.size);
        ctx.lineTo(pos.x+cosF(this.angle+PI*3/4)*this.size,pos.y-sinF(this.angle+PI*3/4)*this.size);
        ctx.lineTo(pos.x+cosF(this.angle+PI*5/4)*this.size,pos.y-sinF(this.angle+PI*5/4)*this.size);
        ctx.closePath();
        ctx.fillStyle = this.colorFill;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = this.color;
        ctx.stroke();
    }
}

class Triangle extends GameObject {
    constructor(p1,p2,p3,c,dts,gs) {
        super(0,0,-1,c);
        this.colorFill = "#100202";
        let l = p1.x <= p2.x && p1.x <= p3.x ? p1.x : p2.x <= p1.x && p2.x <= p3.x ? p2.x : p3.x;
        let r = p1.x >= p2.x && p1.x >= p3.x ? p1.x : p2.x >= p1.x && p2.x >= p3.x ? p2.x : p3.x;
        let t = p1.y <= p2.y && p1.y <= p3.y ? p1.y : p2.y <= p1.y && p2.y <= p3.y ? p2.y : p3.y;
        let b = p1.y >= p2.y && p1.y >= p3.y ? p1.y : p2.y >= p1.y && p2.y >= p3.y ? p2.y : p3.y;
        this.bounds = {left:l,right:r,top:t,bottom:b};
        this.x = (l+r)/2;
        this.y = (t+b)/2;
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;
        this.thirdSideDraw = dts;
        this.gameStage = gs;
        this.areaSquared = Math.sqrt(AOTS(this.p1,this.p2,this.p3));
    }

    Contains(p) {
        // First, ensure the point is within the bounds of this object
        if (p.x < this.bounds.left || p.x > this.bounds.right || p.y < this.bounds.top || p.y > this.bounds.bottom) {
            return false;
        }

        let area1 = Math.sqrt(AOTS(this.p1,this.p2,p));
        let area2 = Math.sqrt(AOTS(this.p2,this.p3,p));
        let area3 = Math.sqrt(AOTS(this.p1,this.p3,p));

        if (area1 + area2 + area3 <= this.areaSquared) {
            return true;
        }

        return false;
    }

    Tick(dT){}

    Draw(ctx) {
        let sp1 = this.gameStage.camera.ScreenPosition(this.p1.x,this.p1.y);
        let sp2 = this.gameStage.camera.ScreenPosition(this.p2.x,this.p2.y);
        let sp3 = this.gameStage.camera.ScreenPosition(this.p3.x,this.p3.y);

        ctx.beginPath();
        ctx.moveTo(sp1.x,sp1.y);
        ctx.lineTo(sp2.x,sp2.y);
        ctx.lineTo(sp3.x,sp3.y);
        if (this.thirdSideDraw) {
            ctx.closePath();
        }
        ctx.fillStyle = this.colorFill;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = this.color;
        ctx.stroke();
    }
}

class Camera {
    constructor(l,r,t,b) {
        this.bounds = {left:l,right:r,top:t,bottom:b};
        this.x = (l+r)/2;
        this.y = (b+t)/2;
        this.width = r-l;
        this.height = b-t;
        this.target = null;
        this.tracking = false;
        this.trackingFactor = 0.004;
    }
    
    SetTarget(o) {
        this.tracking = true;
        this.target = o;
    }

    InCam(o) {
        return !(this.bounds.right < o.bounds.left || this.bounds.left > o.bounds.right ||
            this.bounds.top > o.bounds.bottom || this.bounds.bottom < o.bounds.top);
    }

    ScreenPosition(x,y) {
        return {x:x-this.x+this.width/2,y:y-this.y+this.height/2};
    }

    Move(x,y) {
        this.bounds.left += x;
        this.bounds.right += x;
        this.x += x;
        this.bounds.top += y;
        this.bounds.bottom += y;
        this.y += y;
    }

    Tick(dT) {
        if (this.target && this.tracking) {
            let dx = this.target.x - this.x;
            let dy = this.target.y - this.y;

            this.x += dx*this.trackingFactor * dT;
            this.y += dy*this.trackingFactor * dT;
        }
    }
}

class GameStage {
    constructor() {
        this.world = [];
        this.terrain = [];
        this.players = [];
        this.debugObjs = [];
        this.drawOrder = [];
        this.camera = new Camera(-WIDTH/2,WIDTH/2,-HEIGHT/2,HEIGHT/2);
        this.localPlayerID = -1;
    }

    Add(o,t) {
        if (t === "player") {
            this.players.push(this.world.length);
        } else if (t === "terrain") {
            this.terrain.push(this.world.length);
        } else if (t === "debug") {
            this.debugObjs.push(this.world.length);
        }

        this.world.push(o);

        // TODO: i dont think this must be done every time something is added
        this.AdjustDrawOrder();
    }

    // Removes an object at index i from the world. This will also cascade to other arrys to keep
    //     things manageable. NOTE: static objects should appear AS EARLY AS POSSIBLE in the world
    //     array in order to run things as fast as possible.
    Remove(i) {
        // remove from terrain.
        for (let j = 0; j < this.terrain.length; j++) {
            if (this.terrain[j] === i) {
                this.terrain.splice(j,1);
            } else if (this.terrain[j] > i) {
                this.terrain[j]--;
            }
        }

        // remove from players.
        for (let j = 0; j < this.players.length; j++) {
            if (this.players[j] === i) {
                this.players.splice(j,1);
            } else if (this.terrain[j] > i) {
                this.players[j]--;
            }
        }

        // remove from debugobjs.
        for (let j = 0; j < this.debugObjs.length; j++) {
            if (this.debugObjs[j] === i) {
                this.debugObjs.splice(j,1);
            } else if (this.terrain[j] > i) {
                this.debugObjs[j]--;
            }
        }
        
        // remove from drawOrder.
        for (let j = 0; j < this.drawOrder.length; j++) {
            if (this.drawOrder[j] === i) {
                this.drawOrder.splice(j,1);
            } else if (this.terrain[j] > i) {
                this.drawOrder[j]--;
            }
        }

        this.world.splice(i,1);
    }

    AdjustDrawOrder() {
        this.drawOrder = [];
        for (let i = 0; i < this.world.length; i++) {
            let z = this.world[i].z;

            // TODO: use a binary search since this array is ordered
            let added = false;
            for (let j = 0; j < this.drawOrder.length; j++) {
                if (z < this.world[this.drawOrder[j]].z) {
                    this.drawOrder.splice(j,0,i);
                    added = true;
                    break;
                }
            }
            if (!added) {
                this.drawOrder.push(i);
            }
        }
    }

    UserInput(t) {
        if (this.localPlayerID === -1 || this.world.length === 0) { return; }

        // Apply user input to the local player.
        if (t.type === "key") {
            this.world[this.players[this.localPlayerID]].keys[t.key] = t.down;
        } else if (t.type === "mouseMove") {
            this.world[this.players[this.localPlayerID]].mouse.x = t.x;
            this.world[this.players[this.localPlayerID]].mouse.y = t.y;
        } else if (t.type === "mouseButton") {
            this.world[this.players[this.localPlayerID]].mouse.down = t.down;
        }
    }

    Tick(dT) {
        this.camera.Tick(dT);

        // Tick in reverse order so things can be removed.
        for (let i = this.world.length-1; i >= 0; i--) {
            this.world[i].Tick(dT);
            if (!this.world[i].active) {
                this.Remove(i);
            }
        }
    }

    Draw(ctx) {
        ctx.fillStyle = "black";
        ctx.fillRect(0,0,WIDTH,HEIGHT);

        for (let i = 0; i < this.drawOrder.length; i++) {
            this.world[this.drawOrder[i]].Draw(ctx);
        }
    }
}

class Testground extends GameStage {
    constructor() {
        super();
        this.Add(new Player(0,0,this.localPlayerID,this),"player");
        this.localPlayerID = 0;
        this.camera.SetTarget(this.world[this.players[this.localPlayerID]]);

        this.Add(new Triangle({x:-200,y:-120},{x:300,y:-100},{x:0,y:-300},"red",true,this),"terrain");
        this.Add(new Triangle({x:-500,y:100},{x:500,y:200},{x:0,y:600},"red",true,this),"terrain");
        this.Add(new Triangle({x:200,y:-200},{x:200,y:200},{x:400,y:200},"red",false,this),"terrain");
        this.Add(new Triangle({x:400,y:200},{x:400,y:-200},{x:200,y:-200},"red",false,this),"terrain");
    }
}
