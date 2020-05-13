// Sky Hoffert
// hvh: hundred vs. hundred

var canvas = document.getElementById("canvas");
var width = window.innerWidth;
var height = window.innerHeight;
canvas.width = width;
canvas.height = height;
var context = canvas.getContext("2d");

var mainQueue = [];

var currentScene = new MainMenu(mainQueue);

function Now() {
    return Date.now();
}

var prevTime = Now();

var serverConn = new Connection("127.0.0.1", 6600);

function Update() {
    let now = Now();
    let dT = now - prevTime;
    prevTime = now;

    HandleQueue(mainQueue);

    Tick(dT);
    
    serverConn.Tick(dT);

    Draw(context);
}

function HandleQueue(mq) {
    if (mq.length > 0) {
        if (mq[0].type == "change scene") {
            if (mq[0].scene = "TEMP_test") {
                currentScene = new TEMP_test(mq);
            }
        }
        mq.splice(0,1);
    }
}

function Tick(dT) {
    currentScene.Tick(dT);
}

function Draw(c) {
    c.fillStyle = "black";
    c.fillRect(0,0,width,height);

    currentScene.Draw(c);
}

setInterval(Update, 1000/24);
