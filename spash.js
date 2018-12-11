// Sky Hoffert
// December 4, 2018

/* *************************************************************************************************************************************************************/
/* BEGIN CONSTANTS *********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

const UPDATE_RATE = 1000/60;

const CODE_A = 65;
const CODE_D = 68;
const CODE_W = 87;
const CODE_S = 83;
const CODE_SPACE = 32;
const CODE_MOUSEDOWN = 1000;

const HEALTH_BAR_HEIGHT = 8;

const ZOOM_FACTOR = 0.1;
const MOUSE_MOVE_FACTOR = 1.0;

const AI_ANIM_IMGS = [];
let img = new Image();
img.src = 'gfx/enemy_basic_1.png';
AI_ANIM_IMGS.push(img);
img = new Image();
img.src = 'gfx/enemy_basic_2.png';
AI_ANIM_IMGS.push(img);

/* *************************************************************************************************************************************************************/
/* END CONSTANTS ***********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

/* *************************************************************************************************************************************************************/
/* BEGIN WEB SOCKET ********************************************************************************************************************************************/
/* *************************************************************************************************************************************************************/

var IP = 'localhost';
//var IP = '54.163.147.47';
var PORT = '5200';

var ping = 999;

var ws = new WebSocket('ws://' + IP + ':' + PORT);

var ID = -1;

const INIT_MSG = {
    'type': 'connect',
};

function mouse_msg(x, y){
    return {
        'type': 'mouse',
        'id': ID,
        'x': x,
        'y': y
    }
}

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
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
var ctx = canvas.getContext("2d");

// camera variables
var zoom = 1.0;
var offset_x = 0.0;
var offset_y = 0.0;
var lmousedown = false;
var lmouselastx = 0;
var lmouselasty = 0;

// game entities
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

    lmousedown = true;
    lmouselastx = evt.x;
    lmouselasty = evt.y;
}, false);

canvas.addEventListener('mousemove', function(evt){
    if (ID != -1){
        if (ws.readyState === 1){
            ws.send(JSON.stringify(mouse_msg((evt.x - canvas.offsetLeft - offset_x) / zoom, (evt.y - canvas.offsetTop - offset_y) / zoom)));
        }
    }

    if (lmousedown){
        offset_x += (evt.x - lmouselastx) * MOUSE_MOVE_FACTOR;
        offset_y += (evt.y - lmouselasty) * MOUSE_MOVE_FACTOR;
        lmouselastx = evt.x;
        lmouselasty = evt.y;
    }
}, false);

canvas.addEventListener('mouseup', function(evt) {
    if (ID != -1){
        if (ws.readyState === 1){
            ws.send(JSON.stringify(key_msg(CODE_MOUSEDOWN, false)));
        }
    }

    lmousedown = false;
}, false);

canvas.addEventListener('mousewheel', function(evt) {
    var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));
    if (delta < 0){
        zoom *= (1-ZOOM_FACTOR);
    } else {
        zoom *= (1+ZOOM_FACTOR);
    }
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
    ctx.fillStyle = "#aaaaaa";
    ctx.fillRect(0, 0, 60, 24);
    if (ping < 20){
        ctx.fillStyle = '#028532';
    } else if (ping < 80){
        ctx.fillStyle = '#d4d402';
    } else {
        ctx.fillStyle = 'red';
    }
    ctx.fillText('' + ping + ' ms', 4, 20);
}

