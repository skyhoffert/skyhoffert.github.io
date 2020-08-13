// Sky Hoffert
// Classes for 8b.

///////////////////////////////////////////////////////////////////////////////////////////////////
// Classes ////////////////////////////////////////////////////////////////////////////////////////

class GroundElement {
    constructor(x,y,rad,f=false) {
        this._x = x;
        this._y = y;
        this._radius = rad;
        this._flipped = f; // true or false

        this._body = Bodies.polygon(this._x, this._y, 3, this._radius, {isStatic:true});
        if (this._flipped) {
            Matter.Body.rotate(this._body, -Math.PI/6);
        } else {
            Matter.Body.rotate(this._body, Math.PI/6);
        }
        this._poly = new PIXI.Polygon(this._body.vertices);

        World.add(engine.world, [this._body]);
    }

    Destroy() {
        World.remove(engine.world, [this._body]);
    }

    Contains(x, y) {
        return this._poly.contains(x, y);
    }

    DistTo(x, y) {
        return Math.hypot(this._x - x, this._y - y);
    }

    Draw() {
        stage_graphics.lineStyle(2, 0x0000ff, 1);
        stage_graphics.beginFill(0x0000ff);
        stage_graphics.drawPolygon(this._poly);
        stage_graphics.endFill();
    }
}

class GroundWall {
    constructor(opt) {
        if (opt.type === "lrtb") {
            this._left = opt.left;
            this._right = opt.right;
            this._top = opt.top;
            this._bottom = opt.bottom;

            this._x = (opt.left + opt.right) / 2;
            this._y = (opt.top + opt.bottom) / 2;
            this._width = opt.right - opt.left;
            this._height = opt.bottom - opt.top;
        } else {
            console.log("could not parse options for ground wall.");
            return;
        }
        
        this._sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
        this._sprite.width = this._width;
        this._sprite.height = this._height;
        this._sprite.anchor.set(0.5);
        this._sprite.position.set(this._x, this._y);
        this._sprite.tint = 0x00ff00;
        stage.addChild(this._sprite);
        
        this._body = Bodies.rectangle(this._x, this._y, this._width, this._height, {isStatic:true});
        World.add(engine.world, [this._body]);
    }

    Contains(x, y) {
        return (x > this._left && x < this._right) && (y > this._top && y < this._bottom);
    }
}

class Ground {
    constructor() {
        this._walls = [];
        this._elems = [];
        this._ge_rad = 7;
        
        // Add elements.
        for (let j = 0; j < 20; j++) {
            for (let i = 0; i < 20; i++) {
                this._elems.push(new GroundElement(2*i*this._ge_rad, 200 + 3/2*j*this._ge_rad,
                    this._ge_rad, false));
                this._elems.push(new GroundElement((2*i+1)*this._ge_rad, 200 + (3/2*j)*this._ge_rad + this._ge_rad/2,
                    this._ge_rad, true));
            }
        }

        /* DEBUG
        // Add walls.
        this._walls.push(new GroundWall({
            type:"lrtb",
            left:-20,
            right:0,
            top:200-this._ge_rad*2,
            bottom:200 + this._ge_rad*20,
        }));
        this._walls.push(new GroundWall({
            type:"lrtb",
            left:0 + 19*this._ge_rad,
            right:0 + 19*this._ge_rad+20,
            top:200-this._ge_rad*2,
            bottom:200 + this._ge_rad*20,
        }));
        */
    }

    Collides(b) {
        for (let i = 0; i < this._elems.length; i++) {
            if (Matter.SAT.collides(b, this._elems[i]._body).collided) { return true; }
        }
        for (let i = 0; i < this._walls.length; i++) {
            if (Matter.SAT.collides(b, this._walls[i]._body).collided) { return true; }
        }
    }

    Bomb(x, y, r) {
        for (let i = 0; i < this._elems.length; i++) {
            if (this._elems[i].DistTo(x, y) < r) {
                this._elems[i].Destroy();
                this._elems.splice(i, 1);
                i--;
            }
        }
    }

    Draw() {
        for (let i = 0; i < this._elems.length; i++) {
            this._elems[i].Draw();
        }
    }
}

class UserBall {
    constructor(x, y, g) {
        this._x = x;
        this._y = y;
        this._radius = 8;

        this._ground = g;

        this._falling = true;
        
        this._body = Bodies.circle(this._x, this._y, this._radius, 12);
        this._body.restitution = 0.5;
        this._body.slop = 0.02;
        World.add(engine.world, [this._body]);

        this._jumpcd = 0;
    }

    Bomb(x, y, r) {
        const hyp = Math.hypot(this._x - x, this._y - y);
        const str = Math.min(r - hyp / 1000000, 0.0001);

        if (hyp < r) {
            Matter.Body.applyForce(this._body, {x:this._x, y:this._x}, 
                {x: (this._x - x)*str, y: (this._y - y)*str});
        }
    }

