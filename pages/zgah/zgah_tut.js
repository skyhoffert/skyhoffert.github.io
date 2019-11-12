// Sky Hoffert
// zgah tutorial file.
// Last modified November 12, 2019

function DrawTutText(ctx, txt) {
    let w = 400;
    let h = 200;
    let b = 4;
    let x = WIDTH - w*5/8;
    let y = HEIGHT - h*5/8;
    let fsize = 24;
    let words = txt.split(" ");
    let tmptxt = "";
    let tmpidx = 0;

    // Border.
    ctx.fillStyle = "#999999";
    ctx.fillRect(x - (w+b)/2, y - (h+b)/2, w+b, h+b);
    // Rect to be drawn on.
    ctx.fillStyle = "#101010";
    ctx.fillRect(x - w/2, y - h/2, w, h);

    ctx.fillStyle = "white";
    ctx.font = "" + fsize + "px Verdana";
    let it = 2;
    while (tmpidx < words.length) {
        while(ctx.measureText(tmptxt + words[tmpidx]).width < w*5/6) {
            if (tmpidx+1 > words.length) { break; }

            tmptxt += words[tmpidx];
            tmptxt += " ";
            tmpidx++;
        }

        ctx.fillText(tmptxt, x - w/2 + w/12, y - h/2 + it*(fsize+2));

        it++;
        tmptxt = "";
    }
}

var tut_lurkers = [];
var tut_TEXT_TIME = 6000;

tut_lurkers[0] = new Lurker(function (dT) {
    if (this.elapsed > tut_TEXT_TIME) {
        lurkers.push(tut_lurkers[1]);
        return false;
    }
    return true;
}, function (ctx) {
    DrawTutText(ctx, "Welcome to zgah! You will now learn the game mechanics. Press the \"/\" key\
 at any time during the tutorial to skip.");
});

tut_lurkers[1] = new Lurker(function (dT) {
    let x = WIDTH/4;
    let y = HEIGHT*3/4;
    let ow = 60;
    let iw = 40;

    if (Distance(x, y, mouse.x, mouse.y) < iw/2) {
        playerShip.canTurn = true;
        lurkers.push(tut_lurkers[2]);
        return false;
    }

    return true;
}, function (ctx) {
    DrawTutText(ctx, "You need to steer your ship by moving the cursor. Try moving it to the blue \
 target in the bottom left.");

    let x = WIDTH/4;
    let y = HEIGHT*3/4;
    let ow = 60;
    let iw = 40;

    ctx.strokeStyle = "#3333aa";

    // Outer Circle.
    ctx.beginPath();
    ctx.arc(x, y, ow, 0, 2*Math.PI);
    ctx.closePath();
    ctx.stroke();

    // Inner Circle.
    ctx.beginPath();
    ctx.arc(x, y, iw, 0, 2*Math.PI);
    ctx.closePath();
    ctx.stroke();

    // Crosshairs.
    ctx.beginPath();
    ctx.moveTo(x + ow*5/4, y);
    ctx.lineTo(x + ow/4, y);
    ctx.moveTo(x, y - ow*5/4);
    ctx.lineTo(x, y - ow/4);
    ctx.moveTo(x - ow*5/4, y);
    ctx.lineTo(x - ow/4, y);
    ctx.moveTo(x, y + ow*5/4);
    ctx.lineTo(x, y + ow/4);
    ctx.closePath();
    ctx.stroke();
});

tut_lurkers[2] = new Lurker(function (dT) {
    let x = WIDTH*3/4;
    let y = HEIGHT/4;
    let ow = 60;
    let iw = 40;

    if (Distance(x, y, mouse.x, mouse.y) < iw/2) {
        playerShip.canTarget = true;
        lurkers.push(tut_lurkers[3]);
        return false;
    }

    return true;
}, function (ctx) {
    DrawTutText(ctx, "Well done! Now steer towards the target in the top right.");
    
    let x = WIDTH*3/4;
    let y = HEIGHT/4;
    let ow = 60;
    let iw = 40;

    ctx.strokeStyle = "#3333aa";

    // Outer Circle.
    ctx.beginPath();
    ctx.arc(x, y, ow, 0, 2*Math.PI);
    ctx.closePath();
    ctx.stroke();

    // Inner Circle.
    ctx.beginPath();
    ctx.arc(x, y, iw, 0, 2*Math.PI);
    ctx.closePath();
    ctx.stroke();

    // Crosshairs.
    ctx.beginPath();
    ctx.moveTo(x + ow*5/4, y);
    ctx.lineTo(x + ow/4, y);
    ctx.moveTo(x, y - ow*5/4);
    ctx.lineTo(x, y - ow/4);
    ctx.moveTo(x - ow*5/4, y);
    ctx.lineTo(x - ow/4, y);
    ctx.moveTo(x, y + ow*5/4);
    ctx.lineTo(x, y + ow/4);
    ctx.closePath();
    ctx.stroke();
});

tut_lurkers[3] = new Lurker(function (dT) {
    if (asteroids[0] === playerShip.target) {
        playerShip.canScan = true;
        lurkers.push(tut_lurkers[4]);
        return false;
    }
    return true;
}, function (ctx) {
    DrawTutText(ctx, "In this game, you must target asteroids and interact with them. Try \
 targeting the small asteroid by hovering over it.");
});

