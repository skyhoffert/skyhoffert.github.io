// pfmr backend
// March 30, 2019

const WebSocket = require("ws");

const PORT = 5202;

const SEED_INIT = 1;

// game update rate (denominator is how many per second)
const UPDATE_RATE = 1000/60;

// Keyboard input codes for easy reference.
const CODE_A = 65;
const CODE_D = 68;
const CODE_F = 70;
const CODE_J = 74;
const CODE_K = 75;
const CODE_L = 76;
const CODE_M = 77;
const CODE_S = 83;
const CODE_W = 87;
const CODE_Z = 90;
const CODE_RBRACKET = 221;
const CODE_ALT = 18;
const CODE_SPACE = 32;
const CODE_MOUSEDOWN = 1000;

var MOVING = true;

const MAX_WIDTH = 1600;
const MAX_HEIGHT = 900;

const SCROLL_SPEED = 1.5;

const PLAYER_WIDTH = 20;
const PLAYER_HEIGHT = 40;

const PLAYER_SPAWN_X = MAX_WIDTH/2;
const PLAYER_SPAWN_Y = MAX_HEIGHT*3/4;

const GRAVITY = 0.0008;

/* GLOBAL VARIABLES ****************************************************************************************************/
var seed = SEED_INIT;

/* FUNCTIONS ***********************************************************************************************************/
// Standard Normal variate using Box-Muller transform.
function random_bm(mean=0.5, sigma=0.125) {
    let u = 0, v = 0;
    while(u === 0) u = random(); //Converting [0,1) to (0,1)
    while(v === 0) v = random();
    let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    num = num / 10.0 + 0.5; // Translate to 0 -> 1
    let diff_mean = mean - 0.5;
    let diff_stddev = sigma / 0.125;
    // bring value down to be around 0 and scale/translate
    num -= 0.5;
    num *= diff_stddev;
    num += diff_mean + 0.5;
    return num;
}

// Random uniform value between 0 and 1
function random(min=0, max=1) {
    let x = Math.sin(seed++) * 10000;
    x = x - Math.floor(x);
    let range = max - min;
    x *= range;
    x += min;
    return x;
}

// round a floating point value with given significant figures
function round_to_sigfigs(val, sigfigs){
    return Number.parseFloat(val.toPrecision(sigfigs));
}

function random_color(){
    return "#"+((1<<24)*random()|0).toString(16);
}

/* *************************************************************************************************************************************************************/
/* BEGIN CLASSES ***********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

class V2
{
    constructor(x, y)
    {
        this.x = x;
        this.y = y;
    }
}

class V3
{
    constructor(x, y, z)
    {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

class Triangle
{
    constructor(p1, p2, p3)
    {
        this.A = p1;
        this.B = p2;
        this.C = p3;
        this.color = "white";

        this._set_bounds();
    }

    _set_bounds()
    {
        this.left = Math.min(this.A.x, this.B.x, this.C.x);
        this.right = Math.max(this.A.x, this.B.x, this.C.x);
        this.top = Math.min(this.A.y, this.B.y, this.C.y);
        this.bottom = Math.max(this.A.y, this.B.y, this.C.y);
    }

    /**
     * Returns true if this triangle contains point p.
     * 
     * @param p: V2 for given point.
     * @return bool
     */
    contains(p)
    {
        // Determine if p is outside the bounds of this triangle
        if (p.x < this.left || p.x > this.right || p.y < this.top || p.y > this.bottom)
        {
            return false;
        }

        var myArea = this.area();
        var ABpArea = new Triangle(this.A, this.B, p).area();
        var ACpArea = new Triangle(this.A, this.C, p).area();
        var BCpArea = new Triangle(this.B, this.C, p).area();
        var total = ABpArea + ACpArea + BCpArea;

        return total == myArea;
    }

    /**
     * Returns the area of this triangle.
     * 
     * @return float
     */
    area()
    {
        return Math.abs(this.A.x * (this.B.y - this.C.y) 
                        + this.B.x * (this.C.y - this.A.y)
                        + this.C.x * (this.A.y - this.B.y))
                        / 2.0;
    }
}

class Rectangle
{
    constructor(x, y, w, h)
    {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.color = "white";
        this.alive = true;
    }
    
    /**
     * Returns true if this rectangle contains point p.
     * 
     * @param p: V2 for given point.
     * @return bool
     */
    contains(p)
    {
        if (this.alive == false){ return false; }

        return p.x > this.x - this.width/2 && p.x < this.x + this.width/2 && p.y > this.y - this.height/2 && p.y < this.y + this.height/2;
    }
}

