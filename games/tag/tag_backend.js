/*
Backend for tag.
*/

const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 5016 });

var nClients = 0;
var players = [];
var cleanPlayers = [];
var gameWidth = 720;
var gameHeight = 720;
var updateRate = 30;

var walls = [];
walls.push({x:gameWidth/2, y:gameHeight-10, width:gameWidth, height:20});
walls.push({x:10, y:gameHeight/2, width:20, height:gameHeight});
walls.push({x:gameWidth-10, y:gameHeight/2, width:20, height:gameHeight});
walls.push({x:gameWidth/2, y:10, width:gameWidth, height:20});

walls.push({x:gameWidth/2, y:gameHeight-40, width:20, height:40});
walls.push({x:gameWidth/2, y:gameHeight*3/4, width:gameWidth/3, height:20});
walls.push({x:gameWidth/2, y:gameHeight/3, width:gameWidth/2, height:20});
walls.push({x:40, y:gameHeight/2, width:40, height:20});
walls.push({x:gameWidth-40, y:gameHeight/2, width:40, height:20});

wss.on("connection", function connection(ws) {
    ws.on("message", function incoming(message) {
        let obj = JSON.parse(message);

        switch (obj.type) {
            case "connect":
                ws.send(JSON.stringify({type:"connected", clientNum:nClients, walls:walls}));
                players[nClients] = {active:true, x:gameWidth/2, y:gameHeight/2, r:8, color:"red",
                    ws:ws, keys:{}, speed:0.02, grav:0.01, vx:0, vy:0, maxVx:10, maxVy:10, 
                    collisions:{}, jumpSpeed:-6, hasJump:false, jFrame:0, jHold:true};
		cleanPlayers[nClients] = {active:true, x:players[nClients].x, y:players[nClients].y,
		    r:players[nClients].r, color:players[nClients].color};
                nClients++;
		console.log("Connect " + (nClients-1));
                break;
            case "disconnect":
		console.log("Disconnect " + obj.clientNum);
                players[obj.clientNum].active = false;
		cleanPlayers[obj.clientNum].active = false;
                break;
            case "tick":
                ws.send(JSON.stringify({"type": "tock", "timeSent": obj.timeSent}));
                players[obj.clientNum].keys = obj.keys;
                break;
            default:
                console.log("Unknown message type.");
                console.log(obj);
                break;
        }
    });

    ws.on("close", function close() {
    })
});

var prevTime = Date.now();

function Update() {
    let now = Date.now();
    let dT = now - prevTime;
    prevTime = now;

    for (let i=0; i < players.length; i++) {
        if (!players[i].active){ continue; }

        let p = players[i];
	let cp = cleanPlayers[i];

        // Accelerate based on user input.
        if (p.keys["a"]) {
            if (!p.collisions["l"]) {
                p.vx -= p.speed * dT;
                p.vx = p.vx > p.maxVx ? p.maxVx : p.vx;
                p.vx = p.vx < -p.maxVx ? -p.maxVx : p.vx;
                p.collisions["r"] = null;
            }
        } else if (p.keys["d"]) {
            if (!p.collisions["r"]) {
                p.vx += p.speed * dT;
                p.vx = p.vx > p.maxVx ? p.maxVx : p.vx;
                p.vx = p.vx < -p.maxVx ? -p.maxVx : p.vx;
                p.collisions["l"] = null;
            }
        } else {
            let s = p.speed * dT * Math.sign(p.vx);
            p.vx = Math.sign(p.vx - s) !== Math.sign(p.vx) ? 0 : p.vx - s;
        }

        // Gravity.
        if (p.keys[" "]) {
            if (p.hasJump) {
                p.jFrame = 0;
                p.vy = p.jumpSpeed;
                p.hasJump = false;
                p.jHold = true;
            } else {
                if (p.jHold && p.jFrame < 2) {
                    p.jFrame++;
                    p.vy = p.jumpSpeed * p.jFrame;
                } else {
                    p.jHold = false;
                }
            }
        } else {
            p.jHold = false;
        }
        if (!p.jHold) {
            p.vy += p.grav * dT;
        }
        p.vy = p.vy > p.maxVy ? p.maxVy : p.vy;

        // Add velocity to position.
        p.x += p.vx;
        if (!p.collisions["c"]) {
            p.y += p.vy;
        }

        // Collision.
        p.collisions["c"] = null;
        p.collisions["l"] = null;
        p.collisions["r"] = null;
        p.collisions["t"] = null;
        for (let j = 0; j < walls.length; j++) {
            let w = walls[j];
            if (p.x > w.x - w.width/2 && p.x < w.x + w.width/2 &&
                p.y + p.r > w.y - w.height/2 && p.y + p.r < w.y + w.height/2) {
                p.collisions["c"] = w;
                p.vy = 0;
                p.y = w.y - w.height/2 - p.r;
                p.hasJump = true;
            } else if (p.x - p.r > w.x - w.width/2 && p.x - p.r < w.x + w.width/2 &&
                p.y > w.y - w.height/2 && p.y < w.y + w.height/2) {
                p.collisions["l"] = w;
                p.vx = 0;
                p.x = w.x + w.width/2 + p.r;
            } else if (p.x + p.r > w.x - w.width/2 && p.x + p.r < w.x + w.width/2 &&
                p.y > w.y - w.height/2 && p.y < w.y + w.height/2) {
                p.collisions["r"] = w;
                p.vx = 0;
                p.x = w.x - w.width/2 - p.r;
            } else if (p.x > w.x - w.width/2 && p.x < w.x + w.width/2 &&
                p.y - p.r > w.y - w.height/2 && p.y - p.r < w.y + w.height/2) {
                p.collisions["t"] = w;
                p.vy = 0;
                p.y = w.y + w.height/2 + p.r;
            }
        }
	if (p.x > gameWidth || p.x < 0 || p.y > gameHeight || p.y < 0) {
	    p.x = gameWidth/2;
	    p.y = gameHeight/2;
	}

	// Cheat Codes!
	if (p.keys["0"]) {
	    p.x = gameWidth/2;
	    p.y = gameHeight/2;
	}

	cp.x = p.x;
	cp.y = p.y;

        p.ws.send(JSON.stringify({"type": "tick", "players": cleanPlayers}));
    }
}

setInterval(Update, 1000/updateRate);

console.log("Running");