    Tick(dT) {
        const grounded = this._ground.Collides(this._body);

        // The player moves faster when grounded.
        if (grounded) {
            if (keys.a) {
                Matter.Body.applyForce(this._body, {x:this._body.position.x, y:this._body.position.y - this._radius/3}, {x:-0.0001,y:0});
            } else if (keys.d) {
                Matter.Body.applyForce(this._body, {x:this._body.position.x, y:this._body.position.y - this._radius/3}, {x:0.0001,y:0});
            }

            if (this._jumpcd <= 0) {
                if (keys[" "]) {
                    Matter.Body.applyForce(this._body, this._body.position, {x:0, y:-0.001});
                    this._jumpcd = 20;
                }
            } else {
                this._jumpcd -= dT;
            }
        } else {
            if (keys.a) {
                Matter.Body.applyForce(this._body, {x:this._body.position.x, y:this._body.position.y}, {x:-0.00005,y:0});
            } else if (keys.d) {
                Matter.Body.applyForce(this._body, {x:this._body.position.x, y:this._body.position.y}, {x:0.00005,y:0});
            }
        }

        if (Math.abs(this._body.angularVelocity) > 1) {
            Matter.Body.setAngularVelocity(this._body, Math.sign(this._body.angularVelocity));
        }

        this._x = this._body.position.x;
        this._y = this._body.position.y;
    }

    Draw() {
        stage_graphics.lineStyle(1, 0xffff00, 1);
        stage_graphics.beginFill(0xff0000);
        stage_graphics.drawCircle(this._x, this._y, this._radius);
        stage_graphics.endFill();
    }
}

class Bomb {
    constructor(x, y, r, t) {
        this._x = x;
        this._y = y;
        this._radius = r;
        if (this._radius < 4) {
            this._color = 0xf5ce42;
        } else if (this._radius < 8) {
            this._color = 0xf58a42;
        } else {
            this._color = 0xf55d42;
        }

        this._lifetime = t;

        this._explosion_radius = this._radius * 5;

        this.active = true;
        
        this._body = Bodies.circle(this._x, this._y, this._radius, 6);
        this._body.restitution = 0.1;
        World.add(engine.world, [this._body]);
    }

    Tick(dT) {
        this._lifetime -= dT;
        
        if (this._lifetime <= 0) {
            this.Destroy();
        }

        this._x = this._body.position.x;
        this._y = this._body.position.y;
    }

    Destroy() {
        World.remove(engine.world, [this._body]);

        stage_fx.push(new BombExplosion(this._x, this._y, this._explosion_radius, this._color));

        ground.Bomb(this._x, this._y, this._explosion_radius);

        player.Bomb(this._x, this._y, this._explosion_radius);

        this.active = false;
    }

    Draw() {
        if (this.active === false) { return; }

        stage_graphics.lineStyle(1, 0x42e3f5, 1);
        stage_graphics.beginFill(this._color);
        stage_graphics.drawCircle(this._x, this._y, this._radius);
        stage_graphics.endFill();
    }
}

class BombExplosion {
    constructor(x, y, r, c) {
        this._x = x;
        this._y = y;
        this._radius = r;
        this._alpha = 1;
        this._color = c;

        this._active = true;
    }

    Tick(dT) {
        this._radius *= 0.95;
        this._alpha *= 0.95;

        if (this._radius < 1) {
            this.active = false;
        }
    }

    Draw() {
        stage_graphics.lineStyle(0);
        stage_graphics.beginFill(this._color, this._alpha);
        stage_graphics.drawCircle(this._x, this._y, this._radius);
        stage_graphics.endFill();
    }
}

class BombSpawner {
    constructor(x, y, w) {
        this._x = x;
        this._y = y;
        this._width = w;
        this._height = 20;

        this._left = this._x - this._width/2;
        this._right = this._x + this._width/2;
        this._top = this._y - this._height/2;
        this._bottom = this._y + this._height/2;

        this._bombs = [];

        this._spawn_chance_starting = 0.001;
        this._spawn_chance = this._spawn_chance_starting;

        this._bombs.push(new Bomb(this._x, this._y, 4, 200));
    }

    Tick(dT) {
        for (let i = 0; i < this._bombs.length; i++) {
            this._bombs[i].Tick(dT);
            if (this._bombs[i].active === false) {
                this._bombs.splice(i, 1);
                i--;
            }
        }

        if (Math.random() < this._spawn_chance) {
            this._spawn_chance = this._spawn_chance_starting;
            this._bombs.push(new Bomb(this._left + this._width * Math.random(), this._y, 2+Math.random()*8, 180 + 50*Math.random()));
        } else {
            this._spawn_chance *= 1.01;
        }
    }

    Draw() {
        stage_graphics.lineStyle(1, 0x000000, 0.8);
        stage_graphics.beginFill(0x555555, 0.4);
        stage_graphics.drawRect(this._left, this._top, this._width, this._height);
        stage_graphics.endFill();

        for (let i = 0; i < this._bombs.length; i++) {
            this._bombs[i].Draw();
        }
    }
}

// Classes ////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
