// stages.js: Game stages. 

class Stage extends Entity{
    constructor() {
        super({"id":"stage", "x":0, "y":0});
        this.active = true;

        this.keys = InitKeys();
    }

    Reset() {}

    Key(k, d) {
        if (this.keys.hasOwnProperty(k) == false) {
            this.keys[k] = {down:false, time_down:0};
        }

        this.keys[k].down = d;
        this.keys[k].time_down = Date.now();
    }
}

class MainMenu extends Stage {
    constructor() {
        super();

        this.AddSprite({id:"ptr", x:190, y:100, filename:"pointer.png",
            width:32, height:32, anchor_x:1});

        this.AddText({id:"play", x:210, y:100, text:"Play", fontSize:64, align:"left"});
        this.AddText({id:"about", x:210, y:200, text:"About", fontSize:64, align:"left"});

        this.pointer = this.sprites["ptr"];

        this.pointer_moved = false;
    }

    Update(dT) {
        if (this.active == false) { return; }

        if (this.keys["q"].down) {
            // DEBUG KEY.

            global_actions.push("load TestGame");
            this.active = false;

        } else if (this.keys["w"].down) {

            if (this.pointer_moved == false) {
                this.pointer_moved = true;
                this.pointer.y -= 100;
            }

        } else if (this.keys["s"].down) {

            if (this.pointer_moved == false) {
                this.pointer_moved = true;
                this.pointer.y += 100;
            }

        } else {

            this.pointer_moved = false;

        }
    }
}

class TestGame extends Stage {
    constructor() {
        super();

        this.AddText({id:"txt_basic", x:100, y:100, text:"test text"});
    }

    Draw (g) {
        g.lineStyle(0,0);
        g.beginFill(0x00ff00);
        g.drawRect(100, 300, 200, 200);
        g.endFill();
    }
}
