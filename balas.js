// Sky Hoffert
// November 10, 2018

/* *************************************************************************************************************************************************************/
/* BEGIN CONSTANTS *********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

const WIDTH = 1600;
const HEIGHT = 900;
const UPDATE_RATE = 1000/60;

const BALL_SIZE = 12;
const BALL_SPEED = 7;
const BALL_COLOR = 'red';

const PLAYER_SIZE = 32;
const PLAYER_SPEED = 4;
const PLAYER_COLOR = 'blue';

const CODE_A = 65;
const CODE_D = 68;
const CODE_W = 87;
const CODE_S = 83;
const CODE_SPACE = 32;

/* *************************************************************************************************************************************************************/
/* END CONSTANTS ***********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

/* *************************************************************************************************************************************************************/
/* BEGIN WEB SOCKET ********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

//var IP = 'localhost';
var IP = '35.171.151.27';
var PORT = '5000';

var ws = new WebSocket('ws://' + IP + ':' + PORT);

var ID = -1;

const INIT_MSG = {
    'type': 'connect',
};

function key_msg(code, down=true) {
    return {
        'type': 'key',
        'id': ID,
        'down': down,
        'code': code
    };
}

ws.onopen = function () {
    let start = new Date().getTime();
};

ws.onmessage = function (evt) {
    let obj = JSON.parse(evt.data);

    // DEBUG
    //console.log(obj);

    switch (obj['type']){
        case 'id':
            ID = obj['id'];
            console.log('ID: ' + ID);
            break;
        case 'pong':
            let elapsed = (new Date().getTime()) - obj['time'];
            console.log('Ping: ' + elapsed + ' ms');
            ws.send(JSON.stringify({'type': 'ack', 'id': ID, 'message': 'OK'}));
            break;
        case 'ping':
            let resp = JSON.stringify({'type': 'pong', 'id': obj['id'], 'time': obj['time']});
            ws.send(resp);
            break;
        case 'ack':
            console.log('ACK: ' + obj['message']);
            break;
        case 'tick':
            players = obj['players'];
            ball = obj['ball'];
            score_l = obj['score_l'];
            score_r = obj['score_r'];
            break;
        case 'player_position':
            if (obj['id'] === 0 || obj['id'] > Object.keys(players).length){
                players[obj['id']] = {'x': obj['x'], 'y': obj['y']};
            } else {
                players[obj['id']]['x'] = obj['x'];
                players[obj['id']]['y'] = obj['y'];
            }
            break;
        default:
            console.log(obj);
            break;
    }
};

ws.onerror = function (err){
    console.log('error: ' + err);
};

var tick = 0;
var x = 0.0;
var y = 0.0;

/* *************************************************************************************************************************************************************/
/* END WEB SOCKET **********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

/* *************************************************************************************************************************************************************/
/* BEGIN CLASSES ***********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

class Wall {
    constructor(x, y, w, h, c, a){
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
        this.color = c;
        this.angle = a;
        this.id = 'wall';
        this.kinematic = false;
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

/* *************************************************************************************************************************************************************/
/* END CLASSES *************************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

/* *************************************************************************************************************************************************************/
/* BEGIN DRAWING ***********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

// grab the canvas from the html document and set things for it
var canvas = document.getElementById("main_canvas");
canvas.width = WIDTH;
canvas.height = HEIGHT;
var ctx = canvas.getContext("2d");

var players = {};

var ball = {};

var walls = [];
walls.push(new Wall(canvas.width*1/2, canvas.height*1/8, canvas.width*3/4 + 16, 16, 'blue', 0));
walls.push(new Wall(canvas.width*1/2, canvas.height*7/8, canvas.width*3/4 + 16, 16, 'blue', 0));
walls.push(new Wall(canvas.width*1/8, canvas.height*1/4, 16, canvas.height*1/4, 'blue', 0));
walls.push(new Wall(canvas.width*1/8, canvas.height*3/4, 16, canvas.height*1/4, 'blue', 0));
walls.push(new Wall(canvas.width*7/8, canvas.height*1/4, 16, canvas.height*1/4, 'blue', 0));
walls.push(new Wall(canvas.width*7/8, canvas.height*3/4, 16, canvas.height*1/4, 'blue', 0));

var score_l = 0;
var score_r = 0;

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
    if (ID != -1){
        if (ws.readyState === 1){
            ws.send(JSON.stringify(key_msg(e.keyCode, true)));
        }
    }
}

document.body.onkeyup = function(e){
    if (ID != -1){
        if (ws.readyState === 1){
            ws.send(JSON.stringify(key_msg(e.keyCode, false)));
        }
    }
}

/*
Main update function
    @return: void
*/
function update(){
    // clear the screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    draw_players();
    draw_ball();
    draw_walls();

    network();
    
    ctx.font = "30px Cambria";
    ctx.fillStyle = 'black';
    ctx.fillText(score_l,canvas.width/16,canvas.height/16);
    ctx.fillText(score_r,canvas.width*15/16,canvas.height/16);
}

function draw_players(){
    for (let i = 0; i < Object.keys(players).length; i++){
        ctx.beginPath();
        ctx.fillStyle = players[Object.keys(players)[i]].color;
        ctx.arc(players[Object.keys(players)[i]].x, players[Object.keys(players)[i]].y, PLAYER_SIZE/2, 0, 2*Math.PI);
        ctx.fill();
        ctx.closePath();
        
        if (players[Object.keys(players)[i]].can_grab){
            ctx.beginPath();
            ctx.strokeStyle = '#999999';
            ctx.arc(players[Object.keys(players)[i]].x, players[Object.keys(players)[i]].y, players[Object.keys(players)[i]].grab_range, 0, 2*Math.PI);
            ctx.stroke();
            ctx.closePath();
        }
    }
}

function draw_ball(){
    ctx.beginPath();
    ctx.fillStyle = BALL_COLOR;
    ctx.arc(ball.x, ball.y, BALL_SIZE/2, 0, 2*Math.PI);
    ctx.fill();
    ctx.closePath();
}

function draw_walls(){
    for (let i = 0; i < walls.length; i++){
        walls[i].draw();
    }
}

const WAIT_TICKS_MAX = 10;
var wait_ticks = 0;

function network(){
    if (ws.readyState === 1){
        if (ID != -1){
            if (tick % 15 === 0){
                //ws.send(JSON.stringify({'type': 'ping', 'id': ID, 'time': (new Date().getTime())}));
            } else {
                //ws.send(JSON.stringify({'type': 'player_position', 'id': ID, 'x': x, 'y': y}));
            }
            tick++;
        } else {
            if (wait_ticks <= 0){
                ws.send(JSON.stringify(INIT_MSG));
                wait_ticks = WAIT_TICKS_MAX;
            } else {
                wait_ticks--;
            }
        }
    } else if (ws.readyState === 3){
        return;
    }
}

/* *************************************************************************************************************************************************************/
/* END DRAWING *************************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/
