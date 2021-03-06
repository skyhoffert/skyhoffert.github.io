/*
Backend for tag.
*/

const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 5016 });

//               red        green      blue       yellow     cyan       violet     orange
const COLORS = ["#d41919", "#66de78", "#658deb", "#dbcd32", "#52e3e1", "#9655e6", "#f2b424"];
const NAMES_1 = ["Super", "Giant", "Light", "Funny", "Dank", "Yummy", "Quick", "Vivacious", 
    "Rapid", "Lucky", "Sexy", "Lit", "Sweet", "Ugly"];
const NAMES_2 = ["Beaver", "Dude", "Squirrel", "Otter", "Rat", "Ball", "Oval", "Sphere", "Owl",
    "Cat", "Lobster", "Crab", "Whale", "Ape"];

const PORTAL_TIMER = 5000;
const PORTAL_CHANCE = 0.5;
const FASTFALL_CD = 1200;
const DOUBLEJUMP_CD = 3000;

function Dist(x, y, xx, yy) {
    return Math.sqrt(Math.pow(x - xx, 2) + Math.pow(y - yy, 2));
}

var nClients = 0;
var players = [];
var cleanPlayers = [];
var gameWidth = 720;
var gameHeight = 720;
var updateRate = 30;
var numIt = [];
var portalCheckTimer = PORTAL_TIMER;

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

var others = [];
var mvwall = {type:"mvwall", x:gameWidth/3, y:gameHeight*5/8 + 30, width:60, height:20, 
    right:true, speed:0.05};
var portal = {type: "portal", x:gameWidth/6, y:gameHeight/6, r:20, active:false, 
    x2:gameWidth*5/6, y2:gameHeight*5/6};
others.push(mvwall);
others.push(portal);

var newChatsTBD = [];

wss.on("connection", function connection(ws) {
    ws.on("message", function incoming(message) {
        let obj = JSON.parse(message);

        switch (obj.type) {
            case "connect":
                let c = COLORS[Math.floor(Math.random()*(COLORS.length))];
                let n = NAMES_1[Math.floor(Math.random()*NAMES_1.length)] + " " +
                    NAMES_2[Math.floor(Math.random() * NAMES_2.length)];
                ws.send(JSON.stringify({type:"connected", clientNum:nClients, walls:walls,
                    color:c, name:n}));
                players[nClients] = {active:true, x:gameWidth/2, y:gameHeight/2, r:8, color:c,
                    ws:ws, keys:{}, speed:0.02, grav:0.01, vx:0, vy:0, maxVx:10, maxVy:10, 
                    collisions:{}, jumpSpeed:-6, hasJump:false, jFrame:0, jHold:true, it:false,
                    name:n, newChats:["Server: Welcome!"], chatDown:false, actionDown:false, 
                    fastFallCd:0, fastFalling:false, doubleJumpCd:0};
		        cleanPlayers[nClients] = {active:true, x:players[nClients].x, y:players[nClients].y,
                    r:players[nClients].r, color:players[nClients].color, it:false, name:n,
                    hasFastFall:true, hasDoubleJump:true};
                nClients++;
		        console.log("Connect " + (nClients-1));
                break;
            case "disconnect":
                console.log("Disconnect " + obj.clientNum);
                if (numIt.includes(obj.clientNum)) {
                    numIt.splice(numIt.indexOf(obj.clientNum), 1);
                }
                if (players[obj.clientNum]) {
                    players[obj.clientNum] = {active:false};
                    cleanPlayers[obj.clientNum] = {active:false};
                }
                break;
            case "tick":
                if (players[obj.clientNum]){
                    ws.send(JSON.stringify({type:"tock", timeSent:obj.timeSent, players:cleanPlayers,
                        numIt:numIt, others:others, newChats:players[obj.clientNum].newChats}));
                    players[obj.clientNum].keys = obj.keys;
                    players[obj.clientNum].newChats = [];
                }
                break;
            default:
                console.log("Unknown message type.");
                console.log(obj);
                break;
        };
    });

    ws.on("close", function close() {
    })
});

