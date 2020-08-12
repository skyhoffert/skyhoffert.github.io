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

        this._poly = new PIXI.Polygon(
            this._x - this._radius,
            this._y + (this._flipped ? 1 : -1) * this._radius,
            this._x + this._radius,
            this._y + (this._flipped ? 1 : -1) * this._radius,
            this._x, this._y - (this._flipped ? 1 : -1) * this._radius,
        );
    }

    DistTo(x, y) {
        return Math.hypot(this._x - x, this._y - y);
    }

    Draw() {
        stage_graphics.lineStyle(1, 0x00ff00, 1);
        stage_graphics.beginFill(0x0000ff);
        stage_graphics.drawPolygon(this._poly);
        stage_graphics.endFill();
    }
}

class Ground {
    constructor() {
        this._elems = [];
        this._ge_rad = 20;
        
        for (let j = 0; j < 5; j++) {
            for (let i = 0; i < 5; i++) {
                this._elems.push(new GroundElement(2*i*this._ge_rad, 200 + 2*j*this._ge_rad,
                    this._ge_rad, false));
                this._elems.push(new GroundElement((2*i+1)*this._ge_rad, 200 + (2*j)*this._ge_rad,
                    this._ge_rad, true));
            }
        }
    }

    Bomb(x, y) {
        for (let i = 0; i < this._elems.length; i++) {
            if (this._elems[i].DistTo(x, y) < 100) {
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

// Classes ////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////