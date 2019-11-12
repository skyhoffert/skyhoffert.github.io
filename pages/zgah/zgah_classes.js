
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
        this.active = true;
    }

    Tick(dT) {
        // On the final tick, call the callback with an argument of 1 = 100%.
        if (this.elapsed + dT > this.dur) {
            this.cb(1, true);
            this.active = false;
            return;
        }

        // Otherwise, do the normal routine.
        this.elapsed += dT;

        this.cb(this.elapsed / this.dur, false);
    }
}

// Lurker is similar to lerper, but it will run continuously until the callback returns a value
// of "false". At that point it will no longer call the callback.
class Lurker {
    constructor(cb) {
        this.cb = cb;
        this.elapsed = 0;
        this.active = true;
    }

    Tick(dT) {
        if (!this.active) { return; }

        this.active = this.cb(dT);
    }
}

// Ship represents a player's ship.
class Ship {
    constructor(t=0) {
        this.size = 25;
        this.x = WIDTH/2;
        this.y = HEIGHT/2;
        this.angle = 0;
        this.active = true;
        this.type = t;

        // Set traits to average (type === 0)
        this.turnSpeed = 0.002;
        this.turnSpeedUpgradeFactor = 1.01;

        this.moveSpeed = 0.0005;
        this.moveSpeedUpgradeFactor = 1.005;

        this.minAngle = 0.02;
        this.slowFactor = 0.0005;

        this.velX = 0;
        this.velY = 0;

        this.target = null;

        this.scanning = false;
        this.scanFactor = 0.004 ;
        this.scanUpgradeFactor = 1.008;
        this.scanDist = 150;
        this.scanDistUpgradeFactor = 1.008;

        this.hitting = false;
        this.hitFactor = 0.002;
        this.hitUpgradeFactor = 1.006;
        this.hitDist = 125;
        this.hitDistUpgradeFactor = 1.006;

        this.attractDist = 200;
        this.attractDistUpgradeFactor = 1.005;

        this.trailColor = "#662222";

        this.demoVel = 0.2;

        this.scoreLossOnDeath = 20;

        this.canCollect = true;
        this.canImpact = true;
        this.canTurn = true;
        this.canMove = true;
        this.canSlow = true;
        this.canTarget = true;
        this.canScan = true;
        this.canHit = true;
        this.canAttract = true;

        if (this.type === 1) {
            // Miner.
            this.turnSpeed = 0.001;
            this.moveSpeed = 0.00025;
            this.scanFactor = 0.002;
            this.scanDist = 125;
            this.slowFactor = 0.0008;
            this.hitFactor = 0.004;
            this.hitDist = 135;
            this.attractDist = 190;
        } else if (this.type === 2) {
            // Scout.
            this.turnSpeed = 0.003;
            this.moveSpeed = 0.0008;
            this.scanFactor = 0.006;
            this.scanDist = 175;
            this.slowFactor = 0.0004;
            this.hitFactor = 0.001;
            this.hitDist = 110;
            this.attractDist = 220;
        } else if (this.type === -1) {
            // Tutorial type
            this.turnSpeed = 0.004;
            this.moveSpeed = 0.0003;
            this.scanFactor = 0.008;
            this.scanDist = 180;
            this.hitFactor = 0.005;
            this.hitDist = 150;
            this.slowFactor = 0.001;
            this.attractDist = 200;
            
            // Tutorial begins without player control
            this.canCollect = false;
            this.canImpact = false;
            this.canTurn = false;
            this.canMove = false;
            this.canSlow = false;
            this.canTarget = false;
            this.canScan = false;
            this.canHit = false;
            this.canAttract = false;
        }
        
        if (this.type === 0 || this.type === -1) {
            this.color = "#c72422";
        } else if (this.type === 1) {
            this.color = "#923acc";
        } else if (this.type === 2) {
            this.color = "#cf5e2a";
        }
    }
    
    Reset() {
        this.velX = 0;
        this.velY = 0;
        this.active = true;
        this.target = null;
        this.scanning = false;
        this.hitting = false;
    }

    EnterGodMode() {
        this.turnSpeed = 0.01;
        this.moveSpeed = 0.001;
        this.slowFactor = 0.001;
        this.scanFactor = 1;
        this.scanDist = 1000;
        this.hitFactor = 1;
        this.hitDist = 1000;
        this.attractDist = 1000;
        this.canImpact = false;
    }

