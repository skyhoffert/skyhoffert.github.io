
class V2{ constructor(x, y){ this.x = x; this.y = y; } }

class Mouse {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.down = false;
    }
}

// Lerper is a cool class. It will call a callback and provide a value between 0 and 1 until the
// entire Lerp duration has completed. Lerpers are stored in a global array and handled in the
// main update function. The callback can also optionally have a second parameter that is only
// given as "true" on the final call.
class Lerper {
    constructor(dur, cb) {
        this.dur = dur;
        this.cb = cb;
        this.elapsed = 0;
    }

    Tick(dT) {
        // On the final tick, call the callback with an argument of 1 = 100%.
        if (this.elapsed + dT > this.dur) {
            this.cb(1, true);
            return;
        }

        // Otherwise, do the normal routine.
        this.elapsed += dT;

        this.cb(this.elapsed / this.dur, false);
    }
}

class Ship {
    constructor() {
        this.scale = 25;
        this.x = canvas.width/2;
        this.y = canvas.height/2;
        this.angle = 0;
        this.color = "red";

        this.turnSpeed = 0.002;
        this.moveSpeed = 0.0005;
        this.minAngle = 0.02;

        this.velX = 0;
        this.velY = 0;

        this.target = null;
        this.beaming = false;
        this.beamFactor = 0.0005;
    }

    Tick(dT) {
        // Align current angle with target angle (of mouse) depending on turn speed.
        let targAng = -Math.atan2(mouse.y - canvas.height/2, mouse.x - canvas.width/2);
        let diff = targAng - this.angle;

        if (Math.abs(diff) > Math.PI) {
            diff -= 2*Math.PI * Math.sign(diff);
        }

        if (Math.abs(diff) > this.minAngle) {
            this.angle += diff * this.turnSpeed * dT;

            this.angle += this.angle < -Math.PI ? 2*Math.PI : this.angle > Math.PI ? -2*Math.PI : 0;
        }

        // Move!
        if (mouse.down) {
            this.velX -= dT * this.moveSpeed * Math.cos(this.angle);
            this.velY += dT * this.moveSpeed * Math.sin(this.angle);

            let skew = 0.2;
            let trailLen = 5;
            let num = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < num; i++) {
                trails.push(new Trail(this.x - offsetX, this.y - offsetY, trailLen, this.angle + skew*Math.random() - skew/2, this.color, 1000));
            }
        }

        offsetX += dT * this.velX;
        offsetY += dT * this.velY;

        this.beaming = false;
        if (this.target !== null) {
            if (this.target.scanpc < 1) {
                let dist = Distance(this.x, this.y, this.target.x + offsetX, this.target.y + offsetY);
                if (dist < 200 && keys[81]) {
                    this.beaming = true;

                    this.target.Beam(dT * this.beamFactor);
                }
            }
        }

