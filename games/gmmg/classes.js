// Sky Hoffert

class Entity {
    constructor(x,y,w,h,c=0x0000ff) {
        this._x = x;
        this._y = y;
        this._width = w;
        this._height = h;
        this._color = c;
        this.id = "generic";

        this._UpdateBounds();

        this.active = true;
    }

    _UpdateBounds() {
        this._left = this._x - this._width/2;
        this._right = this._x + this._width/2;
        this._top = this._y - this._height/2;
        this._bottom = this._y + this._height/2;
    }

    Contains (x,y) {
        if (x > this._left && x < this._right) {
            if (y > this._top && y < this._bottom) {
                return true;
            }
        }
        return false;
    }

    Tick(dT) {
        if (!this.active) { return; }
    }

    Draw(g) {
        if (!this.active) { return; }

        g.lineStyle(2, this._color);
        g.drawRect(this._left, this._top, this._width, this._height);
    }
}

class Wall_LTRB extends Entity {
    constructor(l,t,r,b) {
        super((l+r)/2,(t+b)/2,r-l,b-t,0xff0000);
        this.id = "wall";
    }
}

class Wall_XYWH extends Wall_LTRB {
    constructor(x,y,w,h) {
        super(x-w/2,y-h/2,x+w/2,y+h/2);
    }
}

class KEntity extends Entity {
    constructor(x,y,w,h,c) {
        super(x,y,w,h,c);
        this._vx = 0;
        this._vy = 0;
    }

    Tick(dT) {
        this._x += this._vx;
        this._y += this._vy;

        this._UpdateBounds();
    }
}

class Player extends KEntity {
    constructor(x,y) {
        super(x,y,16,32,0x00ff00);
        this.id = "player";

        this._coll_feet = false;

        this._jumping = false;
    }

    _Collision() {
        this._coll_feet = false;

        let feet_x = this._x;
        let feet_y = this._y + this._height/2;
        let coll_dist = -1;

        let all_e = stage._entities;
        for (let i = 0; i < all_e.length; i++) {
            if (this._coll_feet) { break; }

            if (all_e[i].id === "wall") {
                for (let i = 0; i < 10; i++) {
                    if (all_e[i].Contains(feet_x, feet_y)) {
                        this._coll_feet = true;
                        coll_dist = i;
                        break;
                    }
                }
            }
        }

        if (coll_dist >= 0) {
            this._y -= coll_dist+0.2;
        }
    }

    _Jumping() {
        if (this._jumping) {
            if (this._coll_feet) {
                this._jumping = false;
            }
        }
    }

    Tick(dT) {
        this._vy += 7 * dT;

        if (keys["d"]) {
            this._vx = 10;
        }

        if (keys["a"]) {
            this._vx = -10;
        }

        if (!keys["a"] && !keys["d"]) {
            this._vx = 0;
        }

        if (keys[" "]) {
            if (!this._jumping) {
                this._vy = -10;
                this._jumping = true;
            }
        }

        this._Collision();

        this._Jumping();

        if (this._coll_feet) {
            this._vy = 0;
        }

        super.Tick(dT);
    }
}

class Stage {
    constructor() {
        this.active = true;
        this._entities = [];
    }

    AddEntity(e) {
        this._entities.push(e);
    }

    Tick(dT) {
        for (let i = 0; i < this._entities.length; i++) {
            this._entities[i].Tick(dT);
        }
    }

    Draw(g) {
        for (let i = 0; i < this._entities.length; i++) {
            this._entities[i].Draw(g);
        }
    }
}

class GameStage extends Stage{
    constructor() {
        super();
    }
}

class Testground extends GameStage {
    constructor() {
        super();

        this.AddEntity(new Wall_LTRB(100,700,1100,750));
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 6; c++) {
                this.AddEntity(new Wall_XYWH(150 + r*180, 200 + c*80, 60, 10));
            }
        }

        this.AddEntity(new Player(200,200));
    }
}