    // Used for collecting Materials.
    // @param t (int): type of material collected
    Collect(t) {
        if (!this.canCollect) { return; }

        if (t === 0) {
            this.scanDist *= this.scanDistUpgradeFactor;
            this.scanFactor *= this.scanUpgradeFactor;
        } else if (t === 1) {
            this.hitDist *= this.hitDistUpgradeFactor;
            this.hitFactor *= this.hitUpgradeFactor;
        } else if (t === 2) {
            this.turnSpeed *= this.turnSpeedUpgradeFactor;
        } else if (t === 3) {
            this.attractDist *= this.attractDistUpgradeFactor;
        } else if (t === 4) {
            this.moveSpeed *= this.moveSpeedUpgradeFactor;
        }
    }

    // On collision with an asteroid, this function is called.
    // @param obj: object being collided with
    Impact(obj) {
        if (!this.canImpact) { return; }

        if (this.active && Math.abs(this.velX) + Math.abs(this.velY) > this.demoVel) {
            let numP = 100;
            for (let i = 0; i < numP; i++) {
                trails.push(new Trail(this.x - offsetX + (Math.random() * 4 - 2), 
                    this.y - offsetY + (Math.random() * 4 - 2), 
                    this.velX * Math.random(), this.velY * Math.random(),
                    3, Math.random() * 2 * Math.PI, this.color, 2000));
            }

            this.active = false;

            lerpers.push(new Lerper(2000, function (p, d) {
                if (d) {
                    let min = score - playerShip.scoreLossOnDeath < 0 ? 0 : score - playerShip.scoreLossOnDeath;
                    score = min;
                    playerShip.Reset();
                    offsetX = 0;
                    offsetY = 0;
                }
            }));
        }
    }

    Tick(dT) {
        if (!this.active) { return; }

        if (this.canTurn) {
            // Align current angle with target angle (of mouse) depending on turn speed.
            let targAng = -Math.atan2(mouse.y - HEIGHT/2, mouse.x - WIDTH/2);
            let diff = targAng - this.angle;

            if (Math.abs(diff) > Math.PI) {
                diff -= 2*Math.PI * Math.sign(diff);
            }

            if (Math.abs(diff) > this.minAngle) {
                this.angle += diff * this.turnSpeed * dT;

                this.angle += this.angle < -Math.PI ? 2*Math.PI : this.angle > Math.PI ? -2*Math.PI : 0;
            }
        }

        // Move!
        if (this.canMove && (mouse.down || keys[32])) {
            this.velX -= dT * this.moveSpeed * Math.cos(this.angle);
            this.velY += dT * this.moveSpeed * Math.sin(this.angle);

            let skew = 0.2;
            let trailLen = 5;
            let num = Math.floor(Math.random() * dT/30) + 1;
            for (let i = 0; i < num; i++) {
                trails.push(new Trail(this.x - offsetX, this.y - offsetY, this.velX, this.velY, 
                    trailLen, this.angle + skew*Math.random() - skew/2, this.trailColor, 2000));
            }
        } else {
            if (this.canSlow) {
                this.velX -= this.velX * this.slowFactor * dT;
                this.velY -= this.velY * this.slowFactor * dT;
            }
        }

        offsetX += dT * this.velX;
        offsetY += dT * this.velY;

        this.scanning = false;
        this.hitting = false;
        if (this.target !== null) {
            if (this.canScan && this.target.scanpc < 1 && keys[81]) {
                let dist = Distance(this.x, this.y, this.target.x + offsetX, this.target.y + offsetY);
                if (dist < this.scanDist) {
                    this.scanning = true;

                    this.target.Scan(dT * this.scanFactor);
                }
            }

            if (this.canHit && keys[87]) {
                let dist = Distance(this.x, this.y, this.target.x + offsetX, this.target.y + offsetY);
                if (dist < this.hitDist) {
                    this.hitting = true;

                    this.target.Hit(dT * this.hitFactor);
                }
            }
        }

        this.target = null;
    }
    