function Reset() {
    players = [];
    cleanPlayers = [];
    nClients = 0;
    numIt = [];
    return;
}

var prevTime = Date.now();

function Update() {
    let now = Date.now();
    let dT = now - prevTime;
    prevTime = now;
    
    // Move the moving wall in the center of the arena.
    if (mvwall.right) {
        if (mvwall.x > gameWidth*2/3) {
            mvwall.right = false;
        }
    } else {
        if (mvwall.x < gameWidth/3) {
            mvwall.right = true;
        }
    }
    mvwall.x += mvwall.right ? mvwall.speed * dT : -mvwall.speed * dT;
    
    // Check if the portal needs to be checked.
    // Sometimes a portal will be created, sometimes it will be destroyed.
    // When this timer expires, check if the state should be flipped.
    if (portalCheckTimer <= 0) {
        portalCheckTimer = PORTAL_TIMER;
        let r = Math.random();
        if (!portal.active) {
            if (r < PORTAL_CHANCE) {
                let p1 = Math.floor(Math.random() * 2);
                if (p1 === 0) {
                    portal.x = gameWidth/6;
                    portal.y = gameHeight/6;
                    portal.x2 = gameWidth*5/6;
                    portal.y2 = gameHeight*5/6;
                } else {
                    portal.x = gameWidth*5/6;
                    portal.y = gameHeight/6;
                    portal.x2 = gameWidth/6;
                    portal.y2 = gameHeight*5/6;
                }
                portal.active = true;
            }
        } else {
            if (r > PORTAL_CHANCE) {
                portal.active = false;
            }
        }
    } else {
        portalCheckTimer -= dT;
    }

    for (let i=0; i < players.length; i++) {
        if (!players[i].active){ continue; }

        let p = players[i];
        let cp = cleanPlayers[i];

        // Accelerate based on user input.
        if (p.keys["1"] || p.keys["2"]) {
            if (!p.actionDown) {
                p.actionDown = true;
                if (p.keys["1"]) {
                    for (let j = 0; j < numIt.length; j++) {
                        if (players[numIt[i]]) {
                            players[numIt[i]].it = false;
                        }
                    }
                    let tries = 0;
                    numIt = [];
                    let t = Math.round(Math.random() * (nClients-1));
                    while ((!players[t] || !players[t].active) && tries < 50) {
                        tries++;
                        t = Math.round(Math.random() * (nClients-1));
                    }
                    if (players[t] && players[t].active) {
                        players[t].it = true;
                        cleanPlayers[t].it = true;
                        numIt.push(t);
                        console.log("Player " + t + " now it.");
                    }
                } else if (p.keys["2"]) {
                    if (nClients > 0) {
                        Reset();
                        return;
                    }
                }
            }
        } else {
            p.actionDown = false;
            if (p.keys["7"] || p.keys["8"] || p.keys["9"]) {
                if (!p.chatDown) {
                    p.chatDown = true;
                    if (p.keys["7"]) {
                        newChatsTBD.push(""+p.name+": gg");
                    } else if (p.keys["8"]) {
                        newChatsTBD.push(""+p.name+": rip");
                    } else if (p.keys["9"]) {
                        newChatsTBD.push(""+p.name+": ez");
                    }
                }
            } else {
                p.chatDown = false;
            }
        }
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
        if (p.keys["s"]) {
            if (p.fastFallCd <= 0) {
                p.fastFallCd = FASTFALL_CD;
                p.vy = p.maxVy*2;
                p.y += 4;
                p.fastFalling = true;
            }
        } else if (p.keys["w"]) {
            if (p.doubleJumpCd <= 0) {
                p.doubleJumpCd = DOUBLEJUMP_CD;
                p.vy = p.jumpSpeed*5/4;
            }
        }

        if (p.fastFallCd > 0) {
            p.fastFallCd -= dT;
        }
        if (p.doubleJumpCd > 0) {
            p.doubleJumpCd -= dT;
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
        if (!p.fastFalling) {
            p.vy = p.vy > p.maxVy ? p.maxVy : p.vy;
        }

        // Add velocity to position.
        p.x += p.vx;
        if (!p.collisions["b"]) {
            p.y += p.vy;
        }

        // Collision.
        p.collisions["b"] = null;
        p.collisions["l"] = null;
        p.collisions["r"] = null;
        p.collisions["t"] = null;
        for (let j = 0; j < walls.length; j++) {
            let w = walls[j];
            if (p.x > w.x - w.width/2 && p.x < w.x + w.width/2 &&
                p.y + p.r > w.y - w.height/2 && p.y + p.r < w.y + w.height/2) {
                p.collisions["b"] = w;
                p.vy = 0;
                p.y = w.y - w.height/2 - p.r;
                p.hasJump = true;
                p.fastFalling = false;
            } else if (p.x > w.x - w.width/2 && p.x < w.x + w.width/2 &&
                p.y - p.r > w.y - w.height/2 && p.y - p.r < w.y + w.height/2) {
                p.collisions["t"] = w;
                p.vy = 0;
                p.y = w.y + w.height/2 + p.r;
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
            }
        }
        for (let j = 0; j < others.length; j++) {
            if (others[j].type === "mvwall") {
                let w = others[j];
                if (p.x > w.x - w.width/2 && p.x < w.x + w.width/2 &&
                    p.y + p.r > w.y - w.height/2 && p.y + p.r < w.y + w.height/2) {
                    p.collisions["b"] = w;
                    p.vy = 0;
                    p.y = w.y - w.height/2 - p.r;
                    p.hasJump = true;
                    p.fastFalling = false;
                    // Move player along with wall.
                    p.x += mvwall.right ? mvwall.speed*2 * dT : -mvwall.speed*2 * dT;
                } else if (p.x > w.x - w.width/2 && p.x < w.x + w.width/2 &&
                    p.y - p.r > w.y - w.height/2 && p.y - p.r < w.y + w.height/2) {
                    p.collisions["t"] = w;
                    p.vy = 0;
                    p.y = w.y + w.height/2 + p.r;
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
                }
            } else if (others[j].type === "portal" && others[j].active) {
                if (Dist(p.x, p.y, others[j].x, others[j].y) < others[j].r) {
                    p.x = others[j].x2;
                    if (p.vy > 0) {
                                p.y = others[j].y2 + others[j].r + 1;
                    } else {
                    p.y = others[j].y2 - others[j].r - 1;
                    }
                } else if (Dist(p.x, p.y, others[j].x2, others[j].y2) < others[j].r) {
                    p.x = others[j].x;
                    if (p.vy > 0) {
                                p.y = others[j].y + others[j].r + 1;
                    } else {
                    p.y = others[j].y - others[j].r - 1;
                    }
                }
            }
        }

        if (!numIt.includes(i)) {
            for (let j = 0; j < numIt.length; j++) {
                let t = numIt[j];
                if (t !== i) {
                    let d = Dist(p.x, p.y, players[t].x, players[t].y);
                    if (d < p.r*2) {
                        console.log("P " + t + " tagged " + i);
                        numIt.push(i);
                        players[i].it = true;
                    }
                }
            }
        }

        if (p.x > gameWidth || p.x < 0 || p.y > gameHeight || p.y < 0) {
            p.x = gameWidth/2;
            p.y = gameHeight/2;
        }

        cp.x = p.x;
        cp.y = p.y;
        cp.it = p.it;
        cp.hasFastFall = p.fastFallCd <= 0;
        cp.hasDoubleJump = p.doubleJumpCd <= 0;
    }
    
    for (let i = 0; i < players.length; i++) {
        if (players[i].active) {
            for (let j = 0; j < newChatsTBD.length; j++) {
                players[i].newChats.push(newChatsTBD[j]);
            }
        }
    }
    newChatsTBD = [];
}

setInterval(Update, 1000/updateRate);

console.log("Running");