        this.target = null;
    }
    
    Draw() {
        // q is the offset to the rear points
        let q = Math.PI*11/16;

        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x + this.scale*Math.cos(this.angle), this.y - this.scale*Math.sin(this.angle));
        ctx.lineTo(this.x + this.scale*3/4*Math.cos(this.angle + q), this.y - this.scale*3/4*Math.sin(this.angle + q));
        ctx.lineTo(this.x + this.scale*1/6*Math.cos(this.angle + Math.PI), this.y - this.scale*1/6*Math.sin(this.angle + Math.PI));
        ctx.lineTo(this.x + this.scale*3/4*Math.cos(this.angle - q), this.y - this.scale*3/4*Math.sin(this.angle - q));
        ctx.closePath();
        ctx.stroke();

        if (this.target !== null) {
            // DEBUG: draw a highlight if cursor is hovering.
            let l = this.target.x + offsetX - this.target.size - 2;
            let r = this.target.x + offsetX + this.target.size + 2;
            let t = this.target.y + offsetY - this.target.size - 2;
            let b = this.target.y + offsetY + this.target.size + 2;
            ctx.strokeStyle = "red";
            ctx.beginPath();
            ctx.moveTo(l, t + this.target.size/2 + 2);
            ctx.lineTo(l, t);
            ctx.lineTo(l + this.target.size/2 + 2, t);
            ctx.moveTo(r, t + this.target.size/2 + 2);
            ctx.lineTo(r, t);
            ctx.lineTo(r - this.target.size/2 - 2, t);
            ctx.moveTo(l, b - this.target.size/2 - 2);
            ctx.lineTo(l, b);
            ctx.lineTo(l + this.target.size/2 + 2, b);
            ctx.moveTo(r, b - this.target.size/2 - 2);
            ctx.lineTo(r, b);
            ctx.lineTo(r - this.target.size/2 - 2, b);
            ctx.moveTo(r, b - this.target.size/2 - 2);
            ctx.closePath();
            ctx.stroke();

            if (this.target.scanpc < 1) {
                let barwidth = 30;
                ctx.fillStyle = "blue";
                ctx.fillRect(this.target.x + offsetX - barwidth/2, t - 14, barwidth * this.target.scanpc, 10);
                ctx.strokeStyle = "white";
                ctx.strokeRect(this.target.x + offsetX - barwidth/2, t - 14, barwidth, 10);
            }

            // DEBUG: beam to asteroid
            if (this.beaming) {
                ctx.strokeStyle = "blue";
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.target.x + offsetX, this.target.y + offsetY);
                ctx.closePath();
                ctx.stroke();
            }
        }
    }
}

class Asteroid {
    constructor(x, y, s) {
        this.x = x;
        this.y = y;
        this.size = s;
        this.active = true;
        this.visType = -1;
        this.type = Math.floor(3*Math.random());

        this.scanpc = 0;
    }

    Beam(amt) {
        if (this.scanpc < 1) {
            this.scanpc += amt;
            
            if (this.scanpc >= 1) {
                this.type = this.visType = this.type;
                this.scanpc = 1;
            }
        }
    }

    Tick(dT) {
        if (!this.active) { return; }

        // DEBUG: targeting
        let dist = Distance(this.x + offsetX, this.y + offsetY, mouse.x, mouse.y);
        if (dist < this.size) {
            playerShip.target = this;
        }
    }
    
    Draw() {
        if (!this.active) { return; }

        if (this.x + this.size + offsetX > 0 && this.x - this.size + offsetX < canvas.width &&
            this.y + this.size + offsetY > 0 && this.y - this.size + offsetY < canvas.height)
        {
            if (this.visType === 0) {
                ctx.strokeStyle = "#aaffaa";
            } else if (this.visType === 1) {
                ctx.strokeStyle = "#aaaaff";
            } else if (this.visType === 2) {
                ctx.strokeStyle = "#ffffaa";
            } else { ctx.strokeStyle = "white"; }

            ctx.beginPath();
            ctx.arc(this.x + offsetX, this.y + offsetY, this.size, 0, 2*Math.PI);
            ctx.closePath();
            ctx.stroke();
        }
    }
}

class Trail {
    constructor(x, y, len, ang, c, life) {
        this.x = x;
        this.y = y;
        this.len = len;
        this.ang = ang;
        this.color = c;
        this.life = life;
        this.active = true;
        
        this.cos = this.len * Math.cos(-this.ang);
        this.sin = this.len * Math.sin(-this.ang);
    }

    Tick(dT) {
        if (!this.active) { return; }

        this.life -= dT;
        
        if (this.life <= 0) {
            this.active = false;
        }

        this.x -= 0.1 * this.cos * dT;
        this.y -= 0.1 * this.sin * dT;
    }

    Draw() {
        if (!this.active) { return; }

        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.x - this.cos + offsetX, this.y - this.sin + offsetY);
        ctx.lineTo(this.x + this.cos + offsetX, this.y + this.sin + offsetY);
        ctx.closePath();
        ctx.stroke();
    }
}