tut_lurkers[4] = new Lurker(function (dT) {
    if (asteroids[0].scanpc >= 1) {
        asteroids[1].targetable = true;
        lurkers.push(tut_lurkers[5]);
        return false;
    }
    return true;
}, function (ctx) {
    DrawTutText(ctx, "You can scan asteroids by using the \"q\" key. Scan the small asteroid now!");
});

tut_lurkers[5] = new Lurker(function (dT) {
    if (asteroids[1].scanpc >= 1) {
        lurkers.push(tut_lurkers[6]);
        return false;
    }
    return true;
}, function (ctx) {
    DrawTutText(ctx, "Great! Different color asteroids will provide different upgrades to your \
ship. Blue improves scanning. Scan the next largest asteroid.");
});

tut_lurkers[6] = new Lurker(function (dT) {
    if (this.elapsed >= tut_TEXT_TIME/2) {
        playerShip.canMove = true;
        playerShip.respawnTime = tut_TEXT_TIME/2;
        lurkers.push(tut_lurkers[7]);
        return false;
    }
    return true;
}, function (ctx) {
    DrawTutText(ctx, "Red improves mining. Now you will want to destroy the asteroid to collect \
their sweet upgrades - but it looks like they are too far...");
});

tut_lurkers[7] = new Lurker(function (dT) {
    if (playerShip.active === false) {
        lurkers.push(tut_lurkers[8]);
        return false;
    }
    return true;
}, function (ctx) {
    DrawTutText(ctx, "Try moving the ship with the space bar. If you hit an asteroid at high \
speed, you will destroy your ship. Why not try that now?");
});

tut_lurkers[8] = new Lurker(function (dT) {
    if (playerShip.active === true) {
        playerShip.respawnTime = 2000;
        lurkers.push(tut_lurkers[9]);
        return false;
    }
    return true;
}, function (ctx) {
    DrawTutText(ctx, "Wow! You exploded! Not to worry, you will respawn soon.");
});

tut_lurkers[9] = new Lurker(function (dT) {
    if (this.elapsed >= tut_TEXT_TIME) {
        asteroids[0].hitable = true;
        playerShip.canHit = true;
        lurkers.push(tut_lurkers[10]);
        return false;
    }
    return true;
}, function (ctx) {
    DrawTutText(ctx, "You may move through asteroids at slow speeds, but be careful! Exploding \
will destroy any upgrades you have.");
});

tut_lurkers[10] = new Lurker(function (dT) {
    if (asteroids[0].active === false) {
        playerShip.canCollect = true;
        lurkers.push(tut_lurkers[11]);
        return false;
    }
    return true;
}, function (ctx) {
    DrawTutText(ctx, "Now it is about time you mine the asteroids you have scanned. Use the \"w\" \
key to mine the small asteroid.");
});

tut_lurkers[11] = new Lurker(function (dT) {
    if (materials.length === 0) {
        lurkers.push(tut_lurkers[12]);
        return false;
    }
    return true;
}, function (ctx) {
    DrawTutText(ctx, "It looks like the asteroid has dropped some materials. Fly your ship over \
them to collect your upgrades!");
});

tut_lurkers[12] = new Lurker(function (dT) {
    if (this.elapsed > tut_TEXT_TIME) {
        asteroids[0].hitable = true;
        lurkers.push(tut_lurkers[13]);
        return false;
    }
    return true;
}, function (ctx) {
    DrawTutText(ctx, "Your scanning has been slightly improved. Also, you ship can now attract \
materials to it like a giant magnet!");
});

tut_lurkers[13] = new Lurker(function (dT) {
    if (asteroids[0].active === false) {
        playerShip.canAttract = true;
        lurkers.push(tut_lurkers[14]);
        return false;
    }
    return true;
}, function (ctx) {
    DrawTutText(ctx, "Mine the red asteroid. Let's see this in action!");
});

tut_lurkers[14] = new Lurker(function (dT) {
    if (asteroids.length === 1) {
        asteroids[0].targetable = true;
        lurkers.push(tut_lurkers[15]);
        return false;
    }
    return true;
}, function (ctx) {
    DrawTutText(ctx, "Woah it broke into multiple pieces! Asteroids larger than a certain size \
will do this. Break the smaller pieces now.");
});

tut_lurkers[15] = new Lurker(function (dT) {
    if (asteroids[0].active === false) {
        lurkers.push(tut_lurkers[16]);
        return false;
    }
    return true;
}, function (ctx) {
    DrawTutText(ctx, "Now that you have upgraded your abilities, try scanning and mining the \
large asteroid.");
});

tut_lurkers[16] = new Lurker(function (dT) {
    if (asteroids.length === 0) {
        lurkers.push(tut_lurkers[17]);
        return false;
    }
    return true;
}, function (ctx) {
    DrawTutText(ctx, "Upgrades help! You have completed the tutorial! Mine the rest of the pieces \
to continue to the real challenge.");
});

tut_lurkers[17] = new Lurker(function (dT) {
    if (this.elapsed > tut_TEXT_TIME) {
        Init(0, "shipSelect");
        return false;
    }
    return true;
}, function (ctx) {
    DrawTutText(ctx, "You are now being teleported to ship select. Good luck in the asteroid \
fields!");
});
