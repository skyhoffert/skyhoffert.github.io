//
// Sky Hoffert
// Classes for 2duni
//

function Magnitude(x,y) {
    return Math.sqrt(x*x + y*y);
}

class Player {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.size = 4;
        this.color = "#7777aa";
        this.angle = 0;
        this.keys = {a:false,d:false,w:false,s:false,q:false,e:false};
        this.turnRate = 0.002;
        this.moveSpeed = 0.02;
    }

    Tick(dT) {
        if (this.keys.q) {
            this.angle += this.turnRate * dT;
        } else if (this.keys.e) {
            this.angle -= this.turnRate * dT;
        }

        if (this.keys.w) {
            this.x -= Math.cos(this.angle) * dT * this.moveSpeed;
            this.y -= -Math.sin(this.angle) * dT * this.moveSpeed
        } else if (this.keys.s) {
            this.x += Math.cos(this.angle) * dT * this.moveSpeed;
            this.y += -Math.sin(this.angle) * dT * this.moveSpeed;
        } else if (this.keys.a) {
            this.x += Math.sin(this.angle) * dT * this.moveSpeed;
            this.y += Math.cos(this.angle) * dT * this.moveSpeed;
        } else if (this.keys.d) {
            this.x += -Math.sin(this.angle) * dT * this.moveSpeed;
            this.y += -Math.cos(this.angle) * dT * this.moveSpeed;
        }

        if (this.angle < 0) {
            this.angle += 2*pi;
        } else if (this.angle > 2*pi) {
            this.angle -= 2*pi;
        }
    }

    Draw(c,m,p) {
        let px = m.x + m.width/2;
        let py = m.y + m.height/2;
        c.fillStyle = this.color;
        c.beginPath();
        c.arc(px, py, this.size, 0, 2*pi);
        c.fill();
        c.strokeStyle = "red";
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(px + Math.cos(this.angle)*this.size*4,py + -Math.sin(this.angle)*this.size*4);
        c.stroke();
    }
}

class CircleWall {
    constructor(x,y,r) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.color = "purple";
    }

    Tick(dT){}

    Draw(c,m,p) {
        let wx = this.x + p.x;
        let wy = this.y + p.y;

        let px = m.x + m.width/2 + wx;
        let py = m.y + m.height/2 + wy;

        if (px > m.x && px < m.x + m.width &&
            py > m.y && py < m.y + m.height) {
            c.fillStyle = this.color;
            c.beginPath();
            c.arc(px, py, this.r, 0, 2*pi);
            c.fill();
        }

        let wmag = Magnitude(wx, wy) - p.size;

        if (wmag < FOG_DIST) {
            let ang = Math.atan2(-wy, wx);
            if (ang < 0) {
                ang = ang - (-2*pi);
            }

            let ffov = 2*wmag * Math.tan(FOV_ANGLE);
            let s = this.r / ffov * width;
            let hp = (p.angle - ang) / (2*FOV_ANGLE) * width + width/2;
            c.fillStyle = this.color;
            c.fillRect(hp-s/2,height/2-20,s,40);
        }
    }
}

class Map {
    constructor(x,y,w,h,bg="black") {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.bg = bg;
    }

    Draw(c) {
        c.fillStyle = this.bg;
        c.fillRect(this.x,this.y,this.width,this.height);
        c.strokeStyle = "white";
        c.strokeRect(this.x,this.y,this.width,this.height);
    }
}