class Entity {
    constructor(x, y, w, h){
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.velx = 0;
        this.vely = 0;
        this.accx = 0;
        this.accy = 0;
        this.kinematic = false;
        this.id = -1;
    }

    move(dur){
        if (this.kinematic){
            this.x += this.velx * dur;
            this.y += this.vely * dur;
            this.velx += this.accx * dur;
            this.vely += this.accy * dur;
        }
    }

    tick(dur){
        this.move(dur);
    }
}

class Player extends Entity {
    constructor(x, y, c, idx=0){
        super(x, y, PLAYER_WIDTH, PLAYER_HEIGHT);
        this.color = c;
        this.vely = 0;
        this.velx = 0;
        this.accx = 0;
        this.accy = GRAVITY;
        this.kinematic = true;
        this.id = idx;
        this.keys = {65: false, 68: false, 87: false, 83: false, 32: false, CODE_MOUSEDOWN: false};
        this.mouse_x = 0;
        this.mouse_y = 0;
        this.alive = true;
        this.has_jump = false;
        this.on_ground = false;
    }

    keydown(code){
        this.keys[code] = true;

        // super secret cheat codes
        if (code == CODE_RBRACKET && this.keys[CODE_ALT])
        {
            reset_game();
        }
    }

    keyup(code){
        this.keys[code] = false;
    }

    mouse_update(x, y){
        this.mouse_x = x;
        this.mouse_y = y;
    }

    apply_damage(dmg){
        this.health -= dmg;

        // check if dead
        if (this.health < 0){
            this.alive = false;
            this.health = 0;
        }
    }

    tick(dur){
        // do nothing if dead
        if (!this.alive){ return; }

        // check for acceleration keys
        if (this.keys[CODE_A])
        {
            this.velx = -0.5;
        }
        else if (this.keys[CODE_D])
        {
            this.velx = 0.5;
        }
        else
        {
            this.velx = 0.0;
        }

        var ldist = -1;
        var rdist = -1;

        for (var i = 0; i < this.height/2; i++)
        {
            var lfoot = this.check_p(new V2(this.x - this.width/3, this.y + this.height/2 - i));
            var rfoot = this.check_p(new V2(this.x + this.width/3, this.y + this.height/2 - i));

            ldist = lfoot ? i : ldist;
            rdist = rfoot ? i : rdist;
        }
        var lbside = this.check_p(new V2(this.x - this.width/2, this.y + this.height/4));
        var rbside = this.check_p(new V2(this.x + this.width/2, this.y + this.height/4));
        var luside = this.check_p(new V2(this.x - this.width/2, this.y - this.height/4));
        var ruside = this.check_p(new V2(this.x + this.width/2, this.y - this.height/4));
        var chead = this.check_p(new V2(this.x, this.y - this.height/2));

        if (chead)
        {
            if (this.vely < 0)
            {
                this.vely = 0;
            }
        }
        else
        {
            if (lbside || luside)
            {
                this.velx = 0;
                this.x += 1;
            }
            else if (rbside || ruside)
            {
                this.velx = 0;
                this.x -= 1;
            }

            if (ldist != -1 || rdist != -1)
            {
                this.on_ground = true;
                if (this.vely > 0.1)
                {
                    this.vely = 0;
                    this.has_jump = true;

                    this.y -= ldist > rdist ? ldist : rdist;
                }
            }
        }

        if (this.on_ground)
        {
            if (ldist == -1 && rdist == -1)
            {
                this.on_ground = false;
            }
            else
            {
                this.accy = 0;
            }
        }
        else
        {
            this.accy = GRAVITY;
        }

        // jump key overrides collision
        if (this.keys[CODE_SPACE] && this.has_jump)
        {
            this.vely = -0.6;
            this.has_jump = false;
        }

        super.tick(dur);

        // DEBUG
        if (this.y - this.height*2 > MAX_HEIGHT)
        {
            this.alive = false;
        }
        if (this.x - this.width/2 > MAX_WIDTH)
        {
            this.x = 0;
        }
        else if (this.x + this.width/2 < 0)
        {
            this.x = MAX_WIDTH;
        }
    }

    check_p(p)
    {
        for (var i = 0; i < terrain.length; i++)
        {
            if (terrain[i].alive == false){ continue; }

            if (terrain[i].contains(p)){
                return true;
            }
        }

        return false;
    }

    kill()
    {
        this.alive = false;
    }
}

