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
const BALL_SPEED = 7;

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

var IP = 'localhost';
//var IP = '35.171.151.27';
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

// grab the canvas from the html document and set things for it
var canvas = document.getElementById("main_canvas");
canvas.width = WIDTH;
canvas.height = HEIGHT;
var ctx = canvas.getContext("2d");

var players = {};

var ball = {};

var walls = [];

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
        ws.send(JSON.stringify(key_msg(e.keyCode, true)));
    }
}

document.body.onkeyup = function(e){
    if (ID != -1){
        ws.send(JSON.stringify(key_msg(e.keyCode, false)));
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

    network();
}

function draw_players(){
    for (let i = 0; i < Object.keys(players).length; i++){
        ctx.beginPath();
        ctx.fillStyle = PLAYER_COLOR;
        ctx.arc(players[Object.keys(players)[i]].x, players[Object.keys(players)[i]].y, PLAYER_SIZE/2, 0, 2*Math.PI);
        ctx.fill();
        ctx.closePath();
    }
}

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
            ws.send(JSON.stringify(INIT_MSG));
        }
    } else if (ws.readyState === 3){
        return;
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

/* *************************************************************************************************************************************************************/
/* END DRAWING *************************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/
