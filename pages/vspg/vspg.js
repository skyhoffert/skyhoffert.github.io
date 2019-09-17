/*
Sky Hoffert
vspg javascript file.
Last Modified: September 17, 2019
*/

const FPS = 24;
const OBJ_SPEED = 0.015;
const OBJ_LRSPEED = OBJ_SPEED*2;
const OBJ_X_FACTOR = 1000;
const OBJ_SPAWN_CHANCE = 0.2;
const OBJ_SPAWN_PERFRAME = 4;
const OBJ_SPAWN_XRANGE = 8;
const OBJ_SPAWN_YRANGE = -1.5;
const OBJ_SPAWN_SIZE_MIN = 50;
const OBJ_SPAWN_SIZE_MAX = 120;

var keys = []; // Keeps track of player input.
for (let i = 0; i < 1000; i++){ keys.push(false) };

var canvas = document.getElementById("mainCanvas");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
var ctx = canvas.getContext("2d");

class V2{ constructor(x, y){ this.x = x; this.y = y; } }

class Ship
{
    constructor()
    {
        this.scale = 100.0;
        this.x = canvas.width/2;
        this.y = canvas.height - 50;
        this.direction = 1; // straight=0, left=1, right=2
        this.colors = {
            "light": "#ffffff",
            "mid": "#cccccc",
            "dark": "#999999"
        };
        
        this.offsetAngle = Math.PI / 180 * 15; // degrees to radians
        // offsets:
        //   offsets is a two-dimensional array of offsets for drawing the ship to the screen.
        //   It goes like [ [<dir_1> points], [<dir_2> points], ... ]
        //     where each <dir_n> is the points to be drawn when n = direction.
        //   Note that every value for each V2 is to be multiplied by the scale variable.
        // Points go from top center, clockwise.
        // TODO: this is all ugly... make it pretty!
        this.offsets = [
            [new V2(0, -1), new V2(0.5, 0.1), new V2(0, 0.3), new V2(-0.5, 0.1)],
            [new V2(-Math.sin(this.offsetAngle), -Math.cos(this.offsetAngle)), 
             new V2(0.5 * Math.cos(this.offsetAngle - 0.197), -Math.sin(this.offsetAngle - 0.197)),
             new V2(0.3 * Math.sin(this.offsetAngle), Math.sin(this.offsetAngle)),
             new V2(-0.5 * Math.cos(this.offsetAngle + 0.197), 0.5 * Math.sin(this.offsetAngle + 0.197))],
            [new V2(Math.sin(this.offsetAngle), -Math.cos(this.offsetAngle)), 
             new V2(0.5 * Math.cos(this.offsetAngle - 0.197), 0.5 * Math.sin(this.offsetAngle + 0.197)),
             new V2(-0.3 * Math.sin(this.offsetAngle), Math.sin(this.offsetAngle)),
             new V2(-0.5 * Math.cos(this.offsetAngle + 0.197), -Math.sin(this.offsetAngle - 0.197))],
        ];
        
    }
    
    Draw()
    {
        // Determine ship direction based of input keys.
        if (keys[65]){ this.direction = 1; }
        else if (keys[68]){ this.direction = 2; }
        else { this.direction = 0; }
        
        const offs = this.offsets[this.direction];
        
        ctx.fillStyle = this.colors.mid;
        ctx.beginPath();
        ctx.moveTo(this.x + offs[0].x * this.scale, this.y + offs[0].y * this.scale);
        ctx.lineTo(this.x + offs[1].x * this.scale, this.y + offs[1].y * this.scale);
        ctx.lineTo(this.x, this.y);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = this.colors.dark;
        ctx.beginPath();
        ctx.moveTo(this.x + offs[1].x * this.scale, this.y + offs[1].y * this.scale);
        ctx.lineTo(this.x + offs[2].x * this.scale, this.y + offs[2].y * this.scale);
        ctx.lineTo(this.x + offs[3].x * this.scale, this.y + offs[3].y * this.scale);
        ctx.lineTo(this.x, this.y);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = this.colors.light;
        ctx.beginPath();
        ctx.moveTo(this.x + offs[3].x * this.scale, this.y + offs[3].y * this.scale);
        ctx.lineTo(this.x + offs[0].x * this.scale, this.y + offs[0].y * this.scale);
        ctx.lineTo(this.x, this.y);
        ctx.closePath();
        ctx.fill();
        
        /* DEBUG *
        ctx.strokeStyle = "#ff0000";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.scale/2, 0, 2*Math.PI);
        ctx.closePath();
        ctx.stroke();
        /* */
    }
}

class Asteroid
{
    constructor(x, y, s)
    {
        this.x = x;
        this.y = y;
        this.trueSize = s;
        this.active = true;
    }
    
    Draw()
    {
        if (this.active && this.y > 0 && InSensor(this))
        {
            ctx.fillStyle = "#cccccc";
            ctx.beginPath();
            ctx.arc(canvas.width/2 + (this.x * this.y**3 * OBJ_X_FACTOR), 
                canvas.height*3/4 * this.y**3 + canvas.height/4, 
                this.trueSize * this.y**3, 
                0, 2*Math.PI);
            ctx.closePath();
            ctx.fill();
        }
    }
}