    Draw(ctx) {
        if (!this.active) { return; }

        // Draw the ship. Depends on type.
        ctx.strokeStyle = this.color;
        if (this.type === 0 || this.type === -1) {
            // q is the offset to the rear points
            let q = Math.PI*11/16;

            ctx.beginPath();
            ctx.moveTo(this.x + this.size*Math.cos(this.angle), this.y - this.size*Math.sin(this.angle));
            ctx.lineTo(this.x + this.size*3/4*Math.cos(this.angle + q), this.y - this.size*3/4*Math.sin(this.angle + q));
            ctx.lineTo(this.x + this.size*1/6*Math.cos(this.angle + Math.PI), this.y - this.size*1/6*Math.sin(this.angle + Math.PI));
            ctx.lineTo(this.x + this.size*3/4*Math.cos(this.angle - q), this.y - this.size*3/4*Math.sin(this.angle - q));
            ctx.closePath();
            ctx.stroke();
        } else if (this.type === 1) {
            let qf = Math.PI*3/16;
            let ff = 3/4;
            let qr = Math.PI*11/16
            let fr = 7/8;
            let fe = 1/8;

            ctx.beginPath();
            ctx.moveTo(this.x + this.size*Math.cos(this.angle), this.y - this.size*Math.sin(this.angle));
            ctx.lineTo(this.x + this.size*ff*Math.cos(this.angle + qf), this.y - this.size*ff*Math.sin(this.angle + qf));
            ctx.lineTo(this.x + this.size*fr*Math.cos(this.angle + qr), this.y - this.size*fr*Math.sin(this.angle + qr));
            ctx.lineTo(this.x + this.size*fe*Math.cos(this.angle + Math.PI), this.y - this.size*fe*Math.sin(this.angle + Math.PI));
            ctx.lineTo(this.x + this.size*fr*Math.cos(this.angle - qr), this.y - this.size*fr*Math.sin(this.angle - qr));
            ctx.lineTo(this.x + this.size*ff*Math.cos(this.angle - qf), this.y - this.size*ff*Math.sin(this.angle - qf));
            ctx.closePath();
            ctx.stroke();
        } else if (this.type === 2) {
            let qf = Math.PI*3/8;
            let ff = 1/2;
            let qf2 = Math.PI*1/4;
            let ff2 = 3/4;
            let qs = Math.PI*1/2;
            let fs = 3/4;
            let qr = Math.PI*11/16
            let fr = 7/8;
            let qb = Math.PI*11/16;
            let fb = 3/8;
            let fe = 5/8;

            ctx.beginPath();
            ctx.moveTo(this.x + this.size*Math.cos(this.angle), this.y - this.size*Math.sin(this.angle));
            ctx.lineTo(this.x + this.size*ff*Math.cos(this.angle + qf), this.y - this.size*ff*Math.sin(this.angle + qf));
            ctx.lineTo(this.x + this.size*ff2*Math.cos(this.angle + qf2), this.y - this.size*ff2*Math.sin(this.angle + qf2));
            ctx.lineTo(this.x + this.size*fs*Math.cos(this.angle + qs), this.y - this.size*fs*Math.sin(this.angle + qs));
            ctx.lineTo(this.x + this.size*fr*Math.cos(this.angle + qr), this.y - this.size*fr*Math.sin(this.angle + qr));
            ctx.lineTo(this.x + this.size*fb*Math.cos(this.angle + qb), this.y - this.size*fb*Math.sin(this.angle + qb));
            ctx.lineTo(this.x + this.size*fe*Math.cos(this.angle + Math.PI), this.y - this.size*fe*Math.sin(this.angle + Math.PI));
            ctx.lineTo(this.x + this.size*fb*Math.cos(this.angle - qb), this.y - this.size*fb*Math.sin(this.angle - qb));
            ctx.lineTo(this.x + this.size*fr*Math.cos(this.angle - qr), this.y - this.size*fr*Math.sin(this.angle - qr));
            ctx.lineTo(this.x + this.size*fs*Math.cos(this.angle - qs), this.y - this.size*fs*Math.sin(this.angle - qs));
            ctx.lineTo(this.x + this.size*ff2*Math.cos(this.angle - qf2), this.y - this.size*ff2*Math.sin(this.angle - qf2));
            ctx.lineTo(this.x + this.size*ff*Math.cos(this.angle - qf), this.y - this.size*ff*Math.sin(this.angle - qf));
            ctx.closePath();
            ctx.stroke();
        }

        // Prepare for drawing distances around the ship.
        ctx.setLineDash([10, 5]);

        // Draw the "scan" distance
        ctx.strokeStyle = "#050511";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.scanDist, 0, 2*Math.PI);
        ctx.closePath();
        ctx.stroke();
        
