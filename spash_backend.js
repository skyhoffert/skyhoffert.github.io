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
const CODE_ALT = 18;
const CODE_P = 80;

const PLAYER_SIZE = 40;
const PLAYER_TURN_RATE = 0.008;
const PLAYER_ACCELERATION = 0.001;
const PLAYER_HEALTH_MAX = 100;
const PLAYER_FIRE_CD = 250;
const PLAYER_DAMPING_FACTOR = 0.001;

const BULLET_SIZE = 8;
const BULLET_DAMAGE = 34;

const NUMBER_OF_AI = 3;

const MAX_ID = 1000000;

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
    constructor(x, y, c, is_ai=false){
        super(x, y, PLAYER_SIZE, PLAYER_SIZE);
        this.color = c;
        this.vely = 0;
        this.velx = 0;
        this.kinematic = true;
        this.id = 'player';
        this.keys = {65: false, 68: false, 87: false, 83: false, 32: false, CODE_MOUSEDOWN: false};
        this.mouse_x = 0;
        this.mouse_y = 0;
        this.angle = 0;
        this.health_max = PLAYER_HEALTH_MAX;
        this.health = PLAYER_HEALTH_MAX;
        this.firing = false;
        this.fire_lasttime = 0;
        this.fire_cd = PLAYER_FIRE_CD;
        this.alive = true;
        this.is_ai = is_ai;
        this.just_spawned_new_ai = false;
    }

    keydown(code){
        this.keys[code] = true;

        if (code === CODE_P){
            if (this.keys[CODE_ALT]){
                if (!this.just_spawned_new_ai){
                    this.just_spawned_new_ai = true;

                    spawn_new_ai();
                }
            }
        }
    }

    keyup(code){
        this.keys[code] = false;

        if (code === CODE_P){
            this.just_spawned_new_ai = false;
        }
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

    tick(){
        // do nothing if dead
        if (!this.alive){
            return;
        }

        super.tick();

        // check for turning towards mouse pointer
        let ang = Math.atan2(this.mouse_y - this.y, this.mouse_x - this.x);
        let diff = -ang - this.angle;
        if (this.mouse_x < this.x && ang > 0 && this.angle > 0){
            this.angle += PLAYER_TURN_RATE * time_delta;
        } else if (this.mouse_x < this.x && ang < 0 && this.angle < 0){
            this.angle -= PLAYER_TURN_RATE * time_delta;
        } else {
            if (diff > 0.1){
                this.angle += PLAYER_TURN_RATE * time_delta;
            } else if (diff < -0.1){
                this.angle -= PLAYER_TURN_RATE * time_delta;
            }
        }

        // check for acceleration keys
        if (this.keys[CODE_W]){
            this.velx += Math.cos(this.angle) * time_delta * PLAYER_ACCELERATION;
            this.vely += -Math.sin(this.angle) * time_delta * PLAYER_ACCELERATION;
        } else {
            if (Math.abs(this.velx) > 0.01){
                this.velx -= this.velx * time_delta * PLAYER_DAMPING_FACTOR;
            } else {
                this.velx = 0;
            }

            if (Math.abs(this.vely) > 0.01){
                this.vely -= this.vely * time_delta * PLAYER_DAMPING_FACTOR;
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

                bullets.push(new Bullet(this.x + this.width*3/4 * Math.cos(this.angle), this.y - this.height*3/4 * Math.sin(this.angle), Math.cos(this.angle)+this.velx, -Math.sin(this.angle)+this.vely));
            } else {
                this.firing = false;
            }
        } else {
            this.firing = false;
        }
        
        // keep angle at normal values
        if (this.angle > Math.PI){
            this.angle -= 2*Math.PI;
        } else if (this.angle < -Math.PI){
            this.angle += 2*Math.PI;
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

class Enemy_AI {
    constructor(index, version=0, st=(new Date().getTime())){
        this.index = index;
        this.spawn_time = Number.parseInt(st);
        this.entity = players[this.index]['entity'];
        this.entity.mouse_update(WIDTH/2, this.y);
        this.version = version;
        this.state = 'roaming';
        this.target_id = -1;
    }

    tick(){
        if (!this.entity.alive){
            delete players[this.index];
            return;
        }

        if (this.version === 0){
        } else if (this.version === 1){
            if (this.state === 'roaming'){
                let alive_for = new Date().getTime() - this.spawn_time;

                this.entity.mouse_update(WIDTH/4 * Math.cos(alive_for/1000) + WIDTH/2, HEIGHT/4 * Math.sin(alive_for/1000) + HEIGHT/2);

                if (alive_for%4 === 0){
                    this.entity.keydown(CODE_W);
                } else {
                    if (this.entity.keys[CODE_W]){
                        this.entity.keyup(CODE_W);
                    }
                }

                if (random(0,1) < 0.002){
                    this.state = 'attacking';
                    if (this.entity.keys[CODE_W]){
                        this.entity.keyup(CODE_W);
                    }
                }
            } else if (this.state === 'attacking'){
                if (Object.keys(players).length > 1){
                    if (this.target_id === -1){
                        this.target_id = Object.keys(players)[Number.parseInt(random(0, Object.keys(players).length))];
                        while (this.target_id === this.index){
                            this.target_id = Object.keys(players)[Number.parseInt(random(0, Object.keys(players).length))];
                        }

                        console.log('' + this.index + ' acquired new target ' + this.target_id);
                    }

                    if (!players[this.target_id] || players[this.target_id].dead){
                        return;
                    }

                    let target = players[this.target_id]['entity'];

                    this.entity.mouse_update(target.x, target.y);

                    if (random(0,1) < 0.01){
                        this.entity.keydown(CODE_MOUSEDOWN);
                    } else {
                        if (this.entity.keys[CODE_MOUSEDOWN]){
                            this.entity.keyup(CODE_MOUSEDOWN);
                        }
                    }

                    if (random(0,1) < 0.002){
                        this.state = 'roaming';
                        if (this.entity.keys[CODE_W]){
                            this.entity.keyup(CODE_W);
                        }
                        this.target_id = -1;
                    }
                } else {
                    this.state = 'roaming';
                    if (this.entity.keys[CODE_W]){
                        this.entity.keyup(CODE_W);
                    }
                    this.target_id = -1;
                }
            }
        } else {
            this.entity.angle += 0.01;
        }
    }
}

/* *************************************************************************************************************************************************************/
/* END CLASSES *************************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

var players = {};

var bullets = [];
var enemy_ais = [];

for (let i = 0; i < NUMBER_OF_AI; i++){
    spawn_new_ai();
}

seed = new Date().getTime();

var last_tick = new Date().getTime();
var cur_tick = new Date().getTime();

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
                let id = Number.parseInt(random(0, MAX_ID));
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
            case 'mouse':
            if (players[obj['id']]){
                players[obj['id']]['entity'].mouse_update(obj['x'], obj['y']);
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
    // find a time delta since previous frame
    time_delta = new Date().getTime() - last_tick;

    // trigger the tick for all players
    for (let i = 0; i < Object.keys(players).length; i++){
        players[Object.keys(players)[i]]['entity'].tick();
    }

    // handle bullets
    for (let i = 0; i < bullets.length; i++){
        bullets[i].tick();
    }

    // handle enemy ais
    for (let i = 0; i < enemy_ais.length; i++){
        enemy_ais[i].tick();
    }

    // send updates to clients
    send_state();

    // cleanup any garbage
    cleanup();

    // remember this tick time
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
            bullets.splice(i, 1);
            return;
        }
    }
}

function spawn_new_ai(){
    let id = Number.parseInt(random(0, MAX_ID));
    while (id in players){
        let id = Number.parseInt(random(0, MAX_ID));
    }
    let v = Number.parseInt(random(0,2));
    console.log(id + ' given to AI');
    players[id] = {'ws': null, 'entity': new Player(random(WIDTH/8, WIDTH*7/8), random(HEIGHT/8, HEIGHT*7/8), random_color(), is_ai=true)};
    enemy_ais.push(new Enemy_AI(id, 1, (new Date().getTime() + random(-10000, 10000))));
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
