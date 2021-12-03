// stages.js: Game stages. 

class Stage extends Entity {
    constructor() {
        super({"id":"stage", "x":0, "y":0});
        this.active = true;
    }

    KeyDown(k){}
    KeyUp(k){}

    Reset() {}
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
    }

    Update(dT) {
        if (this.active == false) { return; }

        if (G_keys.KeyQ.down) {
            // DEBUG KEY.

            G_actions.push("load debug");
            this.active = false;

        } else if (G_keys.KeyW.down || G_keys.ArrowUp.down) {

            if (this.pointer_moved == false &&
                    this.pointer.y > this.menu_line_y+1) {
                this.pointer_moved = true;
                this.pointer.y -= this.menu_line_y_spacing;
            }

        } else if (G_keys.KeyS.down || G_keys.ArrowDown.down) {

            if (this.pointer_moved == false &&
                    this.pointer.y < this.menu_line_y + 
                    (this.menu_line_y_spacing*(this.menu_num_items-1))) {
                this.pointer_moved = true;
                this.pointer.y += this.menu_line_y_spacing;
            }
        
        } else if (G_keys.Enter.down) {

            let item_number = Round((this.pointer.y - this.menu_line_y) / this.menu_line_y_spacing);
            if (item_number == 0) {
                this.active = false;
                G_actions.push("load debug");
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

        this.width = this.level.width;
        this.height = this.level.height;

        this.blocks = [];
        for (let r = 0; r < this.height; r++) {
            this.blocks.push([]);
            for (let c = 0; c < this.width; c++) {
                let pixnum = r*300+c;
                this.blocks[r][c] = BlockCharToBlockType(this.level.blockarray[pixnum]);
            }
        }

        // this.AddSprite({id:"bg", x:WIDTH/2, y:HEIGHT/2, 
        //     width:GAME_WIDTH, height:GAME_HEIGHT,
        //     draw_layer:0, filename:"background.png"});

        this.creatures = {};
    }

    KeyDown(k) {
        if (k == "KeyN") {
            // Every creature takes a single step.
            let keys = [];
            for (let c in this.creatures) {
                let bt = this.blocks[c.y][c.x];
                if (bt == BLOCK_TYPES.WATER || bt == BLOCK_TYPES.ROCK) {
                    delete this.creatures[c];
                    continue;
                }
                this.creatures[c].Process();
                keys.push(c);
            }
            ShuffleArray(keys);
            for (let i = 0; i < keys.length; i++) {
                let c = this.creatures[keys[i]];

                // Handle Actions.
                if (c.action == ACTIONS.TURN_CW) {
                    c.TurnCW();
                } else if (c.action == ACTIONS.TURN_CCW) {
                    c.TurnCCW();
                } else if (c.action == ACTIONS.FORWARD) {
                    let dis = c.GetForwardDisplacement();
                    let btf = this.blocks[c.x+dis[0]][c.y+dis[1]];
                    if (btf == BLOCK_TYPES.DIRT || btf == BLOCK_TYPES.GRASS) {
                        c.x += dis[0];
                        c.y += dis[1];
                    }
                } else if (c.action == ACTIONS.BACKWARD) {
                }
            }
            G_needs_update = true;
        } else if (k == "KeyC") {
            this.creatures[RandID()] = new Creature(RandInt(0, this.width), RandInt(0, this.height));
            G_needs_update = true;
        }
    }

    Reset() {}

    Update(dT) {
        if (this.active == false) { return; }
    }

    Draw() {
        // DEBUG: background.
        G_graphics[0].lineStyle(0);
        G_graphics[0].beginFill(0x006600);
        G_graphics[0].drawRect(0, 0, this.width, this.height);
        G_graphics[0].endFill();

        G_graphics[0].lineStyle(0);
        for (let r = 0; r < this.height; r++) {
            for (let c = 0; c < this.width; c++) {
                G_graphics[0].beginFill(BLOCK_COLORS[this.blocks[r][c]]);
                G_graphics[0].drawRect(c, r, 1, 1);
                G_graphics[0].endFill();
            }
        }

        for (let c in this.creatures) {
            this.creatures[c].Draw();
        }

        // Draw Exits.
        // G_graphics[3].lineStyle(1, 0x00ff00);
        // for (let i=0; i < this.exits.length; i++) {
        //     let k = this.exits[i];
        //     G_graphics[3].beginFill(0x006600, 0.5);
        //     G_graphics[3].drawRect(
        //         GAME_LEFT + (k.x - k.width/2) * GAME_SCALE,
        //         GAME_TOP + (k.y - k.height/2) * GAME_SCALE,
        //         k.width * GAME_SCALE, k.height * GAME_SCALE);
        //     G_graphics[3].endFill();
        // }
    }
}