        // Draw the "hit" distance
        ctx.strokeStyle = "#110505";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.hitDist, 0, 2*Math.PI);
        ctx.closePath();
        ctx.stroke();
        
        // Draw the "attract" distance
        ctx.strokeStyle = "#070707";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.attractDist, 0, 2*Math.PI);
        ctx.closePath();
        ctx.stroke();

        // Go back to normal drawing type
        ctx.setLineDash([]);

        if (this.target !== null) {
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

            if (this.target.lastAction === "scan") {
                let barwidth = 60;
                ctx.fillStyle = "blue";
                ctx.fillRect(this.target.x + offsetX - barwidth/2, t - 14, barwidth * this.target.scanpc, 10);
                ctx.strokeStyle = "white";
                ctx.strokeRect(this.target.x + offsetX - barwidth/2, t - 14, barwidth, 10);
            } else if (this.target.health > 0) {
                let barwidth = 60;
                ctx.fillStyle = "red";
                ctx.fillRect(this.target.x + offsetX - barwidth/2, t - 14, barwidth * this.target.health, 10);
                ctx.strokeStyle = "white";
                ctx.strokeRect(this.target.x + offsetX - barwidth/2, t - 14, barwidth, 10);
            }

            if (this.scanning) {
                ctx.strokeStyle = "blue";
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.target.x + offsetX, this.target.y + offsetY);
                ctx.closePath();
                ctx.stroke();
            } else if (this.hitting) {
                ctx.strokeStyle = "red";
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
    constructor(x, y, s, t=null, known=false) {
        this.x = x;
        this.y = y;
        this.velM = 0.08;
        this.velX = this.velM * Math.random() - this.velM/2;
        this.velY = this.velM * Math.random() - this.velM/2;
        this.size = s;
        this.active = true;
        this.type = t === null ? Math.floor(5*Math.random()) : t;
        this.color = "white";
        this.explosionColor = "#aaaaaa";

        this.lastAction = "scan"; // could be scan or hit

        this.scanpc = 0.0;

        this.health = 1.0;

        this.minSize = 14;

        this.angles = [0];
        this.ds = [this.size];

        this.rotRate = 0.0015 * Math.random();

        this.targetFactor = 2;
        this.minTargetDistance = 50;
        
        let i = 0;

        while (this.angles[this.angles.length-1] < 2*Math.PI) {
            this.angles.push(this.angles[i] + Math.random() * Math.PI/3 + Math.PI/8);
            this.ds.push(Math.random() * this.size/5 + this.size*9/10);
            i++;
        }

        this.angles.splice(this.angles.length-1, 1);
        this.ds.splice(this.ds.length-1);
        
        if (known) {
            this.scanpc = 1;
            this.lastAction = "hit";
            this.color = ColorsForType(this.type)[0];
            this.explosionColor = ColorsForType(this.type)[1];
        }
    }

    Scan(amt) {
        if (this.scanpc < 1) {
            this.scanpc += amt / this.size;

            this.lastAction = "scan";
            
            if (this.scanpc >= 1) {
                this.scanpc = 1;

                // only reveal colors after being fully scanned
                this.color = ColorsForType(this.type)[0];
                this.explosionColor = ColorsForType(this.type)[1];
            }
        }
    }

    Hit(amt) {
        if (this.health > 0) {
            this.health -= amt / this.size;

            this.lastAction = "hit";

            if (this.health < 0) {
                this.active = false;
                this.health = 0;
                
                let numP = this.size;
                for (let i = 0; i < numP; i++) {
                    trails.push(new Trail(this.x + (Math.random() * 4 - 2), 
                        this.y + (Math.random() * 4 - 2), 
                        (this.velX * Math.random()), (this.velY * Math.random()),
                        3, Math.random() * 2 * Math.PI, this.explosionColor, 5000, 0.05));
                }

                if (this.size > this.minSize) {
                    let num = Math.floor(Math.random()*2 + 2);
                    for (let i = 0; i < num; i++) {
                        asteroids.push(new Asteroid(this.x + 2*this.size * Math.random() - this.size,
                            this.y + 2*this.size * Math.random() - this.size, this.size/num, this.type, this.scanpc >= 1));
                    }
                } else {
                    let numM = this.size;
                    for (let i = 0; i < numM; i++) {
                        materials.push(new Material(this.x + 2*this.size * Math.random() - this.size,
                            this.y + 2*this.size * Math.random() - this.size, this.type));
                    }
                }
            }
        }
    }

    Collision(x, y) {
        if (!this.active) { return false; }

        if (Distance(x, y, this.x + offsetX, this.y + offsetY) < this.size) {
            return true;
        }

        return false;
    }

    Tick(dT) {
        if (!this.active) { return; }

        // DEBUG: targeting
        if (playerShip.canTarget) {
            let dist = Distance(this.x + offsetX, this.y + offsetY, mouse.x, mouse.y);
            if (dist < this.minTargetDistance || dist < this.size * this.targetFactor) {
                playerShip.target = this;
            }
        }

        for (let i = 0; i < this.angles.length; i++) {
            this.angles[i] += this.rotRate * dT;
        }

        this.x += this.velX * dT;
        this.y += this.velY * dT;
    }
    
    Draw(ctx) {
        if (!this.active) { return; }

        if (this.x + this.size + offsetX > 0 && this.x - this.size + offsetX < WIDTH &&
            this.y + this.size + offsetY > 0 && this.y - this.size + offsetY < HEIGHT)
        {
            ctx.strokeStyle = this.color;

            ctx.beginPath();
            ctx.moveTo(this.x + this.ds[0] * Math.cos(this.angles[0]) + offsetX, 
                this.y + this.ds[0] * Math.sin(this.angles[0]) + offsetY);
            for (let i = 1; i < this.angles.length; i++) {
                ctx.lineTo(this.x + this.ds[i] * Math.cos(this.angles[i]) + offsetX, 
                    this.y + this.ds[i] * Math.sin(this.angles[i]) + offsetY);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
}

class Trail {
    constructor(x, y, velX, velY, len, ang, c, life, angFac=0.1) {
        this.x = x;
        this.y = y;
        this.velX = velX;
        this.velY = velY;
        this.len = len;
        this.ang = ang;
        this.color = c;
        this.life = life;
        this.active = true;
        this.angFac = angFac;

        this.size = 2;

        this.type = 1;
        
        this.cos = this.len * Math.cos(-this.ang);
        this.sin = this.len * Math.sin(-this.ang);
    }

    Tick(dT) {
        if (!this.active) { return; }

        this.life -= dT;
        
        if (this.life <= 0) {
            this.active = false;
        }

        this.x -= (this.angFac * this.cos + this.velX) * dT;
        this.y -= (this.angFac * this.sin + this.velY) * dT;
    }

    Draw(ctx) {
        if (!this.active) { return; }

        ctx.strokeStyle = this.color;
        if (this.type === 0) {
            ctx.beginPath();
            ctx.moveTo(this.x - this.cos + offsetX, this.y - this.sin + offsetY);
            ctx.lineTo(this.x + this.cos + offsetX, this.y + this.sin + offsetY);
            ctx.closePath();
            ctx.stroke();
        } else if (this.type === 1) {
            ctx.beginPath();
            ctx.arc(this.x + offsetX, this.y + offsetY, this.size, 0, 2*Math.PI);
            ctx.closePath();
            ctx.stroke();
        }
    }
}

class Material {
    constructor(x, y, t) {
        this.x = x;
        this.y = y;
        this.type = t;
        this.color = ColorsForType(this.type)[0];
        this.size = 3;
        this.active = true;

        this.moveSpeed = 0.1;
        this.minMove = 0.05;
    }

    Tick(dT) {
        if (!this.active) { return; }

        if (playerShip.canAttract) {
            let d = Distance(this.x + offsetX, this.y + offsetY, playerShip.x, playerShip.y);
            if (d < playerShip.size/2) {
                this.active = false;
                score += 1;
                playerShip.Collect(this.type);
            } else if (d < playerShip.attractDist) {
                let dx = playerShip.x - (this.x + offsetX) + this.minMove;
                let dy = playerShip.y - (this.y + offsetY) + this.minMove;
                let mag = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));

                this.x += this.moveSpeed * dx/mag * dT;
                this.y += this.moveSpeed * dy/mag * dT;
            }
        }
    }

    Draw(ctx) {
        if (!this.active) { return; }

        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x + offsetX, this.y + offsetY, this.size, 0, 2*Math.PI);
        ctx.closePath();
        ctx.stroke();
    }
}

