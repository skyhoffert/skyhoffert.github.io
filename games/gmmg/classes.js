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

        this._LoadSprite(viewport.addChild(new PIXI.Sprite(PIXI.Texture.WHITE)));
        this._sprite.tint = 0xff0000;
    }
    
    _LoadSprite(s) {
		this._sprite = s;
		this._sprite.width = this._width;
		this._sprite.height = this._height;
		this._sprite.anchor.set(0.5);
		this._sprite.position.set(this._x, this._y);
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
		
		this._sprite.position.set(this._x, this._y);
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
        this._x += this._vx * dT;
        this._y += this._vy * dT;

        this._UpdateBounds();
		
		super.Tick(dT);
    }
}

class Player extends KEntity {
    constructor(x,y) {
        super(x,y,16,32,0x00ff00);
        this.id = "player";

        this._coll_feet = false;

        this._jumping = false;
		
		this._gravity = 300;
		this._speed = 400;
        this._jumpspeed = -300;

        this._maxfallspeed = 300;
        this._maxrunspeed = 300;
        
        viewport.removeChild(this._sprite);
		this._LoadSprite(viewport.addChild(new PIXI.Sprite.from("images/capsule_white.png")));
    }

    _Collision() {
        if (this._coll_feet) {
            let feet_x = this._x;
            let feet_y = this._y + this._height/2 + 2;
            let hit_something = false;
            
            let all_e = stage._entities;
            for (let i = 0; i < all_e.length; i++) {
                if (all_e[i].id === "wall") {
                    if (all_e[i].Contains(feet_x, feet_y)) {
                        hit_something = true;
                        break;
                    }
                }
            }

            if (!hit_something) {
                this._coll_feet = false;
            }
        } else if (this._vy > 0) {
            let feet_x = this._x;
            let feet_y = this._y + this._height/4;
            let dist = this._height/4 + 1;
            let coll_dist = -1;

            let all_e = stage._entities;
            for (let i = 0; i < all_e.length; i++) {
                if (this._coll_feet) { break; }

                if (all_e[i].id === "wall") {
                    for (let j = 0; j < dist; j++) {
                        if (all_e[i].Contains(feet_x, feet_y+j)) {
                            this._coll_feet = true;
                            coll_dist = j;
                            break;
                        }
                    }
                }
            }

            if (coll_dist >= 0) {
                this._y -= dist-coll_dist;
            }
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
        this._vy += this._gravity * dT;

        let running = false;
        if (keys["d"]) {
            this._vx += this._speed * dT;
            running = true;
        }

        if (keys["a"]) {
            this._vx -= this._speed * dT;
            running = true;
        }

        if (running) {
            if (Math.abs(this._vx) > this._maxrunspeed) {
                this._vx = Math.sign(this._vx) * this._maxrunspeed;
            }
        } else {
            if (Math.abs(this._vx) > 0.01) {
                this._vx -= Math.sign(this._vx) * this._speed/2 * dT;
            } else {
                this._vx = 0;
            }
        }

        if (keys[" "]) {
            if (!this._jumping && this._coll_feet) {
                this._vy = this._jumpspeed;
                this._jumping = true;
                this._coll_feet = false;
            }
        }

        this._Collision();

        this._Jumping();

        if (this._coll_feet) {
            this._vy = 0;
        } else {
            if (this._vy > 0) {
                if (this._vy < this._maxfallspeed) {
                    this._vy *= 1.05;
                } else {
                    this._vy = this._maxfallspeed;
                }
            }
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