// Sky Hoffert
// zgah tutorial file.
// Last modified November 12, 2019

function DrawTutText(ctx, txt) {
    let w = 400;
    let h = 200;
    let x = WIDTH - w*5/8;
    let y = HEIGHT - h*5/8;
    let fsize = 24;
    let words = txt.split(" ");
    let tmptxt = "";
    let tmpidx = 0;

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

tut_lurkers[0] = new Lurker(function (dT) {
    if (this.elapsed > 5000) {
        lurkers.push(tut_lurkers[1]);
        return false;
    }
    return true;
}, function (ctx) {
    DrawTutText(ctx, "Welcome to zgah! You will now learn the game mechanics.");
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
    DrawTutText(ctx, "You need to steer your ship by moving the cursor. Try moving it to the blue target in the bottom left.");

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
        lurkers.push(tut_lurkers[2]);
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
