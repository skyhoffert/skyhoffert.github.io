// balas
// November 12, 2018

const WebSocket = require('ws');

const PORT = 5200;

const SEED_INIT = 1;

const WIDTH = 1600;
const HEIGHT = 900;
const UPDATE_RATE = 1000/60;

const CODE_A = 65;
const CODE_D = 68;
const CODE_W = 87;
const CODE_S = 83;
const CODE_SPACE = 32;
const CODE_SHIFT = 16;
const CODE_MOUSEDOWN = 1000;

const PLAYER_SIZE = 40;
const PLAYER_TURN_RATE = 0.008;
const PLAYER_ACCELERATION = 0.001;
const PLAYER_HEALTH_MAX = 100;
const PLAYER_FIRE_CD = 500;

const BULLET_SIZE = 8;
const BULLET_DAMAGE = 50.5;

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

/* *************************************************************************************************************************************************************/
/* BEGIN CLASSES ***********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

class Entity {
    constructor(x, y, w, h){
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.velx = 0;
        this.vely = 0;
        this.kinematic = false;
        this.id = '';
    }

    move(){
        if (this.kinematic){
            this.x += this.velx * time_delta;
            this.y += this.vely * time_delta;
        }
    }

    tick(){
        this.move();
    }
}

class Player extends Entity {
    constructor(x, y, c){
        super(x, y, PLAYER_SIZE, PLAYER_SIZE);
        this.color = c;
        this.vely = 0;
        this.velx = 0;
        this.kinematic = true;
        this.id = 'player';
        this.keys = {65: false, 68: false, 87: false, 83: false, 32: false};
        this.angle = 0;
        this.health_max = PLAYER_HEALTH_MAX;
        this.health = PLAYER_HEALTH_MAX;
        this.firing = false;
        this.fire_lasttime = 0;
        this.fire_cd = PLAYER_FIRE_CD;
        this.alive = true;
    }

    keydown(code){
        this.keys[code] = true;
    }

    keyup(code){
        this.keys[code] = false;
    }

    apply_damage(dmg){
        this.health -= dmg;

        // check if dead
        if (this.health < 0){
            this.alive = false;
            this.health = 0;
        }
    }

    tick(){
        // do nothing if dead
        if (!this.alive){
            return;
        }

        super.tick();

        // check for turning keys
        if (this.keys[CODE_A]){
            this.angle += PLAYER_TURN_RATE * time_delta;
        }
        if (this.keys[CODE_D]){
            this.angle -= PLAYER_TURN_RATE * time_delta;
        }

        // check for acceleration keys
        if (this.keys[CODE_W]){
            this.velx += Math.cos(ent.angle) * time_delta * PLAYER_ACCELERATION;
            this.vely += -Math.sin(ent.angle) * time_delta * PLAYER_ACCELERATION;
        } else {
            if (Math.abs(this.velx) > 0.01){
                this.velx -= this.velx * time_delta * PLAYER_ACCELERATION/20;
            } else {
                this.velx = 0;
            }

            if (Math.abs(this.vely) > 0.01){
                this.vely -= this.vely * time_delta * PLAYER_ACCELERATION/20;
            } else {
                this.vely = 0;
            }
        }

        // check fire button
        if (this.keys[CODE_MOUSEDOWN]){
            let curtime = new Date().getTime();
            if (curtime > this.fire_lasttime+this.fire_cd){
                this.fire_lasttime = curtime;
                this.firing = true;

                bullets.push(new Bullet(this.x + this.width*3/4 * Math.cos(this.angle), this.y - this.height*3/4 * Math.sin(this.angle), Math.cos(this.angle)+this.velx, -Math.sin(this.angle)-this.vely));
            } else {
                this.firing = false;
            }
        } else {
            this.firing = false;
        }
        
        // keep angle at normal values
        if (this.angle > 2*Math.PI){
            this.angle -= 2 * Math.PI;
        } else if (this.angle < 0){
            this.angle += 2 * Math.PI;
        }
    }

}

class Bullet extends Entity {
    constructor(x, y, vx, vy){
        super(x, y, BULLET_SIZE, BULLET_SIZE);
        this.color = 'black';
        this.velx = vx;
        this.vely = vy;
        this.kinematic = true;
        this.id = 'bullet';
        this.spawn_time = new Date().getTime();
        this.dead = false;
        this.damage = BULLET_DAMAGE;
    }

    tick(){
        super.tick();

        if (this.x-this.width > WIDTH || this.x+this.width < 0 || this.y-this.height > HEIGHT || this.y+this.height < 0){
            this.dead = true;
        } else {
            for (let i = 0; i < Object.keys(players).length; i++){
                let p = players[Object.keys(players)[i]]['entity'];
                if (p.alive){
                    if (this.x < p.x+p.width/2 && this.x > p.x-p.width/2 && this.y < p.y+p.height/2 && this.y > p.y-p.height/2){
                        this.dead = true;
                        p.apply_damage(this.damage);
                        return;
                    }
                }
            }
        }
    }
}

/* *************************************************************************************************************************************************************/
/* END CLASSES *************************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

var players = {};

var bullets = [];

seed = new Date().getTime();

var last_tick = new Date().getTime();
var cur_tick = new Date().getTime();

const wss = new WebSocket.Server({
  port: PORT
});

function resp_d(s, msg){
    if (s.readyState === 1){
        s.send(JSON.stringify(msg));
    }
}

function random_color(){
    return "#"+((1<<24)*random()|0).toString(16);
}

wss.on('connection', function connection(ws){
    ws.on('message', function incoming(message){
        let obj = JSON.parse(message);

        // DEBUG
        //console.log(obj);

        switch (obj['type']){
            case 'ack':
                break;
            case 'connect':
                let id = Object.keys(players).length;
                console.log(id + ' given');
                players[id] = {'ws': ws, 'entity': new Player(WIDTH/2, HEIGHT/2, random_color())};
                resp_d(ws, {'type': 'id', 'id': id});
                resp_d(ws, {'type': 'ping', 'id': id, 'time': (new Date().getTime())});
                break;
            case 'pong':
                let elapsed = (new Date().getTime()) - obj['time'];
                console.log('Ping: ' + elapsed + ' ms');
                resp_d(players[obj['id']]['ws'], {'type': 'ack', 'id': obj['id'], 'message': 'OK'});
                break;
            case 'ping':
                let resp = JSON.stringify({'type': 'pong', 'id': obj['id'], 'time': obj['time']});
                ws.send(resp);
                break;
            case 'reset':
                reset_game(true);
                console.log('Reset command received');
                break;
            case 'key':
                if (obj['down']){
                    if (players[obj['id']]){
                        players[obj['id']]['entity'].keydown(obj['code']);
                    }
                } else {
                    if (players[obj['id']]){
                        players[obj['id']]['entity'].keyup(obj['code']);
                    }
                }
                break;
            default:
                console.log(obj);
                resp_d(ws, {'type': 'error', 'message': 'given type not found'});
                break;
        }
    });

    ws.on('close', function close(){
        for (let i = 0; i < Object.keys(players).length; i++){
            let id = Object.keys(players)[i];
            if (players[id]['ws'] === ws){
                delete players[id];
            }
        }
    })
});

// set frame rate to UPDATE_RATE
setInterval(update, UPDATE_RATE);

function update(){
    time_delta = new Date().getTime() - last_tick;
    for (let i = 0; i < Object.keys(players).length; i++){
        ent = players[Object.keys(players)[i]]['entity'];
        ent.tick();
    }
    for (let i = 0; i < bullets.length; i++){
        bullets[i].tick();
    }

    send_state();
    cleanup();

    last_tick = new Date().getTime();
}

function reset_game(full=false){

}

function send_state(){
    let ps = {};
    for (let i = 0; i < Object.keys(players).length; i++){
        ps[i] = players[Object.keys(players)[i]]['entity'];
    }

    for (let i = 0; i < Object.keys(players).length; i++){
        resp_d(players[Object.keys(players)[i]]['ws'], {'type': 'tick', 'players': ps, 'bullets': bullets});
    }
}

function cleanup(){
    for (let i = 0; i < bullets.length; i++){
        if (bullets[i].dead){
            bullets.splice(i);
            i--;
        }
    }
}

/*
Find the vector distance between 2 points
    @arg x1: int; point x1
    @arg y1: int; point y1
    @arg x2: int; point x2
    @arg y2: int; point y2
    @return: float; distance between the two points
*/
function distance_to(x1, y1, x2, y2){
    return Math.sqrt((x2-x1)**2 + (y2-y1)**2);
}

function magnitude(x, y){
    return Math.sqrt(x**2 + y**2)
}

function cross_product(x1, y1, x2, y2){
    return x1*y2 - y1*x2;
}
