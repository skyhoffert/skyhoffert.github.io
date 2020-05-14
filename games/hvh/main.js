// Sky Hoffert
// hvh: hundred vs. hundred

// Create PIXI rendering application.
const app = new PIXI.Application(window.innerWidth-4, window.innerHeight-4);
document.body.appendChild(app.view);

var mainQueue = [];

var currentScene = new MainMenu(mainQueue, app);

function Now() {
    return Date.now();
}

var prevTime = Now();

var serverConn = new Connection("127.0.0.1", 6600, mainQueue);

function Update() {
    let now = Now();
    let dT = now - prevTime;
    prevTime = now;

    HandleQueue(mainQueue);

    Tick(dT);
    
    serverConn.Tick(dT);
}

function HandleQueue(mq) {
    if (mq.length > 0) {
        q = mq[0];
        if (q.type == "change scene") {
            if (q.scene = "TEMP_test") {
                currentScene = new TEMP_test(mq, app);
            }
        }
        else if (q.type == "server connection update") {
            currentScene.AddServerStatus(q.connected);
        }
        mq.splice(0,1);
    }
}

function Tick(dT) {
    currentScene.Tick(dT);
}

setInterval(Update, 1000/24);
