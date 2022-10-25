// entities.js: Entities.

class Entity
{
    constructor(a)
    {
        this.active = true;

        this.id = a.id;
        this.x = a.x;
        this.y = a.y;

        this.sprites = [];
        this.texts = [];
        this.textures = [];

        this.loaded = false;
    }

    AddSprite(a)
    {
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
        
        this.textures[fname] = PIXI.Texture.from(fname);

        let idx = this.sprites.push(new PIXI.Sprite(this.textures[fname])) - 1;
        this.sprites[idx].anchor.set(anc.x, anc.y);
        this.sprites[idx].position.set(x, y);
        this.sprites[idx].width = w;
        this.sprites[idx].height = h;
        this.sprites[idx].draw_layer = dl;
        G_draw_layers[dl].addChild(this.sprites[idx]);

        return this.sprites[idx];
    }

    AddText(a)
    {
        let id = a.id;
        let x = a.x;
        let y = a.y;
        let t = a.text;
        let ff = "monospace";
        let fs = 12;
        let fc = 0xffffff;
        let align = "center";
        let dl = LAYER_UI;

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

    Loaded()
    {
        let loaded = true;
        for (let k in this.textures) {
            if (k.loaded == false) {
                loaded = false;
                break;
            }
        }
        return loaded;
    }

    Destroy()
    {
        this.active = false;
        while (this.sprites.length > 0) {
            G_draw_layers[this.sprites[0].draw_layer].removeChild(this.sprites[0]);
            delete this.sprites[0];
            this.sprites.splice(0, 1);
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
class Lerper
{
    constructor(dur, cb, d=function(){})
    {
        this.id = "lerper";
        this.dur = dur;
        this.cb = cb;
        this.d = d;
        this.elapsed = 0;
        this.active = true;
        this.vals = {good:false}; // Can hold additional values per lerper.
    }

    Destroy() {}

    Update(dT)
    {
        if (this.active == false) { return; }
        
        this.elapsed += dT;

        // On the final tick, call the callback with an argument of 1 = 100%.
        if (this.elapsed > this.dur) {
            this.cb(1, true);
            this.active = false;
            return;
        }

        this.cb(this.elapsed / this.dur, false);
    }

    Draw()
    {
        this.d();
    }
}

// Lurker is similar to lerper, but it will run continuously until the callback
// returns a value of "false". At that point it no longer calls the callback.
// Lurkers can also be drawn for debug with the "d" function.
// Lerper is a "quasi-entity".
class Lurker
{
    constructor(cb, d=function(){})
    {
        this.id = "lerper";
        this.cb = cb;
        this.d = d;
        this.elapsed = 0;
        this.active = true;
        this.vals = {good:false}; // Can hold additional values per lurker.
    }

    Destroy() {}

    Update(dT)
    {
        if (!this.active) { return; }

        this.elapsed += dT;

        this.active = this.cb(dT);
    }

    Draw()
    {
        this.d();
    }
}

class StillString extends Entity
{
    constructor(a)
    {
        super({id:"String,"+a.text.toUpperCase(), x:a.x, y:a.y});

        this.text = a.text.toUpperCase();
        this.letters = [];

        for (let i = 0; i < this.text.length; i++)
        {
            if (this.text[i] == " ") { continue; }
            
            let name = NameForChar(this.text[i]);

            this.letters.push(this.AddSprite({id:"sl,?", x:a.x+a.fontSize*i, y:a.y, width:a.fontSize, height:a.fontSize, filename:"font/"+name+".png", draw_layer:LAYER_MAINSTAGE}));
        }
    }
}

class FloatyString extends Entity
{
    constructor(a)
    {
        super({id: "FloatyString,"+a.text.toUpperCase(), x:a.x, y:a.y});

        this.text = a.text.toUpperCase();
        this.letters = [];

        for (let i = 0; i < this.text.length; i++)
        {
            if (this.text[i] == " ") { continue; }

            this.letters.push(new FloatyLetter({letter:this.text[i], x:a.x+a.fontSize*i, y:a.y, amp:5, freq:a.freq, phase:a.phase+i/2, fontSize:a.fontSize}));
        }
    }

    Update(dT)
    {
        for (let i = 0; i < this.letters.length; i++)
        {
            this.letters[i].Update(dT);
        }
    }

    Destroy()
    {
        for (let i = 0; i < this.letters.length; i++)
        {
            this.letters[i].Destroy();
        }
    }
}

class FloatyLetter extends Entity
{
    constructor(a)
    {
        super({id:"fl,"+a.letter.toUpperCase(), x:a.x, y:a.y});

        this.letter = a.letter.toUpperCase();

        let name = NameForChar(this.letter);

        this.AddSprite({id:"fl,"+this.letter, x:a.x, y:a.y, width:a.fontSize, height:a.fontSize, filename:"font/"+name+".png", draw_layer:LAYER_MAINSTAGE});

        this.c_y = a.y;

        this.amp = 5;
        this.freq = 1/500;
        this.phase = 0;

        if (a.hasOwnProperty("amp")) { this.amp = a.amp; }
        if (a.hasOwnProperty("freq")) { this.freq = a.freq; }
        if (a.hasOwnProperty("phase")) { this.phase = a.phase; }
    }
    
    Update(dT)
    {
        super.Update(dT);

        for (let i = 0; i < this.sprites.length; i++)
        {
            this.sprites[i].y = this.c_y + this.amp * Sin(Millis()*this.freq + this.phase);
        }
    }
}