function draw_players(){
    for (let i = 0; i < Object.keys(players).length; i++){
        let ent = players[Object.keys(players)[i]];
        if (ent.is_ai){
            ctx.save();
            ctx.translate(ent.x * zoom + offset_x, ent.y * zoom + offset_y);
            ctx.rotate(-ent.angle+Math.PI/2);
            if (!ent.keys[CODE_W]){
                ctx.drawImage(AI_ANIM_IMGS[0], -ent.width/2 * zoom, -ent.height/2 * zoom, ent.width * zoom, ent.height * zoom);
            } else {
                ctx.drawImage(AI_ANIM_IMGS[1], -ent.width/2 * zoom, -ent.height/2 * zoom, ent.width * zoom, ent.height * zoom);
            }
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.fillStyle = ent.color;
            ctx.moveTo(ent.x * zoom + ent.width/2 * Math.cos(ent.angle) * zoom + offset_x, ent.y * zoom - ent.height/2 * Math.sin(ent.angle) * zoom + offset_y);
            ctx.lineTo(ent.x * zoom + ent.width/2 * Math.cos(ent.angle+Math.PI*5/4) * zoom + offset_x, ent.y * zoom - ent.height/2 * Math.sin(ent.angle+Math.PI*5/4) * zoom + offset_y);
            ctx.lineTo(ent.x * zoom + ent.width/2 * Math.cos(ent.angle+Math.PI*3/4) * zoom + offset_x, ent.y * zoom - ent.height/2 * Math.sin(ent.angle+Math.PI*3/4) * zoom + offset_y);
            ctx.fill();
            ctx.closePath();

            if (ent.alive){
                if (ent.keys[CODE_W]){
                    ctx.beginPath();
                    ctx.fillStyle = 'red';
                    ctx.moveTo(ent.x * zoom + ent.width/2 * Math.cos(ent.angle+Math.PI*7/8) + offset_x, ent.y * zoom - ent.height/3 * Math.sin(ent.angle+Math.PI*7/8) + offset_y);
                    ctx.lineTo(ent.x * zoom + ent.width*5/8 * Math.cos(ent.angle+Math.PI) + offset_x, ent.y * zoom - ent.height/2 * Math.sin(ent.angle+Math.PI) + offset_y);
                    ctx.lineTo(ent.x * zoom + ent.width/2 * Math.cos(ent.angle+Math.PI*9/8) + offset_x, ent.y * zoom - ent.height/3 * Math.sin(ent.angle+Math.PI*9/8) + offset_y);
                    ctx.fill();
                    ctx.closePath();
                }

                if (ent.keys[CODE_MOUSEDOWN]){
                    ctx.beginPath();
                    ctx.fillStyle = 'blue';
                    ctx.moveTo(ent.x * zoom - ent.width/2 * Math.cos(ent.angle+Math.PI*7/8) + offset_x, ent.y * zoom + ent.height/3 * Math.sin(ent.angle+Math.PI*7/8) + offset_y);
                    ctx.lineTo(ent.x * zoom - ent.width*5/8 * Math.cos(ent.angle+Math.PI) + offset_x, ent.y * zoom + ent.height/2 * Math.sin(ent.angle+Math.PI) + offset_y);
                    ctx.lineTo(ent.x * zoom - ent.width/2 * Math.cos(ent.angle+Math.PI*9/8) + offset_x, ent.y * zoom + ent.height/3 * Math.sin(ent.angle+Math.PI*9/8) + offset_y);
                    ctx.fill();
                    ctx.closePath();
                }
            }
        }

        ctx.beginPath();
        ctx.fillStyle = 'red';
        ctx.fillRect(ent.x * zoom - ent.width/2 * zoom + offset_x, ent.y * zoom - ent.height * zoom + offset_y, ent.width * zoom, HEALTH_BAR_HEIGHT * zoom);
        ctx.fill();
        ctx.closePath();

        if (ent.alive){
            ctx.beginPath();
            ctx.fillStyle = 'green';
            ctx.fillRect(ent.x * zoom - ent.width/2 * zoom + offset_x, ent.y * zoom - ent.height * zoom + offset_y, ent.width * zoom * ent.health/ent.health_max, HEALTH_BAR_HEIGHT * zoom);
            ctx.fill();
            ctx.closePath();
        }
    }
}

function draw_bullets(){
    for (let i = 0; i < bullets.length; i++){
        ctx.beginPath();
        ctx.fillStyle = bullets[i].color;
        ctx.arc(bullets[i].x * zoom + offset_x, bullets[i].y * zoom + offset_y, bullets[i].width/2 * zoom, 0, 2*Math.PI);
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
