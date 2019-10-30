/*
Sky Hoffert
blx javascript file.
Last Modified: October 30, 2019
*/

const FPS = 24;
const COLORS = ["red", "blue", "green"];

var keys = []; // Keeps track of player input.
for (let i = 0; i < 1000; i++){ keys.push(false) };

var canvas = document.getElementById("mainCanvas");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
var ctx = canvas.getContext("2d");
var needsUpdate = true;

class V2{ constructor(x, y){ this.x = x; this.y = y; } }

class Block {
    constructor(pos, size) {
        this.pos = pos;
        this.size = size;
        this.color = RandomColor();
    }

    Collision(pt) {
        // DEBUG
        if (this.color === "white") { return; }
        
        if (pt.x > this.pos.x && pt.x < this.pos.x + this.size.x &&
                pt.y > this.pos.y && pt.y < this.pos.y + this.size.y) {
            return true;
        }
    }

    Hit() {
        this.color = "white";
    }

    Draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.pos.x, this.pos.y, this.size.x, this.size.y);
    }
}

class Grid {
    constructor() {
        this.maxWidth = canvas.width*2/3;
        this.maxHeight = canvas.height*2/3;
        this.rowHeight = 40;
        this.colWidth = 40;
        this.nRows = 128;
        this.nCols = 64;
        while (this.nRows*this.rowHeight > this.maxHeight || this.nCols*this.colWidth > this.maxWidth) {
            this.nRows /= 2;
            this.nCols /= 2;
        }
        this.gap = 1;
        this.pos_TL = new V2(canvas.width/2 - this.nCols/2 * this.colWidth - this.gap*this.nCols/2, 
            canvas.height/2 - this.nRows/2*this.rowHeight - this.gap*this.nRows/2);
        this.blocks = [];

        // blocks is 1d array of rows and cols. Organized so that first nCols elements are in the
        //   first column and the next nCols elements are in the second column. That is to say
        //   blocks is indexed column by column from the top down.
        for (let i = 0; i < this.nRows * this.nCols; i++) {
            let r = i % this.nRows;
            let c = Math.floor(i/this.nRows);
            this.blocks[i] = new Block(new V2(this.pos_TL.x + c * this.colWidth + c * this.gap,
                this.pos_TL.y + r * this.rowHeight + r * this.gap),
                new V2(this.colWidth, this.rowHeight));
        }
    }

    Collision(pt) {
        let hB = false;
        let hPos = 0;
        let hClr = "";

        for (let i = 0; i < this.nRows*this.nCols; i++) {
            let hit = this.blocks[i].Collision(pt);
            if (hit) {
                hB = true;
                hPos = i;
                hClr = this.blocks[i].color;
                
                // only one block can be clicked
                break;
            }
        }

        if (!hB) { return; }

        // "Hit" that block continue here after hit
        this.HitRoutine(hPos, hClr, false);

        // Adjust the current blocks
        this.AdjustBlocks();
    }

    HitRoutine(hPos, hClr, hit) {
        if (hit) { this.blocks[hPos].Hit(); }

        let abv = hPos % this.nRows === 0 ? -1 : hPos-1;
        let blw = hPos % this.nRows === this.nRows-1 ? -1 : hPos+1;
        let rgt = Math.floor(hPos / this.nRows) === this.nCols-1 ? -1 : hPos + this.nRows;
        let lft = Math.floor(hPos / this.nRows) === 0 ? -1 : hPos - this.nRows;
        let surround = [abv, blw, rgt, lft];
        let hits = [0, 0, 0, 0];
        for (let i = 0; i < surround.length; i++) {
            let plc = surround[i];
            if (plc !== -1) {
                if (this.blocks[plc].color === hClr) {
                    hits[i] = 1;
                }
            }
        }

        // DO NOT proceed if not at least one adjacent hit
        if (hits[0] + hits[1] + hits[2] + hits[3] < 1) { return; }

        this.blocks[hPos].Hit();
        
        for (let i = 0; i < hits.length; i++) {
            if (hits[i] === 1) {
                this.HitRoutine(surround[i], hClr, true);
            }
        }
    }

    HasWhite() {
        for (let i = 0; i < this.nRows*this.nCols; i++) {
            if (this.blocks[i].color === "white") {
                return true;
            }
        }
        return false;
    }

    AdjustBlocks() {
        while(this.HasWhite()) {
            for (let i = 0; i < this.nRows*this.nCols; i++) {
                if (this.blocks[i].color === "white") {
                    for (let j = i; j > Math.floor(i / this.nRows)*this.nRows; j--) {
                        this.blocks[j].color = this.blocks[j-1].color;
                    }
                    this.blocks[Math.floor(i / this.nRows)*this.nRows].color = RandomColor();

                    break;
                }
            }
        }
    }

    Draw() {
        for (let i = 0; i < this.nRows*this.nCols; i++) {
                this.blocks[i].Draw();
        }
    }
}

// Variables

var grid = new Grid();

// Functions

function RandomColor() {
    return COLORS[Math.floor(Math.random()*COLORS.length)];
}

function DrawStage() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    grid.Draw();
}

function DrawUI() {
}


function Update() {
    if (!needsUpdate) { return; }

    DrawStage();
    
    DrawUI();

    needsUpdate = false;
}

setInterval(Update, 1000/FPS);

function Click(x, y) {
    grid.Collision(new V2(x, y));

    needsUpdate = true;
}

document.addEventListener("keydown", function (evt) {
    keys[evt.keyCode] = true;
}, false);

document.addEventListener("keyup", function (evt) {
    keys[evt.keyCode] = false;
}, false);

document.addEventListener("mousedown", function (evt) {
    Click(evt.clientX, evt.clientY);
}, false);

/*
document.addEventListener("touchstart", function (evt) {
    Click(evt.targetTouches[0].clientX, evt.targetTouches[0].clientY);
}, false);
*/

document.addEventListener("touchend", function (evt) {
}, false);