class Star {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.floor(2*Math.random() + 1.1);
        this.moveFactor = 0.15;

        let d = 4;
        let b = 9;
        let p = Math.floor(Math.random() * (b - d) + d);
        this.color = "#";
        for (let i = 0; i < 6; i++) {
            this.color += ("" + b);
        }
    }

    Draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + offsetX*this.moveFactor, this.y + offsetY*this.moveFactor, this.size, this.size);
    }
}

class UIButton {
    constructor(x, y, w, h, st, dm=function(ctx){}) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.bgColor = "#101010";
        this.hover = false;

        this.shipType = st;

        this.drawMore = dm;
    }

    Hover(x, y) {
        this.hover = false;
        if (x > this.x - this.w/2 && x < this.x + this.w/2 &&
            y > this.y - this.h/2 && y < this.y + this.h/2) {
            this.hover = true;
        }
    }

    Click(x, y) {
        if (x > this.x - this.w/2 && x < this.x + this.w/2 &&
            y > this.y - this.h/2 && y < this.y + this.h/2) {
            Init(0, "randomField", this.shipType);
        }
    }

    Draw(ctx) {
        let fac = this.hover ? 1.05 : 1;
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(this.x - fac*this.w/2, this.y - fac*this.h/2, fac*this.w, fac*this.h);

        this.drawMore(ctx);
    }
}