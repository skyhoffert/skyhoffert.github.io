// Sky Hoffert
// November 10, 2018

/* *************************************************************************************************************************************************************/
/* BEGIN CONSTANTS *********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

const WIDTH = 1600;
const HEIGHT = 900;
const UPDATE_RATE = 1000/60;

const SEED_INIT = 1;

const BALL_SIZE = 12;
const BALL_SPEED = 6;

const PLAYER_SIZE = 32;
const PLAYER_SPEED = 4;

const CODE_A = 65;
const CODE_D = 68;
const CODE_W = 87;
const CODE_S = 83;
const CODE_SPACE = 32;

/* *************************************************************************************************************************************************************/
/* END CONSTANTS ***********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

/* *************************************************************************************************************************************************************/
/* BEGIN CLASSES ***********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

class Entity {
    constructor(x, y, w, h){
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.kinematic = false;
        this.id = '';
    }

    move(){
        if (this.kinematic){
            this.x += this.velx;
            this.y += this.vely;
        }
    }
    
    interact(entities){ }
    wall_collision(walls){ }
    draw(){ }
}

class Ball extends Entity {
    constructor(x, y){
        super(x, y, BALL_SIZE, BALL_SIZE);
        this.color = 'red';
        this.velx = random(-1,1);
        this.vely = random(-1,1);
        this.speed = BALL_SPEED;
        this.kinematic = true;
        this.id = 'ball';
        this.grabbed = false;
        this.scored = 0;

        this.normalize_velocity();
    }
    
    move(){
        super.move();
        
        if (this.x < canvas.width*1/8-16){
            this.kinematic = false;
            this.scored = 1;
        } else if (this.x > canvas.width*7/8+16){
            this.kinematic = false;
            this.scored = -1;
        }
    }

    normalize_velocity(){
        let mag = magnitude(this.velx, this.vely);
        this.velx = this.velx / mag * this.speed;
        this.vely = this.vely / mag * this.speed;
    }

    wall_collision(walls){
        for (let i = 0; i < walls.length; i++){
            let w = walls[i]
            // check vertical
            if (this.x > w.x-w.width/2 && this.x < w.x+w.width/2){
                let dist = w.y - this.y;
                if (Math.abs(dist) <= this.height/2 + w.height/2 && Math.sign(dist) === Math.sign(this.vely)){
                    this.vely = -this.vely;
                }
            } else if (this.y > w.y-w.height/2 && this.y < w.y+w.height/2){
                let dist = w.x - this.x;
                if (Math.abs(dist) <= this.width/2 + w.width/2 && Math.sign(dist) === Math.sign(this.velx)){
                    this.velx = -this.velx;
                }
            }
        }
    }
    
    draw(){
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(this.x, this.y, this.width/2, 0, 2*Math.PI);
        ctx.fill();
        ctx.closePath();
    }
}

class Wall extends Entity {
    constructor(x, y, w, h, c, a){
        super(x, y, w, h);
        this.color = c;
        this.angle = a;
        this.id = 'wall';
    }

    draw(){
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = this.color;
        if (Math.abs(this.angle) > 1){
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle * Math.PI/180);
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        } else {
            ctx.fillRect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        }
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    }
}

class Player extends Entity {
    constructor(x, y){
        super(x, y, PLAYER_SIZE, PLAYER_SIZE);
        this.color = 'purple';
        this.vely = 0;
        this.velx = 0;
        this.kinematic = true;
        this.id = 'player';
        this.speed = PLAYER_SPEED;
        this.keys = {65: false, 68: false, 87: false, 83: false, 32: false};
        this.grab_range = this.width*3/2;
        this.grab_ball = null;
        this.grab_angle = 0;
        this.grab_time = 0;
    }

    keydown(code){
        this.keys[code] = true;
    }

    keyup(code){
        this.keys[code] = false;

        if (code == CODE_SPACE){
            if (this.grab_ball != null && this.grab_ball.grabbed){
                let curtime = new Date().getTime();
                let ang = this.grab_angle + (curtime - this.grab_time) * this.grab_ball.speed/1000;
                this.grab_ball.velx = Math.cos(ang) * this.grab_dir;
                this.grab_ball.vely = -Math.sin(ang) * this.grab_dir;
                this.grab_ball.normalize_velocity();
                this.grab_ball.kinematic = true;
                this.grab_ball.grabbed = false;
                this.grab_dir = 1;

                this.grab_ball = null;
            }
        }
    }

    interact(entities){
        if (this.keys[CODE_SPACE]){
            for (let i = 0; i < entities.length; i++){
                if (entities[i].id == 'ball'){
                    if (!entities[i].grabbed){
                        this.grab_ball = entities[i];
                        let dist = distance_to(this.x, this.y, this.grab_ball.x, this.grab_ball.y);
                        if (dist < this.grab_range && dist > this.width/2){
                            this.grab_ball.kinematic = false;
                            this.grab_ball.grabbed = true;
                            this.grab_time = new Date().getTime();
                            let dy = this.y - this.grab_ball.y;
                            let dx = this.x - this.grab_ball.x;
                            if (dx > 0){
                                this.grab_angle = Math.atan2(-dy,dx)-Math.PI/2;
                                this.grab_dir = -1;
                            } else if (dx < 0){
                                this.grab_angle = Math.atan2(-dy,dx)-Math.PI/2;
                                this.grab_dir = 1;
                            }
                        }
                    } else {
                        if (this.grab_ball != null){
                            let curtime = new Date().getTime();
                            this.grab_ball.x = this.x + Math.sin(this.grab_angle + (curtime - this.grab_time) * this.grab_ball.speed/1000 * this.grab_dir) * this.grab_range;
                            this.grab_ball.y = this.y + Math.cos(this.grab_angle + (curtime - this.grab_time) * entities[i].speed/1000 * this.grab_dir) * this.grab_range;
                        }
                    }
                }
            }
        }
    }

    move(){
        let lr = this.keys[CODE_A] ? -this.speed : this.keys[CODE_D] ? this.speed : 0.0;
        let ud = this.keys[CODE_W] ? -this.speed : this.keys[CODE_S] ? this.speed : 0.0;
        if (Math.abs(lr) > 0 && Math.abs(ud) > 0){
            lr /= Math.sqrt(2);
            ud /= Math.sqrt(2);
        }
        this.velx = lr;
        this.vely = ud;
        super.move();
    }
    
    wall_collision(walls){
        for (let i = 0; i < walls.length; i++){
            let w = walls[i]
            // check vertical
            if (this.x > w.x-w.width/2 && this.x < w.x+w.width/2){
                let dist = w.y - this.y;
                if (Math.abs(dist) <= this.height/2 + w.height/2 && Math.sign(dist) === Math.sign(this.vely)){
                    this.vely = 0;
                }
            } else if (this.y > w.y-w.height/2 && this.y < w.y+w.height/2){
                let dist = w.x - this.x;
                if (Math.abs(dist) <= this.width/2 + w.width/2 && Math.sign(dist) === Math.sign(this.velx)){
                    this.velx = 0;
                }
            }
        }
    }

    draw(){
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(this.x, this.y, this.width/2, 0, 2*Math.PI);
        ctx.fill();
        ctx.closePath();

        ctx.beginPath();
        ctx.strokeStyle = '#999999';
        ctx.arc(this.x, this.y, this.grab_range, 0, 2*Math.PI);
        ctx.stroke();
        ctx.closePath();
    }
}

/* *************************************************************************************************************************************************************/
/* END CLASSES *************************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

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
/* BEGIN DRAWING ***********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

seed = new Date().getTime();

// grab the canvas from the html document and set things for it
var canvas = document.getElementById("main_canvas");
canvas.width = WIDTH;
canvas.height = HEIGHT;
var ctx = canvas.getContext("2d");

var entities = [];
var walls = [];

var score_l = 0;
var score_r = 0;

entities.push(new Ball(canvas.width/2, canvas.height/2));
entities.push(new Player(canvas.width/4, canvas.height/2));

walls.push(new Wall(canvas.width*1/2, canvas.height*1/8, canvas.width*3/4 + 16, 16, 'blue', 0));
walls.push(new Wall(canvas.width*1/2, canvas.height*7/8, canvas.width*3/4 + 16, 16, 'blue', 0));
walls.push(new Wall(canvas.width*1/8, canvas.height*1/4, 16, canvas.height*1/4, 'blue', 0));
walls.push(new Wall(canvas.width*1/8, canvas.height*3/4, 16, canvas.height*1/4, 'blue', 0));
walls.push(new Wall(canvas.width*7/8, canvas.height*1/4, 16, canvas.height*1/4, 'blue', 0));
walls.push(new Wall(canvas.width*7/8, canvas.height*3/4, 16, canvas.height*1/4, 'blue', 0));

// set frame rate to UPDATE_RATE
setInterval(update, UPDATE_RATE);

canvas.addEventListener('mousedown', function(evt) {
}, false);

canvas.addEventListener('mousemove', function(evt){
}, false);

canvas.addEventListener('mouseup', function(evt) {
}, false);

canvas.addEventListener('mousewheel', function(evt) {
}, false);

document.body.onkeydown = function(e){
    p = get_player();
    if (p){
        p.keydown(e.keyCode);
    }
}

document.body.onkeyup = function(e){
    p = get_player();
    if (p){
        p.keyup(e.keyCode);
    }
}

/*
Main update function
    @return: void
*/
function update(){
    // clear the screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < entities.length; i++){
        entities[i].interact(entities);
        entities[i].move();
        entities[i].wall_collision(walls);
        entities[i].draw();
    }

    for (let i = 0; i < walls.length; i++){
        walls[i].draw();
    }

    if (get_ball().scored){
        score_l += get_ball().scored > 0 ? 1 : 0;
        score_r += get_ball().scored < 0 ? 1 : 0;
        reset_game();
    }
    
    ctx.font = "30px Arial";
    ctx.fillStyle = 'black';
    ctx.fillText(score_l,canvas.width/16,canvas.height/16);
    ctx.fillText(score_r,canvas.width*15/16,canvas.height/16);
}

function reset_game(){
    let idx = get_ball_index();
    entities.splice(idx, 1);
    entities.push(new Ball(canvas.width/2, canvas.height/2));
}

function get_player(){
    for (let i = 0; i < entities.length; i++){
        if (entities[i].id === 'player'){
            return entities[i];
        }
    }

    return null;
}

function get_ball(){
    for (let i = 0; i < entities.length; i++){
        if (entities[i].id === 'ball'){
            return entities[i];
        }
    }

    return null;
}

function get_ball_index(){
    for (let i = 0; i < entities.length; i++){
        if (entities[i].id === 'ball'){
            return i;
        }
    }

    return null;
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

/* *************************************************************************************************************************************************************/
/* END DRAWING *************************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/
