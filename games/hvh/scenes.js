// Sky Hoffert
// Stages for games.

class Scene {
    constructor(mq) {
        this._mainQueue = mq;
    }

    Tick(dT) {}
    Draw(c) {}
}

class MainMenu extends Scene {
    constructor(mq) {
        super(mq);

        // DEBUG
        this._mainQueue.push({type:"change scene",scene:"TEMP_test"});
    }
}

class TEMP_test extends Scene {
    constructor() {
        super();
    }

    Tick(dT) {
        super.Tick(dT);
    }

    Draw(c) {
        super.Draw(c);

        // DEBUG
        c.fillStyle = "#444444";
        c.fillRect(0,0,100,100);

        c.font = "32px Georgia";
        c.fillStyle = "#ffffff";
        c.fillText("cool", 100, 100);
    }
}
