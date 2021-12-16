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

class Creature extends Entity {
    constructor(id,x,y,f) {
        super({id:id,x:x,y:y});

        this.color = RandInt(0, 0xffffff);

        this.action = -1;
        this.facing = 0; // 0:N, 1:E, 2:S, 3:W.

        this.food = f;

        this.NN = new NN(3,3,[3,3]);
    }

    Percept() {
        // Inputs are as follows:
        //   0: Forward sight length (to rock, water, creature, edge).
        //   1: Forward sight block type.
        //   2: Forward left block type.
        //   3: Forward center block type.
        //   4: Forward right block type.
        //   5: Left block type.
        //   6: Right block type.
        //   7: Current food.

        // TODO: .
    }

    Eat() {
        LogTrace("Creature " + this.id + " has eaten.");

        // TODO: .
    }

    Reproduce() {
        LogTrace("Creature " + this.id + " has reproduced.");

        // TODO: .
    }

    TurnCW() {
        this.facing = (this.facing + 1) % 4;
    }
    TurnCCW() {
        this.facing = (this.facing - 1) % 4;
    }

    GetTargetPos() {
        let dis = this.GetForwardDisplacement();
        return {x:this.x+dis.x, y:this.y+dis.y};
    }

    GetForwardDisplacement() {
        if (this.facing == 0) {
            return {x:0,y:-1};
        } else if (this.facing == 1) {
            return {x:1,y:0};
        } else if (this.facing == 2) {
            return {x:0,y:1};
        } else if (this.facing == 3) {
            return {x:-1,y:0};
        } else {
            return {x:0,y:0};
        }
    }

    Process() {
        this.Percept();
        this.action = RandInt(0, NUM_ACTIONS);
    }
    
    Draw() {
        G_graphics[0].lineStyle(0);
        G_graphics[0].beginFill(this.color);
        G_graphics[0].drawRect(this.x, this.y, 1, 1);
        G_graphics[0].endFill();
    }
}
