// stages.js: Game stages. 

class Stage extends Entity {
    constructor() {
        super({"id":"stage", "x":0, "y":0});
        this.active = true;

        content.visible = false;
    }

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
        
        content.visible = false;
    }

    Update(dT) {
        if (this.active == false) { return; }

        if (content.visible == false) {
            content.visible = this.Loaded();
            return;
        }

        if (G_keys.KeyQ.down) {
            // DEBUG KEY.

            G_actions.push("load debug,00,00");
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
                G_actions.push("load debug,00,00");
            } else if (item_number == 1) {
                // TODO: other buttons.
            }

        } else {

            this.pointer_moved = false;

        }
    }
}

class GameStage extends Stage {
    constructor(lvlname, toroom="00", fromroom="00") {
        super();

        this.level_name = lvlname;
        this.level = JSON.parse(JSON.stringify(LEVELS[lvlname]));
        this.current_room = toroom;
        this.previous_room = fromroom;
        this.floors = this.level.rooms[this.current_room].floors;
        this.walls = this.level.rooms[this.current_room].walls;
        this.backdrops = this.level.rooms[this.current_room].backdrops;
        this.exits = this.level.rooms[this.current_room].exits;

        this.AddSprite({id:"bg", x:WIDTH/2, y:HEIGHT/2, 
            width:GAME_WIDTH, height:GAME_HEIGHT,
            draw_layer:0, filename:"background.png"});

        this.player = new Player(
            this.level.rooms[this.current_room].player.spawn[this.previous_room].x,
            this.level.rooms[this.current_room].player.spawn[this.previous_room].y,
            this.level.rooms[this.current_room].player.velocity[this.previous_room].x,
            this.level.rooms[this.current_room].player.velocity[this.previous_room].y);
        
        this.buttons = [];
        for (let i = 0; i < this.level.rooms[this.current_room].buttons.length; i++) {
            let b = this.level.rooms[this.current_room].buttons[i];
            this.buttons.push(new ButtonAndDoor(b.bx, b.by, b.dx, b.dy, b.dw, b.dh));
        }
        
        this.detected_reset = false;
        this.detected_exit = false;
    }

    Destroy() {
        super.Destroy();
        this.player.Destroy();
    }

    Reset() {
        this.player.x = this.level.rooms[this.current_room].player.spawn[this.previous_room].x;
        this.player.y = this.level.rooms[this.current_room].player.spawn[this.previous_room].y;
        this.player.vx = this.level.rooms[this.current_room].player.velocity[this.previous_room].x;
        this.player.vy = this.level.rooms[this.current_room].player.velocity[this.previous_room].y;
        this.player.Reset();
    }

    Loaded() {
        return super.Loaded() && this.player.Loaded();
    }

    Update(dT) {
        if (this.active == false) { return; }

        if (this.detected_reset) {
            if (G_keys.KeyR.down == false) {
                this.detected_reset = false;
                this.Reset();
                LogDebug("Resetting.");
                return;
            }
        } else {
            if (G_keys.KeyR.down) {
                this.detected_reset = true;
                LogTrace("Game will reset.");
            } 
        }

        if (this.detected_exit) {
            if (G_keys.KeyW.down == false) {
                LogDebug("Player wants to exit.");
                this.detected_exit = false;

                for (let i = 0; i < this.exits.length; i++) {
                    let e = this.exits[i];
                    if (Contains(this.player.x, this.player.y, e.x, e.y, e.width, e.height)) {
                        G_actions.push("load debug,"+e.to+","+this.current_room);
                    }
                }
            }
        } else {
            if (G_keys.KeyW.down) {
                this.detected_exit = true;
                LogTrace("Player will try to exit.");
            }
        }

        if (content.visible == false) {
            content.visible = this.Loaded() && this.player.Loaded();
            return;
        }

        this.player.Update(dT);
    }

    PlayerRequestsExit() {

    }

    Draw() {
        // Draw backdrops.
        G_graphics[1].lineStyle(0, 0);
        for (let i=0; i < this.backdrops.length; i++) {
            let k = this.backdrops[i];
            G_graphics[1].beginFill(0x222222);
            G_graphics[1].drawRect(
                GAME_LEFT + (k.x - k.width/2) * GAME_SCALE,
                GAME_TOP + (k.y - k.height/2) * GAME_SCALE,
                k.width * GAME_SCALE, k.height * GAME_SCALE);
            G_graphics[1].endFill();
        }

        // Draw Floors.
        G_graphics[2].lineStyle(1, 0xff0000);
        for (let i=0; i < this.floors.length; i++) {
            let k = this.floors[i];
            G_graphics[2].beginFill(0x660000, 0.5);
            G_graphics[2].drawRect(
                GAME_LEFT + (k.x - k.width/2) * GAME_SCALE,
                GAME_TOP + (k.y - k.height/2) * GAME_SCALE,
                k.width * GAME_SCALE, k.height * GAME_SCALE);
            G_graphics[2].endFill();
        }

        // Draw Walls.
        G_graphics[2].lineStyle(1, 0x0000ff);
        for (let i=0; i < this.walls.length; i++) {
            let k = this.walls[i];
            G_graphics[2].beginFill(0x000066, 0.5);
            G_graphics[2].drawRect(
                GAME_LEFT + (k.x - k.width/2) * GAME_SCALE,
                GAME_TOP + (k.y - k.height/2) * GAME_SCALE,
                k.width * GAME_SCALE, k.height * GAME_SCALE);
            G_graphics[2].endFill();
        }

        // Draw Exits.
        G_graphics[3].lineStyle(1, 0x00ff00);
        for (let i=0; i < this.exits.length; i++) {
            let k = this.exits[i];
            G_graphics[3].beginFill(0x006600, 0.5);
            G_graphics[3].drawRect(
                GAME_LEFT + (k.x - k.width/2) * GAME_SCALE,
                GAME_TOP + (k.y - k.height/2) * GAME_SCALE,
                k.width * GAME_SCALE, k.height * GAME_SCALE);
            G_graphics[3].endFill();
        }

        for (let i=0; i < this.buttons.length; i++) {
            this.buttons[i].Draw();
        }
    }
}
