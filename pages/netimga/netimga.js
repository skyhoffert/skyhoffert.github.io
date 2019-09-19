/*
Sky Hoffert
August 28, 2019
*/

var g = {
    gameWidth: 128,
    gameHeight: 128,
    frameRate: 24,
    previousUpdate: 0.0,
    previousFrame: 0.0,
    now: 0.0,
    canvas: document.getElementById("mainCanvas"),
    ctx: null,
    pixelScale: 1,
    bgColor: "#151515",
    stage: {},
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    offX: 0.0,
    offY: 0.0,
    ws: null,
    wsConnected: false,
    frameCounter: 0,
    clientNum: -1,
    ip: "100.16.230.232",
    port: "5019"
};

var canvasSize = window.innerWidth < window.innerHeight ? window.innerWidth : window.innerHeight;
canvasSize = 32 * Math.floor(canvasSize / 32);
g.canvas.style.width = "" + canvasSize + "px";
g.canvas.style.height = "" + canvasSize + "px";
g.canvas.width = canvasSize;
g.canvas.height = canvasSize;
g.pixelScale = canvasSize / g.gameWidth;

g.ctx = g.canvas.getContext("2d");

g.stage = {
    "ships": [],
    "stars": []
};

g.ws = new WebSocket("ws://"+g.ip+":"+g.port);

g.ws.addEventListener("open", function (event)
{
    g.ws.send(JSON.stringify({"type": "connect"}));
});

g.ws.onmessage = function (message)
{
    let obj = JSON.parse(message.data);
    
    switch (obj.type)
    {
        case "connected":
            g.wsConnected = true;
            g.clientNum = obj.clientNum;
            console.log("Successfully connected as client " + g.clientNum + ".");
            g.ws.send(JSON.stringify({"type": "getStars"}));
            break;
        case "tock":
            if (g.frameCounter % g.frameRate == 0)
            {
                console.log("Ping: " + (Date.now() - obj.timeSent) + " ms");
            }
            g.stage.ships = obj.players;
            g.offX = obj.players[g.clientNum].x - g.gameWidth/2;
            g.offY = obj.players[g.clientNum].y - g.gameHeight/2;
            break;
        case "giveStars":
            g.stage.stars = obj.stars;
            console.log("Updated stars.");
            break;
        default:
            console.log("Unknown message type.");
            console.log(obj);
            break;
    }
};

window.onbeforeunload = function ()
{
    g.ws.send(JSON.stringify({"type": "disconnect", "clientNum": g.clientNum}));
}

g.canvas.onmousemove = function (evt)
{
    g.mouseX = Math.round(evt.x);
    g.mouseY = Math.round(evt.y);
}

g.canvas.onmousedown = function (evt)
{
    g.mouseDown = evt.button == 0 ? true : false;
}

g.canvas.onmouseup = function (evt)
{
    g.mouseDown = evt.button == 0 ? false : true;
}

function DrawStars()
{
    for (let i=0; i < g.stage.stars.length; i++)
    {
        if (g.stage.stars[i].x - g.offX/2 < 0 || g.stage.stars[i].x - g.offX/2 > g.gameWidth ||
            g.stage.stars[i].y - g.offY/2 < 0 || g.stage.stars[i].y - g.offY/2 > g.gameHeight)
        {
            continue;
        }
        
        g.ctx.fillStyle = "white";
        g.ctx.fillRect(Math.round(g.stage.stars[i].x - g.offX/2 - g.stage.stars[i].size/2) * g.pixelScale, 
            Math.round(g.stage.stars[i].y - g.offY/2 - g.stage.stars[i].size/2) * g.pixelScale,
            g.stage.stars[i].size * g.pixelScale, g.stage.stars[i].size * g.pixelScale);
    }
}

function DrawShips()
{
    for (let i=0; i < g.stage.ships.length; i++)
    {
        if (g.stage.ships[i].x - g.offX < 0 || g.stage.ships[i].x - g.offX > g.gameWidth ||
            g.stage.ships[i].y - g.offY < 0 || g.stage.ships[i].y - g.offY > g.gameHeight)
        {
            continue;
        }
        
        g.ctx.strokeStyle = "white";
        g.ctx.beginPath();
        g.ctx.moveTo((g.stage.ships[i].x - g.offX + g.stage.ships[i].size * Math.cos(g.stage.ships[i].rot)) * g.pixelScale,
            (g.stage.ships[i].y - g.offY - g.stage.ships[i].size * Math.sin(g.stage.ships[i].rot)) * g.pixelScale);
        g.ctx.lineTo((g.stage.ships[i].x - g.offX + g.stage.ships[i].size * Math.cos(g.stage.ships[i].rot + Math.PI*3/4)) * g.pixelScale,
            (g.stage.ships[i].y - g.offY - g.stage.ships[i].size * Math.sin(g.stage.ships[i].rot + Math.PI*3/4)) * g.pixelScale);
        g.ctx.lineTo((g.stage.ships[i].x - g.offX + g.stage.ships[i].size * Math.cos(g.stage.ships[i].rot - Math.PI*3/4)) * g.pixelScale,
            (g.stage.ships[i].y - g.offY - g.stage.ships[i].size * Math.sin(g.stage.ships[i].rot - Math.PI*3/4)) * g.pixelScale);
        g.ctx.closePath();
        g.ctx.fill();
    }
}

function Render()
{
    g.ctx.fillStyle = g.bgColor;
    g.ctx.fillRect(0, 0, canvasSize, canvasSize);
    
    if (g.wsConnected)
    {
        g.ws.send(JSON.stringify({
            "type":"tick",
            "timeSent": Date.now(),
            "mouseX": Math.round(g.mouseX / canvasSize * g.gameWidth),
            "mouseY": Math.round(g.mouseY / canvasSize * g.gameHeight),
            "mouseDown": g.mouseDown,
            "clientNum": g.clientNum
        }));
    }
    
    DrawStars();
    DrawShips();
    
    g.frameCounter++;
}

setInterval(Render, 1000/g.frameRate);
