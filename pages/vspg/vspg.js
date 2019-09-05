/*
Sky Hoffert
vspg javascript file.
Last Modified: September 5, 2019
*/

const FPS = 24;

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
        
        // offsets:
        //   offsets is a two-dimensional array of offsets for drawing the ship to the screen.
        //   It goes like [ [<dir_1> points], [<dir_2> points], ... ]
        //     where each <dir_n> is the points to be drawn when n = direction.
        //   Note that every value for each V2 is to be multiplied by the scale variable.
        // Points go from top center, clockwise.
        this.offsetAngle = Math.PI / 180 * 15; // degrees to radians
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
    }
}

var playerShip = new Ship();

playerShip.Draw();

function Update()
{
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    playerShip.Draw();
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
