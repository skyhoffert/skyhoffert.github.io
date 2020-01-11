//
// Sky Hoffert
// Main code for this game.
//

var height = window.innerHeight * 0.95;
var width = height * 4/3;
var pi = 3.1415926;
var FPS = 30;
var keys = {a:false,s:false,d:false,w:false};

console.log("(w,h) = ("+width+","+height+")");

var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");
canvas.width = width;
canvas.height = height;
context.lineWidth = 2;

// Generating the landscape.
var pts = [{x:-10,y:height*3/4}];
var mindbp = 10;
var maxdbp = 20;
var diffdbp = maxdbp - mindbp;
var yd = 5;
var i = 1;
while (true) {
    let dbp = Math.random() * diffdbp + mindbp;
    let px = pts[i-1].x + dbp;
    let ryv = Math.tan((Math.random() - 0.5) * pi);
    let py = pts[i-1].y + ryv * yd;

    if (py >= height) {
        py -= (10 + (py - height) + Math.random()*10);
    } else if (py < height/2) {
        py += (10 + (height/2 - py) + Math.random()*10);
    }

    pts.push({x:px,y:py});

    i++;

    if (px > width) { break; }
}
// 2 more points to complete the polygon.
pts.push({x:pts[i-1].x,y:pts[i-1].y+height});
pts.push({x:pts[0].x,y:pts[i-1].y+height});

class Lander {
    constructor() {
        this.x = -10;
        this.y = 10;
        this.size = 15;
        this.vx = 0.2;
        this.vy = 0;
        this.angle = pi/2;
        this.accel = 0.00007;
        this.grav = 0.00002;
        this.maxfuel = 4.2;
        this.fuel = this.maxfuel;
        this.active = true;
        this.canaccel = true;
        this.cangrav = true;
        this.canturn = true;
        this.crashvel = 0.04;
        this.lldown = false;
        this.rldown = false;
        this.lldist = 100;
        this.rldist = 100;
        this.landingdescr = "";
        this.turnrate = 0.001;
        this.drawn = true;
        
        this.pts = [
            {a:pi/2,r:this.size},
            {a:pi*5/4,r:this.size},
            {a:-pi/4,r:this.size}
        ];
        this.pts = [
            // bottom right corner
            {a:-pi/4,r:this.size},
            // right leg
            {a:-pi/4,r:this.size*5/4},
            {a:-pi/6,r:this.size*5/4},
            {a:-pi/6,r:this.size*3/4},
            {a:-pi/4,r:this.size},
            // bottom left corner, left leg
            {a:pi*5/4,r:this.size},
            {a:pi*5/4,r:this.size*5/4},
            {a:pi*7/6,r:this.size*5/4},
            {a:pi*7/6,r:this.size*3/4},
            {a:pi*5/4,r:this.size},
            // upper left corner
            {a:pi*5/6,r:this.size*3/4},
            // upper right corner
            {a:pi*1/6,r:this.size*3/4},
            // top left corner
            {a:pi*5/6,r:this.size*3/4},
            {a:pi*9/16,r:this.size*7/6},
            {a:pi*7/16,r:this.size*7/6},
            // upper right corner
            {a:pi*1/6,r:this.size*3/4}
        ];

        this.thrustpts = [
            {a:-pi*3/4,r:this.size*9/8},
            {a:-pi/2,r:this.size*11/8},
            {a:-pi*1/4,r:this.size*9/8}
        ];
    }

    Tick(dT) {
        if (!this.active) { return; }

        let dx =  this.vx * dT;
        let dy = this.vy * dT;
        this.x += dx;
        this.y += dy;

        if (this.canturn) {
            if (keys.a) {
                this.angle += this.turnrate * dT;
            } else if (keys.d) {
                this.angle -= this.turnrate * dT;
            }
        }

        if (keys[" "] && this.canaccel && this.fuel > 0) {
            this.vx += dT * this.accel * Math.cos(pi/2+this.angle);
            this.vy += dT * this.accel * -Math.sin(pi/2+this.angle);
            this.fuel -= dT * this.accel * 10;
        }

        if (this.cangrav) {
            this.vy += this.grav * dT;
        }

        let coll = false;
        if (!this.lldown && !this.rldown) {
            coll = this.Collision();
        }
        
        if (this.lldown && this.rldown) {
            this.landingdescr = "perfect landing";
        } else if (this.lldown && this.rldist < this.size/12 ||
                   this.rldown && this.lldist < this.size/12) {
            this.landingdescr = "perfect landing";
        } else if (this.lldown && this.rldist < this.size/2) {
            this.landingdescr = "good landing";
        } else if (this.rldown && this.lldist < this.size/2) {
            this.landingdescr = "good landing";
        } else if (this.lldown || this.rldown) {
            this.landingdescr = "bad landing";
        }

        if (coll) {
            this.landingdescr = "crashed";
            this.active = false;
            this.drawn = false;

            let explpts = [];
            let vel = 0.4;
            let ms = 6;
            let np = 50;
            for (let i = 0; i < np; i++) {
                explpts.push({x:this.x,y:this.y,vx:Math.random()*vel-vel/2,
                    vy:Math.random()*vel-vel/2,col:"lightgray",size:Math.random()*ms});
            }
            lurkers.push(new Lurker(function (dT) {
                if (!this.vals.good) {
                    this.vals.good = true;
                    this.vals.duration = 2000;
                    this.vals.pts = [];
                    for (let i = 0; i < explpts.length; i++) {
                        this.vals.pts.push(explpts[i]);
                    }
                }

                for (let i = 0; i < this.vals.pts.length; i++) {
                    this.vals.pts[i].x += this.vals.pts[i].vx * dT;
                    this.vals.pts[i].y += this.vals.pts[i].vy * dT;
                }
                
                if (this.elapsed > this.vals.duration) {
                    return false;
                }
                return true;
            }, function (c) {
                for (let i = 0; i < this.vals.pts.length; i++) {
                    c.fillStyle = this.vals.pts[i].col;
                    c.fillRect(this.vals.pts[i].x,this.vals.pts[i].y,this.vals.pts[i].size,this.vals.pts[i].size);
                }
            }));
        }

        if (this.landingdescr !== "") {
            gameFinished = true;
        }
    }

