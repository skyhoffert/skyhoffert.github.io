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
            // Action: Tell creatures to make an action.

            let actions = [];
            let keys = [];

            // Go through all creatures, and run Process(). Delete if on rock/water.
            // TODO: remove water deletion.
            for (let c in this.creatures) {
                let creat = this.creatures[c];

                // Use food for the day.
                creat.food -= this.level.creature_food_usage;

                let bt = this.blocks[creat.y][creat.x];
                if (bt == BLOCK_TYPES.WATER || bt == BLOCK_TYPES.ROCK) {
                    actions.push("delete "+c);
                    continue;
                } if (creat.food <= 0) {
                    actions.push("delete "+c);
                    continue;
                }

                this.creatures[c].Process();
                keys.push(c);
            }
            
            // Process any creatures that need maintenance based on current state.
            while (actions.length > 0) {
                let act = actions[0];
                let tok = act.split(" ");
                if (tok[0] == "delete") {
                    LogTrace("Removed creature " + tok[1] + ".");
                    delete this.creatures[tok[1]];
                } else {
                    LogWarn("Unknown action " + act + ".");
                }
                actions.splice(0,1);
            }

            // Randomize how creatures are processed.
            ShuffleArray(keys);

            // Handle each creature's action in random order.
            // Add intended actions to actions queue.
            for (let i = 0; i < keys.length; i++) {
                let c = this.creatures[keys[i]];

                // LogTrace("Handling action of creature " + c.id + ".");

                // Handle Actions.
                if (c.action == ACTIONS.TURN_CW) {
                    LogTrace("Creature " + c.id + " turning CW.");
                    c.TurnCW();
                } else if (c.action == ACTIONS.TURN_CCW) {
                    LogTrace("Creature " + c.id + " turning CCW.");
                    c.TurnCCW();
                } else if (c.action == ACTIONS.FORWARD) {

                    LogTrace("Creature " + c.id + " moving forward.");

                    let targ = c.GetTargetPos();
                    if (targ.x < 0 || targ.x >= this.width || targ.y < 0 || targ.y >= this.height) {
                        continue;
                    }

                    // Check if there is already a creature there.
                    let bump = false;
                    for (let creatidx in this.creatures) {
                        let creat = this.creatures[creatidx];
                        if (creat.id != c.id) {
                            if (creat.x == targ.x && creat.y == targ.y) {
                                bump = true;
                                break;
                            }
                        }
                    }
                    if (bump) { continue; }

                    let btf = this.blocks[targ.y][targ.x];
                    if (btf == BLOCK_TYPES.DIRT || btf == BLOCK_TYPES.GRASS) {
                        c.x = targ.x;
                        c.y = targ.y;
                    }

                } else if (c.action == ACTIONS.BACKWARD) {

                    LogTrace("Creature " + c.id + " moving backward.");

                    let dis = c.GetForwardDisplacement();
                    let targ = {x: c.x - dis.x, y: c.y - dis.y};
                    if (targ.x < 0 || targ.x >= this.width || targ.y < 0 || targ.y >= this.height) {
                        continue;
                    }

                    // Check if there is already a creature there.
                    let bump = false;
                    for (let creatidx in this.creatures) {
                        let creat = this.creatures[creatidx];
                        if (creat.id != c.id) {
                            if (creat.x == targ.x && creat.y == targ.y) {
                                bump = true;
                                break;
                            }
                        }
                    }
                    if (bump) { continue; }

                    let btf = this.blocks[targ.y][targ.x];
                    if (btf == BLOCK_TYPES.DIRT || btf == BLOCK_TYPES.GRASS) {
                        c.x = targ.x;
                        c.y = targ.y;
                    }

                } else if (c.action == ACTIONS.LEFT) {

                    LogTrace("Creature " + c.id + " moving left.");

                    let dis = c.GetForwardDisplacement();
                    let targ = {x: c.x + dis.y, y: c.y - dis.x};
                    if (targ.x < 0 || targ.x >= this.width || targ.y < 0 || targ.y >= this.height) {
                        continue;
                    }

                    // Check if there is already a creature there.
                    let bump = false;
                    for (let creatidx in this.creatures) {
                        let creat = this.creatures[creatidx];
                        if (creat.id != c.id) {
                            if (creat.x == targ.x && creat.y == targ.y) {
                                bump = true;
                                break;
                            }
                        }
                    }
                    if (bump) { continue; }

                    let btf = this.blocks[targ.y][targ.x];
                    if (btf == BLOCK_TYPES.DIRT || btf == BLOCK_TYPES.GRASS) {
                        c.x = targ.x;
                        c.y = targ.y;
                    }
                
                } else if (c.action == ACTIONS.RIGHT) {

                    LogTrace("Creature " + c.id + " moving right.");

                    let dis = c.GetForwardDisplacement();
                    let targ = {x: c.x - dis.y, y: c.y + dis.x};
                    if (targ.x < 0 || targ.x >= this.width || targ.y < 0 || targ.y >= this.height) {
                        continue;
                    }

                    // Check if there is already a creature there.
                    let bump = false;
                    for (let creatidx in this.creatures) {
                        let creat = this.creatures[creatidx];
                        if (creat.id != c.id) {
                            if (creat.x == targ.x && creat.y == targ.y) {
                                bump = true;
                                break;
                            }
                        }
                    }
                    if (bump) { continue; }

                    let btf = this.blocks[targ.y][targ.x];
                    if (btf == BLOCK_TYPES.DIRT || btf == BLOCK_TYPES.GRASS) {
                        c.x = targ.x;
                        c.y = targ.y;
                    }

                } else if (c.action == ACTIONS.EAT) {

                    LogTrace("Creature " + c.id + " wants to eat.");

                    let targ = c.GetTargetPos();
                    if (this.blocks[targ.y][targ.x] == BLOCK_TYPES.GRASS) {
                        this.blocks[targ.y][targ.x] = BLOCK_TYPES.DIRT;
                        c.Eat();
                        c.food += this.level.food_per_eat;
                    }

                } else if (c.action == ACTIONS.REPRODUCE) {

                    LogTrace("Creature " + c.id + " wants to reproduce.");

                    if (c.food > this.level.creature_reproduce_food) {
                        c.Reproduce();
                        c.food -= this.level.creature_reproduce_food;

                        let targ = c.GetTargetPos();

                        let id = RandID();
                        this.creatures[id] = new Creature(id, targ.x, targ.y,
                            this.level.creature_starting_food);
                    }

                } else {
                    LogWarn("Unknown creature action " + c.action + ".");
                }
            }

            // Allow grass to grow.
            for (let r = 0; r < this.height; r++) {
                for (let c = 0; c < this.width; c++) {
                    if (this.blocks[r][c] == BLOCK_TYPES.DIRT) {
                        if ((r < this.height-1 && this.blocks[r+1][c] == BLOCK_TYPES.GRASS) ||
                            (r > 0 && this.blocks[r-1][c] == BLOCK_TYPES.GRASS) ||
                            (c < this.width-1 && this.blocks[r][c+1] == BLOCK_TYPES.GRASS) ||
                            (c > 0 && this.blocks[r][c-1] == BLOCK_TYPES.GRASS)) {
                                // 50% chance of growing grass if adjacent to some grass.
                                if (Math.random() < this.level.grass_growth_chance) {
                                    this.blocks[r][c] = BLOCK_TYPES.GRASS;
                                }
                        }
                    }
                }
            }

            G_needs_update = true;

        } else if (k == "KeyC") {
            let id = RandID();
            this.creatures[id] = new Creature(id, RandInt(0, this.width), RandInt(0, this.height),
                this.level.creature_starting_food);
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