var playerShip = new Ship();

var objects = [];

var score = 0;
var lastScoreUpdate = Date.now();

var objSpawnPerFrameAdd = 0;
var objSpawnChanceAdd = 0.0;

var localHighScore = 0;

objects.push(new Asteroid(0, -1, 100));
objects.push(new Asteroid(0.5, -1.5, 100));

function DrawStage()
{
    ctx.strokeStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(canvas.width*1/32, canvas.height);
    ctx.lineTo(canvas.width*15/32, canvas.height/4);
    ctx.lineTo(canvas.width*17/32, canvas.height/4);
    ctx.lineTo(canvas.width*31/32, canvas.height);
    ctx.closePath();
    ctx.stroke();
    
    for (let i = 0; i < objects.length; i++)
    {
        objects[i].Draw();
    }
}

function DrawUI()
{
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(canvas.width*1/32-1, canvas.height);
    ctx.lineTo(canvas.width*15/32-1, canvas.height/4);
    ctx.lineTo(canvas.width*15/32-1, 0);
    ctx.lineTo(0,0);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(canvas.width, 0);
    ctx.lineTo(canvas.width*17/32+1, 0);
    ctx.lineTo(canvas.width*17/32+1, canvas.height/4);
    ctx.lineTo(canvas.width*31/32+1, canvas.height);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "48px Verdana";
    let txtlen = (""+score).length;
    let outstr = "";
    for (let i = 0; i < 5-txtlen; i++)
    {
        outstr += "0";
    }
    outstr += ""+score;
    ctx.fillText(outstr, 20, 50);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "48px Verdana";
    txtlen = (""+localHighScore).length;
    outstr = "";
    for (let i = 0; i < 5-txtlen; i++)
    {
        outstr += "0";
    }
    outstr += ""+localHighScore;
    ctx.fillText(outstr, 20, 100);
}

function MoveObjects()
{
    for (let i = 0; i < objects.length; i++)
    {
        if (objects[i].active)
        {
            objects[i].y += OBJ_SPEED;
            
            if (playerShip.direction == 1)
            {
                objects[i].x += OBJ_LRSPEED;
            }
            else if (playerShip.direction == 2)
            {
                objects[i].x -= OBJ_LRSPEED;
            }
            
            if (objects[i].y - 0.2 > 1)
            {
                objects[i].active = false;
            }
        }
    }
}

function Collision()
{
    let numdead = 0;
    let lastActive = false;
    
    for (let i = 0; i < objects.length; i++)
    {
        if (!lastActive)
        {
            lastActive = objects[i].active;
            numdead = lastActive ? numdead : i;
        }
        
        if (objects[i].active && objects[i].y > 0 && objects[i].y < 0.98)
        {
            let dist = Math.sqrt(objects[i].x**2 + (objects[i].y - 0.98)**2);
                
            if (dist < 0.1)
            {
                EndGame();
                
                return;
            }
        }
    }
    
    if (numdead > 100)
    {
        objects.splice(0,numdead);
    }
}

function SpawnObjects()
{
    for (let i = 0; i < OBJ_SPAWN_PERFRAME; i++)
    {
        if (Math.random() < OBJ_SPAWN_CHANCE)
        {
            objects.push(new Asteroid(OBJ_SPAWN_XRANGE * Math.random() - OBJ_SPAWN_XRANGE/2,
                OBJ_SPAWN_YRANGE * Math.random(), 
                Math.random() * (OBJ_SPAWN_SIZE_MAX - OBJ_SPAWN_SIZE_MIN)+ OBJ_SPAWN_SIZE_MIN));
        }
    }
}

/*
obj must have obj.x and obj.y members!
*/
function InSensor(obj)
{
    // TODO: fine tune bound
    return true;
    return Math.abs(obj.x) < 1;
}

function UpdateScore()
{
    if (Date.now() - lastScoreUpdate > 1000)
    {
        score += 1;
        lastScoreUpdate = Date.now();
    }
    
    objSpawnChanceAdd = score/1000;
    objSpawnPerFrameAdd = score/100;
}

function EndGame()
{
    if (score > localHighScore)
    {
        localHighScore = score;
    }
    
    objects = [];
    score = 0;
}

function Update()
{
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    DrawStage();
    
    playerShip.Draw();
    
    MoveObjects();
    
    Collision();
    
    SpawnObjects();
    
    DrawUI();
    
    UpdateScore();
}

setInterval(Update, 1000/FPS);

document.addEventListener("keydown", function (evt)
{
    keys[evt.keyCode] = true;
}, false);

document.addEventListener("keyup", function (evt)
{
    keys[evt.keyCode] = false;
}, false);

document.addEventListener("touchstart", function (evt)
{
    if (evt.targetTouches[0].screenX > canvas.width/2)
    {
        keys[68] = true;
    }
    else
    {
        keys[65] = true;
    }
}, false);

document.addEventListener("touchend", function (evt)
{
    keys[65] = false;
    keys[68] = false;
}, false);