    Collision() {
        // magnitude of velocity
        let MoV = Magnitude({x:this.vx,y:this.vy});
        let crash = false;

        // center point
        let cp = {x:this.x,y:this.y};

        // legs
        let ll = {x:this.x + Math.cos(this.angle + pi*5/4)*this.size*5/4,
            y:this.y - Math.sin(this.angle + pi*5/4)*this.size*5/4};
        let rl = {x:this.x + Math.cos(this.angle - pi/4)*this.size*5/4,
            y:this.y - Math.sin(this.angle - pi/4)*this.size*5/4};
        
        for (let i = 0; i < pts.length-1; i++) {
            let p1 = pts[i];
            let p2 = pts[i+1];
            
            // Check center
            if (cp.x < p2.x && cp.x > p1.x) {
                let xpos = (cp.x - p1.x)/(p2.x-p1.x);
                let gp = {x:cp.x,y:p1.y+(xpos*(p2.y-p1.y))};
                let gd = gp.y-cp.y;

                if (gd < 0) {
                    return true;
                }
            }
            
            if (ll.x < p2.x && ll.x > p1.x) {
                let xpos = (ll.x - p1.x)/(p2.x-p1.x);
                let gp = {x:ll.x,y:p1.y+(xpos*(p2.y-p1.y))};
                let gd = gp.y-ll.y;
                this.lldist = gd;

                if (gd < 0 && this.cangrav) {
                    this.canaccel = false;
                    this.cangrav = false;
                    this.vy = 0;
                    this.vx = 0;
                    this.canturn = false;
                    this.lldown = true;
                    
                    if (MoV > this.crashvel) {
                        crash = true;
                    }
                }
            }

            if (rl.x < p2.x && rl.x > p1.x) {
                let xpos = (rl.x - p1.x)/(p2.x-p1.x);
                let gp = {x:rl.x,y:p1.y+(xpos*(p2.y-p1.y))};
                let gd = gp.y-rl.y;
                this.rldist = gd;

                if (gd < 0 && this.cangrav) {
                    this.canaccel = false;
                    this.cangrav = false;
                    this.vy = 0;
                    this.vx = 0;
                    this.canturn = false;
                    this.rldown = true;
                    
                    if (MoV > this.crashvel) {
                        crash = true;
                    }
                }
            }
        }

        return crash;
    }

    Draw() {
        if (this.drawn) {

            context.strokeStyle = "white";
            DrawAnglePolygon(context,this.pts,this.x,this.y,this.angle);
            context.stroke();

            if (keys[" "] && this.canaccel && this.fuel > 0) {
                context.fillStyle = "#aa4444";
                DrawAnglePolygon(context, this.thrustpts, this.x, this.y, this.angle);
                context.fill();
            }


            let bw = 160;
            let bh = 40;
            context.fillStyle = "gray";
            DrawRect(context,width-(bw+5),5,bw*(this.fuel/this.maxfuel),bh);
            context.fill();

            context.strokeStyle = "white";
            DrawRect(context,width-(bw+5),5,bw,bh);
            context.stroke();

            /* DEBUG *
            context.fillStyle = "red";
            DrawPtAngle(context, this.x, this.y, this.angle + pi*5/4, this.size*5/4);
            DrawPtAngle(context, this.x, this.y, this.angle - pi/4, this.size*5/4);
            DrawPt(context, {x:this.x,y:this.y});
            /* */
        }

        if (this.landingdescr !== "") {
            context.fillStyle = "white";
            context.font = "40px Verdana";
            let wid = context.measureText(this.landingdescr).width;
            context.fillText(this.landingdescr,width/2 - wid/2, height/2-20);

            context.font = "20px Verdana";
            let txt = "Press Enter to restart"
            wid = context.measureText(txt).width;
            context.fillText(txt,width/2 - wid/2, height*3/4-10);
        }
    }
}

var lander = new Lander();

var lurkers = [];

var gameFinished = false;

function Tick(dT) {
    if (!gameFinished) {
        context.fillStyle = "black";
        DrawRect(context, 0, 0, width, height);
        context.fill();
    } else {
        context.fillStyle = "rgba(0,0,0,0.05)";
        DrawRect(context, 0, 0, width, height);
        context.fill();
    }

    context.strokeStyle = "lightgray";
    DrawPolygon(context,pts,0,0);
    context.fillStyle = "#222222";
    context.fill();
    context.stroke();

    lander.Tick(dT);

    lander.Draw();

    for (let i = 0; i < lurkers.length; i++) {
        lurkers[i].Tick(dT);
        lurkers[i].Draw(context);
    }

    for (let i = 0; i < lurkers.length; i++) {
        if (!lurkers[i].active) {
            lurkers.splice(i, 1);
            break;
        }
    }
}

let prevTime = Date.now();

function Update() {
    let now = Date.now();
    let dT = now - prevTime;
    prevTime = now;

    Tick(dT);
}

setInterval(Update, 1000/FPS);

document.addEventListener("keydown", function (evt) {
    keys[evt.key] = true;

    if (gameFinished && evt.key == "Enter") {
        window.location.reload(false);
    }
}, false);

document.addEventListener("keyup", function (evt) {
    keys[evt.key] = false;
}, false);
