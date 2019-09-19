//
// Sky Hoffert
// The Space Engineer
// Last modified September 18, 2019
//

///////////////////////////////////////////////////////////////////////////////////////////////////
// Constants
///////////////////////////////////////////////////////////////////////////////////////////////////

const START_LEVEL = 0;
const UPDATE_RATE = 1000/60;
const FRAME_RATE = 1000/60;
const COLORS = {"background": "#222222", "player": "#123456", "walls": "#505070", 
    "bolts": "#247890", "exit": "#324908"};
const PLAYER = {
    "width": 42, "height": 70, 
    "cardinal_velocity": 6.5, 
    "images": {
        "still": [],
        "falling": [],
        "running": []
    }
};
const BOLT = {"width": 54, "height": 54, "images": []};
const EXIT = {"width": 76, "height": 106, "image": new Image()}
const WALLS = {"width": 40, "image": new Image()}
const KEYCODES = {"w": 87, "a": 65, "s": 83, "d": 68, "space": 32, "r": 82};
const LOGCODES = {"playergroundstatechange": "PGSC", "playersidehitUL": "PHUL", 
    "playersidehitUR": "PHUR", "playersidehitLL": "PHLL", "playersidehitLR": "PHLR",
    "playerwalkedoffplatform": "PWOP", "collectedbolt": "PCAB", "playeroffscreen": "POFS",
    "playerentersdoor": "PEDO"};
const FRAME = {"width": 1600, "height": 752, "images": {
    "background": new Image(),
}};
const FONT = {"image": new Image(), "letter_size": 64};
const LEVELS = [
{
    "name": "Simple", 
    "walls": [ // Format: [ x, y, w, h ] where (x, y) is center
        [200, 376, 40, 590], [1400, 376, 40, 590], [800, 100, 1240, 40], [800, 652, 1240, 40],
        [1519, 376, 200, 800]
    ],
    "bolts": [ // Format: [ x, y ]
    ],
    "exit": [1300, 632 - EXIT["height"]/2, false],
    "player_spawn": [260, 600],
    "ship": {
        "x": 800,
        "y": 376,
        "width": 1200,
        "height": 552,
        "image": new Image()
    }
},
{
    "name": "Simple Jumper",
    "walls": [ // Format: [ x, y, w, h ] where (x, y) is center
        [200, 376, 40, 590], [1400, 376, 40, 590], [800, 100, 1240, 40], [800, 652, 1240, 40],
        [800, 578, 40, 120],
        [1519, 376, 200, 800]
    ],
    "bolts": [ // Format: [ x, y ]
    ],
    "exit": [1300, 632 - EXIT["height"]/2, false],
    "player_spawn": [260, 600],
    "ship": {
        "x": 800,
        "y": 376,
        "width": 1200,
        "height": 552,
        "image": new Image()
    }
},
{
    "name": "Gap", 
    "walls": [ // Format: [ x, y, w, h ] where (x, y) is center
        [200, 376, 40, 590], [1400, 376, 40, 590], [800, 100, 1240, 40], [800, 652, 1240, 40],
        [380, 602, 400, 80], [1200, 602, 440, 80],
        [1519, 376, 200, 800]
    ],
    "bolts": [ // Format: [ x, y ]
    ],
    "exit": [1300, 562 - EXIT["height"]/2, false],
    "player_spawn": [260, 500],
    "ship": {
        "x": 800,
        "y": 376,
        "width": 1200,
        "height": 552,
        "image": new Image()
    }
},
{
    "name": "Flipper", 
    "walls": [ // Format: [ x, y, w, h ] where (x, y) is center
        [200, 376, 40, 590], [1400, 376, 40, 590], [800, 100, 1240, 40], [800, 652, 1240, 40],
        [1519, 376, 200, 800]
    ],
    "bolts": [ // Format: [ x, y ]
    ],
    "exit": [1300, 122 + EXIT["height"]/2, true],
    "player_spawn": [260, 600],
    "ship": {
        "x": 800,
        "y": 376,
        "width": 1200,
        "height": 552,
        "image": new Image()
    }
},
{
    "name": "Danger", 
    "walls": [ // Format: [ x, y, w, h ] where (x, y) is center
        [200, 376, 40, 590], [1400, 376, 40, 590], [800, 100, 1240, 40], [800, 652, 1240, 40],
        [1200, 602, 440, 80],
        [1519, 376, 200, 800]
    ],
    "bolts": [ // Format: [ x, y ]
    ],
    "exit": [1300, 562 - EXIT["height"]/2, false],
    "player_spawn": [260, 600],
    "ship": {
        "x": 800,
        "y": 376,
        "width": 1200,
        "height": 552,
        "image": new Image()
    }
},
{
    "name": "Fin", 
    "walls": [ // Format: [ x, y, w, h ] where (x, y) is center
    ],
    "bolts": [ // Format: [ x, y ]
    ],
    "exit": [-100, -100, false],
    "player_spawn": [800, -300],
    "ship": {
        "x": 800,
        "y": 376,
        "width": 1200,
        "height": 552,
        "image": new Image()
    }
}
];

