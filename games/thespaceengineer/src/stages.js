// stages.js: Game stages. 

class Stage extends Entity {
    constructor() {
        super({"id":"stage", "x":0, "y":0});
        this.active = true;

        this.keys = KEYS_INIT;

        content.visible = false;
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

        this.menu_line_x = 200;
        this.menu_line_x_spacing = 10;
        this.menu_line_y = 100;
        this.menu_line_y_spacing = 100;
        this.menu_fontSize = 64;
        this.menu_num_items = 2;

        // Play menu item.
        this.AddText({id:"play", x: this.menu_line_x + this.menu_line_x_spacing,
            y: this.menu_line_y, text:"Play", fontSize: this.menu_fontSize,
            align:"left"});

        // About menu item.
        this.AddText({id:"about", x: this.menu_line_x + this.menu_line_x_spacing,
            y: this.menu_line_y + this.menu_line_y_spacing, text:"About",
            fontSize: this.menu_fontSize, align:"left"});

        // Menu pointer.
        this.AddText({id:"ptr", x: this.menu_line_x - this.menu_line_x_spacing,
            y: this.menu_line_y, text:">", fontSize: this.menu_fontSize,
            align:"right"});

        this.pointer = this.texts["ptr"];

        this.pointer_moved = false;
        
        content.visible = false;
    }

    Update(dT) {
        if (this.active == false) { return; }

        if (content.visible == false) {
            content.visible = this.Loaded();
            return;
        }

        if (this.keys.KeyQ.down) {
            // DEBUG KEY.

            global_actions.push("load TestGame");
            this.active = false;

        } else if (this.keys.KeyW.down || this.keys.ArrowUp.down) {

            if (this.pointer_moved == false &&
                    this.pointer.y > this.menu_line_y+1) {
                this.pointer_moved = true;
                this.pointer.y -= this.menu_line_y_spacing;
            }

        } else if (this.keys.KeyS.down || this.keys.ArrowDown.down) {

            if (this.pointer_moved == false &&
                    this.pointer.y < this.menu_line_y + 
                    (this.menu_line_y_spacing*(this.menu_num_items-1))) {
                this.pointer_moved = true;
                this.pointer.y += this.menu_line_y_spacing;
            }
        
        } else if (this.keys.Enter.down) {

            let item_number = Round((this.pointer.y - this.menu_line_y) / this.menu_line_y_spacing);
            if (item_number == 0) {
                this.active = false;
                global_actions.push("load TestGame");
            } else if (item_number == 1) {
                // TODO: other buttons.
            }

        } else {

            this.pointer_moved = false;

        }
    }
}

class GameStage extends Stage {
    constructor(lvlname) {
        super();

        this.level_name = lvlname;
        this.level = JSON.parse(JSON.stringify(LEVELS[lvlname]));
        this.current_room = this.level.spawn_room;
        this.floors = this.level.rooms[this.current_room].floors;
        this.walls = this.level.rooms[this.current_room].walls;
        this.backdrops = this.level.rooms[this.current_room].backdrops;

        let scale_x = WIDTH/1000;
        let scale_y = HEIGHT/600;
        this.scale = scale_y;
        if (scale_x < scale_y) { this.scale = scale_x; }

        this.AddSprite({id:"bg", x:WIDTH/2, y:HEIGHT/2, 
            width:1000*this.scale, height:600*this.scale,
            draw_layer:0, filename:"background.png"});

        this.player = new Player(WIDTH/2, HEIGHT/2);
    }

    Update(dT) {
        if (this.active == false) { return; }

        if (content.visible == false) {
            content.visible = this.Loaded();
            return;
        }

        this.player.Update(dT);
    }

    Draw() {
        let left = WIDTH/2 - 500*this.scale;

        // Draw backdrops.
        graphics[1].lineStyle(0, 0);
        for (let i=0; i < this.backdrops.length; i++) {
            let k = this.backdrops[i];
            graphics[1].beginFill(0x222222);
            graphics[1].drawRect(left + (k.x - k.width/2) * this.scale,
                (k.y - k.height/2) * this.scale, k.width * this.scale,
                k.height * this.scale);
                graphics[1].endFill();
        }

        // Draw Floors.
        graphics[2].lineStyle(1, 0xff0000);
        for (let i=0; i < this.floors.length; i++) {
            let k = this.floors[i];
            graphics[2].beginFill(0x660000);
            graphics[2].drawRect(left + (k.x - k.width/2) * this.scale,
                (k.y - k.height/2) * this.scale, k.width * this.scale,
                k.height * this.scale);
                graphics[2].endFill();
        }

        // Draw Walls.
        graphics[2].lineStyle(1, 0x0000ff);
        for (let i=0; i < this.walls.length; i++) {
            let k = this.walls[i];
            graphics[2].beginFill(0x000066);
            graphics[2].drawRect(left + (k.x - k.width/2) * this.scale,
                (k.y - k.height/2) * this.scale, k.width * this.scale,
                k.height * this.scale);
            graphics[2].endFill();
        }
    }
}

class TestGame extends GameStage {
    constructor() {
        super("debug");

        this.AddText({id:"txt_basic", x:WIDTH/2, y:50*this.scale, text:"test text"});
    }
}
