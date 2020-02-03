// Sky Hoffert
// Classes for saeg.

class GameObject {
    constructor(x,y,z,c) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.color = c;
        this.bounds = {left:0,right:0,top:0,bottom:0};
    }
    
    Contains(p) { return false; }
    Tick(dT) {}
    Draw(c) {}
}

class DebugRay extends GameObject {
    constructor(x,y,x2,y2,c) {
        super(x,y,10,c);
        this.x2 = x2;
        this.y2 = y2;
        this.active = true;
        this.lineWidth = 1;
    }

    Tick(dT) {}

    Draw(c) {
        if (this.active) {
            let pos = gameStage.camera.ScreenPosition(this.x,this.y);
            let pos2 = gameStage.camera.ScreenPosition(this.x2,this.y2);
            c.beginPath();
            c.moveTo(pos.x,pos.y);
            c.lineTo(pos2.x,pos2.y);
            c.strokeStyle = this.color;
            c.lineWidth = this.lineWidth;
            c.stroke();
            this.active = false;
        }
    }
}

class Player extends GameObject {
    constructor(x,y,id,gs) {
        super(x,y,0,"#404080");
        this.size = 20;
        this.id = id;
        this.keys = {};
        this.mouse = {x:0,y:0,down:false};
        this.gameStage = gs;
        this.bounds = {left:this.x-this.size,right:this.x+this.size,top:this.y-this.size,bottom:this.y+this.size};
        this.angle = 0;
    }

    Contains(p) {
        return false;
    }

    Tick(dT) {
        this.angle += 0.002*dT;

        let rc = Raycast(this.x,this.y,this.angle,200,this.gameStage.world,this.gameStage.terrain);
        if (rc.hit) {
            this.gameStage.Add(new DebugRay(this.x,this.y,rc.hitpt.x,rc.hitpt.y,"white"),"debug");
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
        ctx.lineWidth = 3;
        ctx.strokeStyle = this.color;
        ctx.stroke();
    }
}

class Triangle extends GameObject {
    constructor(p1,p2,p3,c,dts,gs) {
        super(0,0,-1,c);
        let l = p1.x < p2.x < p3.x ? p1.x : p2.x < p1.x < p3.x ? p2.x : p3.x;
        let r = p1.x > p2.x > p3.x ? p1.x : p2.x > p1.x > p3.x ? p2.x : p3.x;
        let t = p1.y < p2.y < p3.y ? p1.y : p2.y < p2.y < p3.y ? p2.y : p3.y;
        let b = p1.y > p2.y > p3.y ? p1.y : p2.y > p2.y > p3.y ? p2.y : p3.y;
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
        // TODO
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

    Remove(i) {
        // TODO: remove from world, cascade to other arrays.
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

        for (let i = 0; i < this.world.length; i++) {
            this.world[i].Tick(dT);
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

        this.Add(new Triangle({x:-100,y:-100},{x:100,y:-100},{x:0,y:-200},"red",true,this),"terrain");
    }
}
