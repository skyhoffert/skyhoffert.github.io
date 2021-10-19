// entities.js: Entities.

class Entity {
    constructor(a) {
        this.active = true;

        this.id = a.id;
        this.x = a.x;
        this.y = a.y;

        this.sprites = {};
        this.texts = {};
        this.textures = {};
    }

    AddSprite(a) {
        let id = a.id;
        let x = a.x;
        let y = a.y;
        let w = a.width;
        let h = a.height;
        let fname = "gfx/"+a.filename;
        let anc = {x:0.5, y:0.5};
        let dl = 2;

        if (a.hasOwnProperty("anchor_x")) { anc.x = a.anchor_x; }
        if (a.hasOwnProperty("anchor_y")) { anc.y = a.anchor_y; }
        if (a.hasOwnProperty("draw_layer")) { dl = a.draw_layer; }
        
        this.textures[id] = PIXI.Texture.from(fname);

        this.sprites[id] = new PIXI.Sprite(this.textures[id]);
        this.sprites[id].anchor.set(anc.x, anc.y);
        this.sprites[id].position.set(x, y);
        this.sprites[id].width = w;
        this.sprites[id].height = h;
        this.sprites[id].draw_layer = dl;
        G_draw_layers[dl].addChild(this.sprites[id]);
    }

    AddText(a) {
        let id = a.id;
        let x = a.x;
        let y = a.y;
        let t = a.text;
        let ff = "Courier New";
        let fs = 12;
        let fc = 0xffffff;
        let align = "center";
        let dl = 4;

        if (a.hasOwnProperty("fontFamily")) { ff = a.fontFamily; }
        if (a.hasOwnProperty("fontSize")) { fs = a.fontSize;}
        if (a.hasOwnProperty("fill")) { fc = a.fill; }
        if (a.hasOwnProperty("align")) { align = a.align; }
        if (a.hasOwnProperty("draw_layer")) { dl = a.draw_layer; }

        let anc = {x:0.5, y:0.5};
        if (align == "left") { anc.x = 0; }
        else if (align == "right") { anc.x = 1; }

        this.texts[id] = new PIXI.Text(t, {
            fontFamily: ff, fontSize: fs, fill: fc, align: align,
        });
        this.texts[id].anchor.set(anc.x, anc.y);
        this.texts[id].position.set(x, y);
        this.texts[id].draw_layer = dl;
        G_draw_layers[dl].addChild(this.texts[id]);
    }

    Loaded() {
        let loaded = true;
        for (let k in this.textures) {
            if (k.loaded == false) {
                loaded = false;
                break;
            }
        }
        return loaded;
    }

    Destroy() {
        this.active = false;
        for (let k in this.sprites) {
            G_draw_layers[this.sprites[k].draw_layer].removeChild(this.sprites[k]);
            delete this.sprites[k];
        }
        for (let k in this.texts) {
            G_draw_layers[this.texts[k].draw_layer].removeChild(this.texts[k]);
            delete this.texts[k];
        }
        for (let k in this.textures) {
            this.textures[k].destroy();
            delete this.textures[k];
        }
    }

    Update(dT) {}
    Draw() {}
}

// Lerper is a cool class. It will call a callback and provide a value between
// 0 and 1 until the entire Lerp duration has completed. The callback can also
// optionally have a second parameter that is given as "true" on final call.
// Lerpers can also be drawn for debug purposes with the "d" function.
// Lerper is a "quasi-entity".
class Lerper {
    constructor(dur, cb, d=function(){}) {
        this.dur = dur;
        this.cb = cb;
        this.d = d;
        this.elapsed = 0;
        this.active = true;
        this.vals = {good:false}; // Can hold additional values per lerper.
    }

    Destroy() {}

    Update(dT) {
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

    Draw() {
        this.d();
    }
}

// Lurker is similar to lerper, but it will run continuously until the callback
// returns a value of "false". At that point it no longer calls the callback.
// Lurkers can also be drawn for debug with the "d" function.
// Lerper is a "quasi-entity".
class Lurker {
    constructor(cb, d=function(){}) {
        this.cb = cb;
        this.d = d;
        this.elapsed = 0;
        this.active = true;
        this.vals = {good:false}; // Can hold additional values per lurker.
    }

    Destroy() {}

    Update(dT) {
        if (!this.active) { return; }

        this.elapsed += dT;

        this.active = this.cb(dT);
    }

    Draw() {
        this.d();
    }
}

class Player extends Entity {
    constructor(x, y, vx, vy) {
        super({id:"player", x:x, y:y});
        
        // NOTE: x, y, width, and height are in absolute units (x:[0,1000], y:[0,600]).
        // Player will be scaled for rendering with PIXI.

        this.width = 64;
        this.height = 64;

        this.vx = vx;
        this.vy = vy;

        this.speed_x = 4;
        this.speed_y = 4;

        this.grounded = false;

        this.AddSprite({id:"player", x: this.x, y: this.y, width: this.width*GAME_SCALE, 
            height: this.height*GAME_SCALE, filename: "still_1.png"});
    }

    SyncWithSprite() {
        this.sprites.player.x = GameToPIXIX(this.x);
        this.sprites.player.y = GameToPIXIY(this.y);
    }

    Update(dT) {
        if (this.active == false) { return; }

        this.x += this.vx * dT;
        this.y += this.vy * dT;

        let floors = G_objs["stage"].floors;
        let coll_idx = -1;
        for (let i = 0; i < floors.length; i++) {
            let f = floors[i];
            if (Contains(this.x, this.y + this.height/2 + 1, f.x, f.y, f.width, f.height)) {
                coll_idx = i;
                break;
            }
        }

        if (coll_idx != -1) {
            this.vx = 0;
            this.vy = 0;
            this.grounded = true;
        }

        if (this.grounded) {
            if (G_keys.KeyD.down) {
                this.vx = this.speed_x;
            } else if (G_keys.KeyA.down) {
                this.vx = -this.speed_x;
            } else {
                this.vx = 0;
            }
        }

        this.SyncWithSprite();
    }
}