/* *************************************************************************************************************************************************************/
/* END CLASSES *************************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

// get a new seed
seed = new Date().getTime();

var last_tick = new Date().getTime();
var elapsed = 0.0;

var players = [];
var id_track = 0;

var terrain = [];

start_terrain();

const wss = new WebSocket.Server({
  port: PORT
});

function resp_d(s, msg){
    if (s){
        if (s.readyState === 1){
            s.send(JSON.stringify(msg));
        }
    }
}

wss.on("connection", function connection(ws){
    ws.on("message", function incoming(message){
        let obj = JSON.parse(message);

        switch (obj["type"]){
            case "ack": // does nothing for now
                break;
            case "connect": // initial connection messages - issue an ID and add to internal variables
                let id = id_track;
                id_track++;
                console.log(id + " given");
                players.push({"ws": ws, "entity": new Player(PLAYER_SPAWN_X, PLAYER_SPAWN_Y, random_color(), id)});
                resp_d(ws, {"type": "id", "id": id});
                resp_d(ws, {"type": "ping", "id": id, "time": (new Date().getTime())});
                break;
            case "pong":
                let elapsed = (new Date().getTime()) - obj["time"];
                console.log("Ping: " + elapsed + " ms");
                if (players[obj["id"]])
                {
                    resp_d(players[obj["id"]]["ws"], {"type": "ack", "id": obj["id"], "message": "OK"});
                }
                break;
            case "ping":
                let resp = JSON.stringify({"type": "pong", "id": obj["id"], "time": obj["time"]});
                ws.send(resp);
                break;
            case "reset": // secret reset command
                reset_game(true);
                console.log("Reset command received");
                break;
            case "key": // key update message from players
                if (obj["down"]){
                    if (players[obj["id"]]){
                        players[obj["id"]]["entity"].keydown(obj["code"]);
                    }
                } else {
                    if (players[obj["id"]]){
                        players[obj["id"]]["entity"].keyup(obj["code"]);
                    }
                }
                break;
            case "mouse": // mouse update message from players
                if (players[obj["id"]]){
                    players[obj["id"]]["entity"].mouse_update(obj["x"], obj["y"]);
                }
                break;
            default:
                console.log(obj);
                resp_d(ws, {"type": "error", "message": "given type not found"});
                break;
        }
    });

    // when someone leaves, remove them from the game
    ws.on("close", function close(){
        for (let i = 0; i < players.length; i++){
            if (players[i]["ws"] === ws){
                players[i].entity.kill();
            }
        }
    })
});

// set frame rate to UPDATE_RATE
setInterval(update, UPDATE_RATE);

function update(){
    // find a time delta since previous frame
    time_delta = new Date().getTime() - last_tick;
    elapsed += time_delta;

    // trigger the tick for all players
    for (let i = 0; i < players.length; i++){
        players[i].entity.tick(time_delta);
    }

    if (MOVING && elapsed > 5000)
    {
        for (var i = 0; i < terrain.length; i++)
        {
            if (terrain[i].alive){
                terrain[i].y += SCROLL_SPEED;
            }

            if (terrain[i].y - terrain[i].height/2 > MAX_HEIGHT)
            {
                terrain[i].alive = false;
            }
        }
    }

    if (terrain[terrain.length-1].y >= 100)
    {
        var r = Math.floor(random(1, 3));
        for (var i = 0; i < r; i++)
        {
            terrain.push(new Rectangle(random(0, MAX_WIDTH), -100, random(50, 400), 20));
        }
    }

    // send updates to clients
    send_state();

    cleanup();

    last_tick = new Date().getTime();
}

function start_terrain()
{
    terrain.push(new Rectangle(800, 800, 1000, 140));
    terrain.push(new Rectangle(200, 600, 200, 20));
    terrain.push(new Rectangle(1400, 600, 200, 20));
    terrain.push(new Rectangle(800, 400, 400, 20));
    terrain.push(new Rectangle(300, 200, 300, 20));
    terrain.push(new Rectangle(1300, 200, 300, 20));
    terrain.push(new Rectangle(600, 0, 100, 20));
    terrain.push(new Rectangle(1000, 0, 100, 20));
}

function reset_game(full=false){
    MOVING = true;
    elapsed = 0;
    for (var i = 0; i < players.length; i++)
    {
        if (players[i])
        {
            players[i].entity = new Player(PLAYER_SPAWN_X, PLAYER_SPAWN_Y, players[i].entity.color, players[i].entity.id);
        }
    }

    terrain.splice(0, terrain.length);
    start_terrain();
}

function send_state()
{
    var ptmp = [];
    for (var i = 0; i < players.length; i++)
    {
        if (players[i])
        {
            var p = players[i].entity;
            ptmp.push({x: p.x, y: p.y, w: p.width, h: p.height, alive: p.alive, color: p.color});
        }
    }

    for (var i = 0; i < players.length; i++)
    {
        resp_d(players[i].ws, {"type": "tick", "players": ptmp, "terrain": terrain});
    }
}

function cleanup(){
}
