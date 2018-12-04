// Sky Hoffert
// December 4, 2018

/* *************************************************************************************************************************************************************/
/* BEGIN CONSTANTS *********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

const WIDTH = 1600;
const HEIGHT = 900;
const UPDATE_RATE = 1000/60;

const CODE_A = 65;
const CODE_D = 68;
const CODE_W = 87;
const CODE_S = 83;
const CODE_SPACE = 32;
const CODE_MOUSEDOWN = 1000;

const HEALTH_BAR_HEIGHT = 8;

/* *************************************************************************************************************************************************************/
/* END CONSTANTS ***********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

/* *************************************************************************************************************************************************************/
/* BEGIN WEB SOCKET ********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

//var IP = 'localhost';
var IP = '35.171.151.27';
var PORT = '5200';

var ping = 0;

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
            ping = elapsed;

            // DEBUG
            console.log('ping: ' + elapsed + ' ms');
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
            bullets = obj['bullets'];
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

/* *************************************************************************************************************************************************************/
/* BEGIN DRAWING ***********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

// grab the canvas from the html document and set things for it
var canvas = document.getElementById("main_canvas");
canvas.width = WIDTH;
canvas.height = HEIGHT;
var ctx = canvas.getContext("2d");

var players = {};

var bullets = [];

// set frame rate to UPDATE_RATE
setInterval(update, UPDATE_RATE);

canvas.addEventListener('mousedown', function(evt) {
    if (ID != -1){
        if (ws.readyState === 1){
            ws.send(JSON.stringify(key_msg(CODE_MOUSEDOWN, true)));
        }
    }
}, false);

canvas.addEventListener('mousemove', function(evt){
}, false);

canvas.addEventListener('mouseup', function(evt) {
    if (ID != -1){
        if (ws.readyState === 1){
            ws.send(JSON.stringify(key_msg(CODE_MOUSEDOWN, false)));
        }
    }
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
    draw_bullets();

    network();

    // DEBUG
    ctx.font = "16px Cambria";
    ctx.fillStyle = 'black';
    ctx.fillText('ping: ' + ping + ' ms', canvas.width/2, canvas.height/16);
}

function draw_players(){
    for (let i = 0; i < Object.keys(players).length; i++){
        let ent = players[Object.keys(players)[i]];
        ctx.beginPath();
        ctx.fillStyle = ent.color;
        ctx.moveTo(ent.x + ent.width/2 * Math.cos(ent.angle), ent.y - ent.height/2 * Math.sin(ent.angle));
        ctx.lineTo(ent.x + ent.width/2 * Math.cos(ent.angle+Math.PI*5/4), ent.y - ent.height/2 * Math.sin(ent.angle+Math.PI*5/4));
        ctx.lineTo(ent.x + ent.width/2 * Math.cos(ent.angle+Math.PI*3/4), ent.y - ent.height/2 * Math.sin(ent.angle+Math.PI*3/4));
        ctx.fill();
        ctx.closePath();

        if (ent.alive){
            if (ent.keys[CODE_W]){
                ctx.beginPath();
                ctx.fillStyle = 'red';
                ctx.moveTo(ent.x + ent.width/2 * Math.cos(ent.angle+Math.PI*7/8), ent.y - ent.height/3 * Math.sin(ent.angle+Math.PI*7/8));
                ctx.lineTo(ent.x + ent.width*5/8 * Math.cos(ent.angle+Math.PI), ent.y - ent.height/2 * Math.sin(ent.angle+Math.PI));
                ctx.lineTo(ent.x + ent.width/2 * Math.cos(ent.angle+Math.PI*9/8), ent.y - ent.height/3 * Math.sin(ent.angle+Math.PI*9/8));
                ctx.fill();
                ctx.closePath();
            }

            if (ent.keys[CODE_MOUSEDOWN]){
                ctx.beginPath();
                ctx.fillStyle = 'blue';
                ctx.moveTo(ent.x - ent.width/2 * Math.cos(ent.angle+Math.PI*7/8), ent.y + ent.height/3 * Math.sin(ent.angle+Math.PI*7/8));
                ctx.lineTo(ent.x - ent.width*5/8 * Math.cos(ent.angle+Math.PI), ent.y + ent.height/2 * Math.sin(ent.angle+Math.PI));
                ctx.lineTo(ent.x - ent.width/2 * Math.cos(ent.angle+Math.PI*9/8), ent.y + ent.height/3 * Math.sin(ent.angle+Math.PI*9/8));
                ctx.fill();
                ctx.closePath();
            }
        }

        ctx.beginPath();
        ctx.fillStyle = 'red';
        ctx.fillRect(ent.x - ent.width/2, ent.y - ent.height, ent.width, HEALTH_BAR_HEIGHT);
        ctx.fill();
        ctx.closePath();

        if (ent.alive){
            ctx.beginPath();
            ctx.fillStyle = 'green';
            ctx.fillRect(ent.x - ent.width/2, ent.y - ent.height, ent.width*ent.health/ent.health_max, HEALTH_BAR_HEIGHT);
            ctx.fill();
            ctx.closePath();
        }
    }
}

function draw_bullets(){
    for (let i = 0; i < bullets.length; i++){
        ctx.beginPath();
        ctx.fillStyle = bullets[i].color;
        ctx.arc(bullets[i].x, bullets[i].y, bullets[i].width/2, 0, 2*Math.PI);
        ctx.fill();
        ctx.closePath();
    }
}

const WAIT_TICKS_MAX = 10;
var wait_ticks = 0;

function network(){
    if (ws.readyState === 1){
        if (ID != -1){
            if (tick % Number.parseInt(1000/UPDATE_RATE) === 0){
                ws.send(JSON.stringify({'type': 'ping', 'id': ID, 'time': (new Date().getTime())}));
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