///////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////
// Functions
///////////////////////////////////////////////////////////////////////////////////////////////////

document.body.onkeydown = function (e) 
{
    keys[e.keyCode] = true;

    if (e.keyCode == KEYCODES["r"])
    {
        Init();
    }
}

document.body.onkeyup = function (e)
{
    keys[e.keyCode] = false;
}

function Init()
{
    canvas = document.getElementById("main_canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    scale.x = canvas.width / FRAME["width"];
    scale.y = canvas.height / FRAME["height"];

    ctx = canvas.getContext("2d");

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    LoadImages();

    game_ticks = 0;

    InitWalls();

    InitKeys();

    InitBolts();

    player = new Player(new V2(LEVELS[level_index]["player_spawn"][0],
        LEVELS[level_index]["player_spawn"][1]));
}

function LoadImages()
{
    WALLS["image"].src = "gfx/wall.png";

    FRAME["images"]["background"].src = "gfx/background.png";

    EXIT["image"].src = "gfx/exit.png";

    LEVELS[0]["ship"]["image"].src = "gfx/level_0_ship.png";

    FONT["image"].src = "gfx/font.png";

    let img = new Image();
    img.src = "gfx/player_still_1.png";
    PLAYER["images"]["still"].push(img);
    img = new Image();
    img.src = "gfx/player_still_2.png";
    PLAYER["images"]["still"].push(img);
    img = new Image();
    
    img = new Image();
    img.src = "gfx/player_falling_1.png";
    PLAYER["images"]["falling"].push(img);
    
    img = new Image();
    img.src = "gfx/player_running_1.png";
    PLAYER["images"]["running"].push(img);
    img = new Image();
    img.src = "gfx/player_running_2.png";
    PLAYER["images"]["running"].push(img);
    img = new Image();
    img.src = "gfx/player_running_3.png";
    PLAYER["images"]["running"].push(img);
    img = new Image();
    img.src = "gfx/player_running_4.png";
    PLAYER["images"]["running"].push(img);

    img = new Image();
    img.src = "gfx/bolt_1.png";
    BOLT["images"].push(img);
    img = new Image();
    img.src = "gfx/bolt_2.png";
    BOLT["images"].push(img);
}

function InitWalls()
{
    walls = [];

    for (let i = 0; i < LEVELS[level_index].walls.length; i++)
    {
        wall = LEVELS[level_index].walls[i];
        walls.push(new Box(new V2(wall[0], wall[1]), new V2(wall[2], wall[3])));
    }
}

function InitKeys()
{
    keys = [];

    // fill keys array with "false" value (all keys up)
    for (let i = 0; i < 200; i++)
    {
        keys.push(false);
    }
}

function InitBolts()
{
    bolts = [];

    for (let i = 0; i < LEVELS[level_index].bolts.length; i++)
    {
        bolt = LEVELS[level_index].bolts[i];
        bolts.push(new Bolt(new V2(bolt[0], bolt[1])));
    }
}

function DrawBackground()
{
    let offset = -game_ticks/10;
    ctx.drawImage(FRAME["images"]["background"], offset, 0, FRAME["width"], FRAME["height"]);
    ctx.save();
    ctx.scale(-1,1);
    ctx.drawImage(FRAME["images"]["background"], -(FRAME["width"] + offset), 0, 
        -FRAME["width"], FRAME["height"]);
    ctx.restore();

    let s = LEVELS[0]["ship"];
    ctx.drawImage(s["image"], (s["x"] - s["width"]/2) * scale.x, 
        (s["y"] - s["height"]/2) * scale.y, s["width"] * scale.x, s["height"] * scale.y);

    if (LEVELS[level_index]["exit"][2])
    {
        /* DEBUG *
        ctx.save();
        ctx.scale(1,-1);
        ctx.drawImage(EXIT["image"], (LEVELS[level_index]["exit"][0] - EXIT["width"]/2) * scale.x,
            -(LEVELS[level_index]["exit"][1] - EXIT["height"]/2) * scale.y, 
            EXIT["width"] * scale.x, -EXIT["height"] * scale.y);
        ctx.restore();
        /**/
        
        ctx.fillStyle = COLORS["exit"];
        ctx.fillRect((LEVELS[level_index]["exit"][0] - EXIT["width"]/2) * scale.x,
            (LEVELS[level_index]["exit"][1] - EXIT["height"]/2) * scale.y, 
            EXIT["width"] * scale.x, (EXIT["height"] - 20) * scale.y);

        DrawWord("Exit", new V2(LEVELS[level_index]["exit"][0] - EXIT["width"]/2 + 16,
            LEVELS[level_index]["exit"][1] + EXIT["height"]/3), new V2(12, 16));
    }
    else
    {
        /* DEBUG *
        ctx.drawImage(EXIT["image"], (LEVELS[level_index]["exit"][0] - EXIT["width"]/2) * scale.x,
            (LEVELS[level_index]["exit"][1] - EXIT["height"]/2) * scale.y, 
            EXIT["width"] * scale.x, EXIT["height"] * scale.y);
        /**/

        ctx.fillStyle = COLORS["exit"];
        ctx.fillRect((LEVELS[level_index]["exit"][0] - EXIT["width"]/2) * scale.x,
            (LEVELS[level_index]["exit"][1] - EXIT["height"]/2 + 20) * scale.y, 
            EXIT["width"] * scale.x, (EXIT["height"] - 20) * scale.y);

        DrawWord("Exit", new V2(LEVELS[level_index]["exit"][0] - EXIT["width"]/2 + 16,
            LEVELS[level_index]["exit"][1] - EXIT["height"]/2), new V2(12, 16));
    }
}

function DrawWalls()
{
    for (let i = 0; i < walls.length; i++)
    {
        let p = walls[i].position;
        let s = walls[i].size;

        /* DEBUG */
        ctx.fillStyle = COLORS["walls"];
        ctx.fillRect((p.x - s.x/2) * scale.x, (p.y - s.y/2) * scale.y,
            s.x * scale.x, s.y * scale.y);
        /**/
        
        /* DEBUG *
        ctx.drawImage(WALLS["image"], (p.x - s.x/2) * scale.x, (p.y - s.y/2) * scale.y,
            s.x * scale.x, s.y * scale.y);
        /**/

        /* DEBUG *
        let nh = Math.floor(s.x / WALLS["width"]);
        let nv = Math.floor(s.y / WALLS["width"]);

        for (let i = 0; i < nh; i++)
        {
            ctx.drawImage(WALLS["image"], (p.x - s.x/2 + (i*WALLS["width"])) * scale.x, 
                (p.y - s.y/2) * scale.y, WALLS["width"] * scale.x, WALLS["width"] * scale.y);

                for (let j = 0; j < nv; j++)
                {
                    ctx.drawImage(WALLS["image"], (p.x - s.x/2 + (i*WALLS["width"])) * scale.x,
                        (p.y - s.y/2 + (j*WALLS["width"])) * scale.y, 
                        WALLS["width"] * scale.x, WALLS["width"] * scale.y);
                }
        }
        /**/
    }
}

function DrawBolts()
{
    for (let i = 0; i < bolts.length; i++)
    {
        if (bolts[i])
        {
            let p = bolts[i].position;
            let s = bolts[i].size;

            /* DEBUG *
            ctx.fillStyle = COLORS["bolts"];
            ctx.fillRect((p.x - s.x/2) * scale.x, (p.y - s.y/2) * scale.y, 
                s.x * scale.x, s.y * scale.y);
            /**/

            ctx.drawImage(BOLT["images"][Math.floor(game_ticks/10)%2], 
                (p.x - s.x/2) * scale.x, (p.y - s.y/2) * scale.y, s.x * scale.x, s.y * scale.y);
        }
    }
}

/** Draw a word to the screen using custom font.
 * 
 * @param {string} w word to be used
 * @param {V2} loc location to be drawn (upper left)
 * @param {V2} fs font size
 */
function DrawWord(w, loc, fs = new V2(22, 32))
{
    let upper = w.toUpperCase();

    for (let i = 0; i < w.length; i++)
    {
        let n = upper.charCodeAt(i) - 32;
        
        let h = n % 8;
        let v = Math.floor(n / 8);
        let w = FONT["letter_size"];
        let dw = fs.x;
        let dh = fs.y

        ctx.drawImage(FONT["image"], h * w, v * w, w, w, 
            (loc.x + i * dw) * scale.x, (loc.y) * scale.y, dw, dh);
    }
}

/**
 * Draw a rounded rectangle at location.
 * 
 * @param {V2} loc location (center)
 * @param {V2} s size
 * @param {int} cr corner radius
 * @param {color} c color
 */
function DrawRoundedRect(loc, s, cr, c)
{
    ctx.fillStyle = c;
    ctx.fillRect((loc.x - s.x/2) * scale.x, (loc.y - s.y/2 + cr) * scale.y, 
        s.x * scale.x, (s.y - cr * 2) * scale.y);
    ctx.fillRect((loc.x - s.x/2 + cr) * scale.x, (loc.y - s.y/2) * scale.y, 
        (s.x - cr * 2) * scale.x, s.y * scale.y);
    
    ctx.beginPath();
    ctx.moveTo((loc.x - s.x/2) * scale.x, (loc.y - s.y/2 + cr) * scale.y);
    ctx.lineTo((loc.x - s.x/2 + cr) * scale.x, (loc.y - s.y/2) * scale.y);
    ctx.lineTo((loc.x + s.x/2 - cr) * scale.x, (loc.y - s.y/2) * scale.y);
    ctx.lineTo((loc.x + s.x/2) * scale.x, (loc.y - s.y/2 + cr) * scale.y);
    ctx.lineTo((loc.x + s.x/2) * scale.x, (loc.y + s.y/2 - cr) * scale.y);
    ctx.lineTo((loc.x + s.x/2 - cr) * scale.x, (loc.y + s.y/2) * scale.y);
    ctx.lineTo((loc.x - s.x/2 + cr) * scale.x, (loc.y + s.y/2) * scale.y);
    ctx.lineTo((loc.x - s.x/2) * scale.x, (loc.y + s.y/2 - cr) * scale.y);
    ctx.fill();
}

function GameUpdate()
{
    if (LEVELS[level_index]["name"] != "Fin")
    {
        player.collision();
        player.update();
    }

    game_ticks++;
}

function FrameUpdate()
{
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    scale.x = canvas.width / FRAME["width"];
    scale.y = canvas.height / FRAME["height"];

    /* DEBUG
    ctx.fillStyle = COLORS["background"];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    */

    DrawBackground();

    DrawWalls();

    if (level_index == 0)
    {
        DrawRoundedRect(new V2(800, 320), new V2(600, 260), 8, "#986232");
        DrawWord("use \"a\" and \"d\" keys to", new V2(520, 210));
        DrawWord("move left and right.", new V2(520, 256));
        DrawWord("Use \"w\" to enter the", new V2(520, 342));
        DrawWord("door.", new V2(520, 388));
    }
    else if (level_index == 1)
    {
        DrawRoundedRect(new V2(800, 320), new V2(600, 260), 8, "#986232");
        DrawWord("Oh no, a barrier! You can", new V2(520, 210));
        DrawWord("use the \"space bar\" to.", new V2(520, 256));
        DrawWord("jump! But remember, you", new V2(520, 302));
        DrawWord("are in zero-g - things", new V2(520, 346));
        DrawWord("are different up here.", new V2(520, 392));
    }
    else if (level_index == 2)
    {
        DrawRoundedRect(new V2(800, 320), new V2(600, 260), 8, "#986232");
        DrawWord("In Zero-G, you can float", new V2(520, 210));
        DrawWord("right across gaps!", new V2(520, 256));
    }
    else if (level_index == 3)
    {
        DrawRoundedRect(new V2(800, 320), new V2(600, 260), 8, "#986232");
        DrawWord("Sometimes the exit may be", new V2(520, 210));
        DrawWord("on the ceiling. Do what-", new V2(520, 256));
        DrawWord("ever you can to reach it.", new V2(520, 302));
    }
    else if (level_index == 4)
    {
        DrawRoundedRect(new V2(800, 320), new V2(600, 260), 8, "#986232");
        DrawWord("Caution! Walking off this", new V2(520, 210));
        DrawWord("platform may cause you to", new V2(520, 256));
        DrawWord("get stuck! Be careful.", new V2(520, 302));
    }
    else if (level_index == 5)
    {
        DrawRoundedRect(new V2(800, 352), new V2(1600, 800), 8, "#986232");
        DrawWord("To Be Continued...", new V2(450, 340), new V2(48, 64));
    }

    DrawBolts();
    
    player.draw();
}

// Utility Functions

function Distance(a, b)
{
    return Math.sqrt((a.x - b.x)**2 + (a.y - b.y)**2);
}

///////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////
// Classes
///////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 2 Dimensional Vector.
 */
class V2 { 
    /**
     * Creates a new 2D vector.
     * 
     * @param {number} x 
     * @param {number} y 
     */
    constructor(x, y)
    {
        this.x = x;
        this.y = y;
    }
}

class V3 { constructor(x, y, z){ this.x = x; this.y = y; this.z = z; } }

/**
 * Box.
 */
class Box
{
    /**
     * 
     * @param {V2} p: position (center)
     * @param {V2} s: size
     */
    constructor(p, s)
    {
        this.position = p;
        this.size = s;
    }
}

class Player
{
    /** 
     * Constructor for a new player.
     * 
     * @param {V2} s: spawn location of player (center)
     */
    constructor(s)
    {
        this.position = s;
        this.size = new V2(PLAYER["width"], PLAYER["height"]);
        this.velocity = new V2(0, PLAYER["cardinal_velocity"]);
        this.head_is_up = true; // head will either be up or down in this game
        this.facing_left = false; // facing either right or left
        this.color = COLORS["player"];
        this.grounded = false;
        this.againstwall = false;
    }

    collision()
    {
        let old_grounded = this.grounded;
        let ground_below = false;

        // collision with bolts
        for (let i = 0; i < bolts.length; i++)
        {
            if (bolts[i])
            {
                let p = bolts[i].position;
                let s = bolts[i].size;
                /* DEBUG
                if (this.position.x > p.x - s.x/2 && this.position.x < p.x + s.x/2 &&
                    this.position.y > p.y - s.y/2 && this.position.y < p.y + s.y/2)
                {
                    bolts[i] = null;
                    console.log(LOGCODES["collectedbolt"]);
                }
                */

                let d = Distance(this.position, bolts[i].position);
                if (d < bolts[i].size.x)
                {
                    bolts[i] = null;
                    console.log(LOGCODES["collectedbolt"]);
                }
            }
        }
        
        // collision with walls
        for (let i = 0; i < walls.length; i++)
        {
            let p = walls[i].position;
            let s = walls[i].size;
            let c = this.head_is_up ? new V2(this.position.x, this.position.y + this.size.y/2 + 1):
                new V2(this.position.x, this.position.y - this.size.y/2);
            let ul = new V2(this.position.x - this.size.x/2, this.position.y - this.size.y/3);
            let ur = new V2(this.position.x + this.size.x/2, this.position.y - this.size.y/3);
            let ll = new V2(this.position.x - this.size.x/2, this.position.y + this.size.y/3);
            let lr = new V2(this.position.x + this.size.x/2, this.position.y + this.size.y/3);
            
            let bl = p.x - s.x/2;
            let br = p.x + s.x/2;
            let bt = p.y - s.y/2;
            let bb = p.y + s.y/2;

            // Check feet
            if (c.x > bl && c.x < br && c.y > bt && c.y < bb)
            {
                this.grounded = true;
                this.position.y = this.head_is_up ? p.y - s.y/2 - this.size.y/2 : 
                    p.y + s.y/2 + this.size.y/2;
                this.velocity = new V2(0, 0);
            }
            if (this.head_is_up)
            {
                if (c.x > bl && c.x < br && c.y + 1 > bt && c.y < bb)
                {
                    ground_below = true;
                }
            }
            else
            {
                if (c.x > bl && c.x < br && c.y > bt && c.y - 1 < bb)
                {
                    ground_below = true;
                }
            }

            // Check sides
            if (ul.x > bl && ul.x < br && ul.y > bt && ul.y < bb)
            {
                console.log(LOGCODES["playersidehitUL"]);
                this.velocity.x = 0;
                this.againstwall = true;
                this.position.x = br + this.size.x/2;
            }
            else if (ll.x > bl && ll.x < br && ll.y > bt && ll.y < bb)
            {
                console.log(LOGCODES["playersidehitLL"]);
                this.velocity.x = 0;
                this.againstwall = true;
                this.position.x = br + this.size.x/2;
            }
            else if (ur.x > bl && ur.x < br && ur.y > bt && ur.y < bb)
            {
                console.log(LOGCODES["playersidehitUR"]);
                this.velocity.x = 0;
                this.againstwall = true;
                this.position.x = bl - this.size.x/2;
            }
            else if (lr.x > bl && lr.x < br && lr.y > bt && lr.y < bb)
            {
                console.log(LOGCODES["playersidehitLR"]);
                this.velocity.x = 0;
                this.againstwall = true;
                this.position.x = bl - this.size.x/2;
            }
            else
            {
                this.againstwall = false;
            }
        }

        if (old_grounded != this.grounded)
        {
            console.log(LOGCODES["playergroundstatechange"]);
        }
        else if (!ground_below && this.grounded)
        {
            console.log(LOGCODES["playerwalkedoffplatform"]);
            this.grounded = false;
        }
    }

    update()
    {
        let resetting = false;

        if (!this.grounded)
        {
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;
            
            if (keys[KEYCODES["a"]])
            {
                this.facing_left = true;
            }
            else if (keys[KEYCODES["d"]])
            {
                this.facing_left = false;
            }
        }
        else
        {
            if (keys[KEYCODES["space"]])
            {
                this.velocity.y = this.head_is_up ? -PLAYER["cardinal_velocity"] : 
                    PLAYER["cardinal_velocity"];
                this.head_is_up = !this.head_is_up;
                this.grounded = false;
            }
            
            if (keys[KEYCODES["s"]])
            {}
            else if (keys[KEYCODES["a"]])
            {
                this.velocity.x = -PLAYER["cardinal_velocity"];
                this.facing_left = true;
            }
            else if (keys[KEYCODES["d"]])
            {
                this.velocity.x = PLAYER["cardinal_velocity"];
                this.facing_left = false;
            }
            else if (keys[KEYCODES["w"]])
            {
                if (this.position.x < LEVELS[level_index]["exit"][0] + EXIT["width"]/2 &&
                    this.position.x > LEVELS[level_index]["exit"][0] - EXIT["width"]/2 &&
                    this.position.y < LEVELS[level_index]["exit"][1] + EXIT["height"]/2 &&
                    this.position.y > LEVELS[level_index]["exit"][1] - EXIT["height"]/2)
                {
                    level_index = (level_index + 1) % LEVELS.length;

                    resetting = true;

                    console.log(LOGCODES["playerentersdoor"]);
                }
            }
            else
            {
                this.velocity.x = 0;
            }

            this.position.x += this.velocity.x;
        }
        
        if (this.position.x < 0 || this.position.y < 0 || 
            this.position.x > FRAME["width"] || this.position.y > FRAME["height"])
        {
            resetting = true;

            console.log(LOGCODES["playeroffscreen"]);
        }

        if (resetting)
        {
            Init();
        }
    }

    draw()
    {
        /* DEBUG
        ctx.fillStyle = this.color;
        ctx.fillRect((this.position.x - this.size.x/2) * scale.x, 
            (this.position.y - this.size.y/2) * scale.y, 
            this.size.x * scale.x, this.size.y * scale.y);
        */

       let sh = this.facing_left ? -1 : 1;
       let sv = this.head_is_up ? 1 : -1;

        if (this.grounded)
        {
            if (this.velocity.x == 0)
            {
                ctx.save();
                ctx.scale(sh, sv);
                ctx.drawImage(PLAYER["images"]["still"][Math.floor(game_ticks/10)%2],
                    sh * (this.position.x - this.size.x/2) * scale.x, 
                    sv * (this.position.y - this.size.y/2) * scale.y, 
                    sh * this.size.x * scale.x, sv * this.size.y * scale.y);
                ctx.restore();
            }
            else
            {
                ctx.save();
                ctx.scale(sh, sv);
                ctx.drawImage(PLAYER["images"]["running"][Math.floor(game_ticks/6)%4],
                    sh * (this.position.x - this.size.x/2) * scale.x, 
                    sv * (this.position.y - this.size.y/2) * scale.y, 
                    sh * this.size.x * scale.x, sv * this.size.y * scale.y);
                ctx.restore();
            }
        }
        else
        {
            let sh = this.facing_left ? -1 : 1;
            let sv = this.head_is_up ? 1 : -1;
            
            ctx.save();
            ctx.scale(sh, sv);
            ctx.drawImage(PLAYER["images"]["falling"][0],
                sh * (this.position.x - this.size.x/2) * scale.x, 
                sv * (this.position.y - this.size.y/2) * scale.y, 
                sh * this.size.x * scale.x, sv * this.size.y * scale.y);
            ctx.restore();
        }

        /* DEBUG
        ctx.fillStyle = "#ffffff";
        let c = this.head_is_up ? new V2(this.position.x * scale.x, 
            (this.position.y + this.size.y/2) * scale.y) :
            new V2(this.position.x * scale.x, (this.position.y - this.size.y/2) * scale.y);
        ctx.fillRect(c.x, c.y, 1, 1);
        */
    }
}

/**
 * Bolts are a sort of collectable currency in this game.
 */
class Bolt
{
    constructor(p)
    {
        this.position = p;
        this.size = new V2(BOLT["width"], BOLT["height"]);
    }
}

///////////////////////////////////////////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////////////////////////////////////////////
// Entry Point
///////////////////////////////////////////////////////////////////////////////////////////////////

// Global Vars
var canvas;
var ctx;
var walls = [];
var player;
var keys = [];
var bolts = [];
var scale = new V2(1.0, 1.0);
var level_index = START_LEVEL;
var game_ticks;

Init();

setInterval(GameUpdate, UPDATE_RATE);
setInterval(FrameUpdate, FRAME_RATE);

///////////////////////////////////////////////////////////////////////////////////////////////////
