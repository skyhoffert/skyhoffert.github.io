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
const CODE_SPACE = 32;
const CODE_MOUSEDOWN = 1000;

const MOVING = false;

const MAX_WIDTH = 1600;

// other constants
const MAX_ID = 1000000;

const PLAYER_WIDTH = 20;
const PLAYER_HEIGHT = 40;

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
        this.accy = 0.0008;
        this.kinematic = true;
        this.id = idx;
        this.keys = {65: false, 68: false, 87: false, 83: false, 32: false, CODE_MOUSEDOWN: false};
        this.mouse_x = 0;
        this.mouse_y = 0;
        this.alive = true;
        this.has_jump = false;
    }

    keydown(code){
        this.keys[code] = true;
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

        // check fire button
        if (this.keys[CODE_SPACE] && this.has_jump)
        {
            this.vely = -0.6;
            this.has_jump = false;
        }

        var fl = this.check_p(new V2(this.x - this.width/3, this.y + this.height/2 + 1));
        var fr = this.check_p(new V2(this.x + this.width/3, this.y + this.height/2 + 1));
        var bl = this.check_p(new V2(this.x - this.width/3, this.y + this.height/2));
        var br = this.check_p(new V2(this.x + this.width/3, this.y + this.height/2));
        var cc = this.check_p(new V2(this.x, this.y));
        var tc = this.check_p(new V2(this.x, this.y - this.height/2));

        if (fl || fr || bl || br)
        {
            this.y -= 2;
            this.vely = 0;
            this.has_jump = true;
        }

        super.tick(dur);

        // DEBUG
        if (this.y > 1000)
        {
            this.x = 250;
            this.y = 200;
        }
    }

    check_p(p)
    {
        for (var i = 0; i < terrain.length; i++)
        {
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

terrain.push(new Triangle(new V2(200, 750), new V2(800, 900), new V2(1400, 750)));
terrain.push(new Triangle(new V2(1150, 550), new V2(1350, 650), new V2(1550, 500)));
terrain.push(new Triangle(new V2(50, 500), new V2(250, 650), new V2(450, 550)));

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
                players.push({"ws": ws, "entity": new Player(250, 200, random_color(), id)});
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
            terrain[i].y += 1;
            terrain[i].A.y += 1;
            terrain[i].B.y += 1;
            terrain[i].C.y += 1;
        }
    }

    // send updates to clients
    send_state();

    cleanup();

    last_tick = new Date().getTime();
}

function reset_game(full=false){
    // TODO
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
