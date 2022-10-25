// stages.js: Game stages. 

class Stage extends Entity
{
    constructor()
    {
        super({"id":"stage", "x":0, "y":0});
        this.active = true;

        this.lerpers = [];
        this.lurkers = [];

        this.objs = [];
    }

    Update(dT)
    {
        super.Update(dT);

        for (let i = 0; i < this.lerpers.length; i++)
        {
            this.lerpers[i].Update(dT);
            if (this.lerpers[i].active == false)
            {
                this.lerpers[i].Destroy();
                delete this.lerpers[i];
                this.lerpers.splice(i,1);
                i--;
            }
        }

        for (let i = 0; i < this.lurkers.length; i++)
        {
            this.lurkers[i].Update(dT);
            if (this.lurkers[i].active == false)
            {
                this.lurkers[i].Destroy();
                delete this.lurkers[i];
                this.lurkers.splice(i,1);
                i--;
            }
        }

        for (let i = 0; i < this.objs.length; i++)
        {
            this.objs[i].Update(dT);
            if (this.objs[i].active == false)
            {
                this.objs[i].Destroy();
                delete this.objs[i];
                this.objs.splice(i, 1);
                i--;
            }
        }
    }
    
    Loaded()
    {
        if (this.loaded == true) { return true; }

        for (let k in this.textures)
        {
            if (k.loaded == false)
            {
                return false;
            }
        }

        for (let i = 0; i < this.objs.length; i++)
        {
            if (this.objs[i].Loaded() == false)
            {
                return false;
            }
        }

        this.loaded = true;
        return true;
    }

    Reset() {}
}

class MainMenu extends Stage
{
    constructor()
    {
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
            y: this.menu_line_y + this.menu_line_y_spacing, text:"xyz",
            fontSize: this.menu_fontSize, align:"left"});

        // Menu pointer.
        this.AddText({id:"ptr", x: this.menu_line_x - this.menu_line_x_spacing,
            y: this.menu_line_y, text:">", fontSize: this.menu_fontSize,
            align:"right"});

        this.pointer = this.texts["ptr"];

        this.pointer_moved = false;
    }

    Update(dT)
    {
        super.Update(dT);

        if (this.active == false) { return; }

        if (G_keys.KeyQ.down)
        {
            // DEBUG KEY.
            G_actions.push("load debug,00,00");
            this.active = false;
        }
        else if (G_keys.KeyW.down || G_keys.ArrowUp.down)
        {
            if (this.pointer_moved == false && this.pointer.y > this.menu_line_y+1)
            {
                this.pointer_moved = true;
                this.pointer.y -= this.menu_line_y_spacing;
            }
        }
        else if (G_keys.KeyS.down || G_keys.ArrowDown.down)
        {
            if (this.pointer_moved == false && this.pointer.y < this.menu_line_y + (this.menu_line_y_spacing*(this.menu_num_items-1)))
            {
                this.pointer_moved = true;
                this.pointer.y += this.menu_line_y_spacing;
            }
        }
        else if (G_keys.Enter.down)
        {
            let item_number = Round((this.pointer.y - this.menu_line_y) / this.menu_line_y_spacing);
            if (item_number == 0)
            {
                this.active = false;
                G_actions.push("load debug,00,00");
            }
            else if (item_number == 1)
            {
                // TODO: other buttons.
            }
        }
        else
        {
            this.pointer_moved = false;
        }
    }
}

class DebugLevel extends Stage
{
    constructor()
    {
        super();

        this.objs.push(new FloatyString({text:"debug stage", x:100, y:100, fontSize:64, amp:1, freq:1/2000, phase:0}));

        this.lerpers.push(new Lerper(1000, function (p, d)
        {
            if (d) 
            {
                G_stage.lerpers.push(new Lerper(250, function (p,d)
                {
                    G_cover_alpha = 1 - p;
                    G_needs_update = true;
                }));
            }
        }));

        this.objs.push(new FloatyString({text:"This is a test.", x:100, y:200, fontSize:24, amp:5, freq:1/500, phase:2}));
        this.objs.push(new FloatyString({text:"ABCDEFGHIJKLMNOPQRSTUVWXYZ", x:100, y:250, fontSize:24, amp:5, freq:1/550, phase:0}));
        this.objs.push(new FloatyString({text:"abcdefghijklmnopqrstuvwxyz", x:100, y:300, fontSize:24, amp:5, freq:1/600, phase:0}));
        this.objs.push(new FloatyString({text:"1234567890", x:100, y:350, fontSize:24, amp:5, freq:1/650, phase:0}));
        this.objs.push(new FloatyString({text:"!@#$%^&*()", x:100, y:400, fontSize:24, amp:5, freq:1/700, phase:0}));
        this.objs.push(new FloatyString({text:"-_=+[{]}\\|;:'\",<.>/?", x:100, y:450, fontSize:24, amp:5, freq:1/750, phase:0}));

        this.objs.push(new StillString({text:"wow cool", x:WIDTH/2, y:HEIGHT*7/8, fontSize:16}));
    }

    Update(dT)
    {
        super.Update(dT);

        if (this.active == false) { return; }
    }
}
