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
        this._ge_rad = 10;
        
        // Add elements.
        for (let j = 0; j < 13; j++) {
            for (let i = 0; i < 10; i++) {
                this._elems.push(new GroundElement(2*i*this._ge_rad, 200 + 3/2*j*this._ge_rad,
                    this._ge_rad, false));
                this._elems.push(new GroundElement((2*i+1)*this._ge_rad, 200 + (3/2*j)*this._ge_rad + this._ge_rad/2,
                    this._ge_rad, true));
            }
        }

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
        this._walls.push(new GroundWall({
            type:"lrtb",
            left:-20,
            right:0 + 19*this._ge_rad+20,
            top:200 + this._ge_rad*19,
            bottom:200 + this._ge_rad*19 + 20,
        }));
    }

    Collides(b) {
        for (let i = 0; i < this._elems.length; i++) {
            if (Matter.SAT.collides(b, this._elems[i]._body).collided) { return true; }
        }
        for (let i = 0; i < this._walls.length; i++) {
            if (Matter.SAT.collides(b, this._walls[i]._body).collided) { return true; }
        }
    }

    Bomb(x, y) {
        for (let i = 0; i < this._elems.length; i++) {
            if (this._elems[i].DistTo(x, y) < 50) {
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

            if (keys[" "]) {
                Matter.Body.applyForce(this._body, this._body.position, {x:0, y:-0.001});
            }
        } else {
            if (keys.a) {
                Matter.Body.applyForce(this._body, {x:this._body.position.x, y:this._body.position.y}, {x:-0.00005,y:0});
            } else if (keys.d) {
                Matter.Body.applyForce(this._body, {x:this._body.position.x, y:this._body.position.y}, {x:0.00005,y:0});
            }
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

// Classes ////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////