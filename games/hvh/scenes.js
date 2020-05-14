// Sky Hoffert
// Stages for games.

class Scene {
    constructor(mq, app) {
        this._mainQueue = mq;
        this._app = app;

        this._pixiElements = [];
    }

    Tick(dT) {
        for (let i = 0; i < this._pixiElements.length; i++) {
            this._pixiElements[i].Tick(dT);
            if (this._pixiElements[i].active == false) {
                this._pixiElements.splice(i,1);
                i--;
            }
        }
    }
}

class MainMenu extends Scene {
    constructor(mq, app) {
        super(mq, app);

        // DEBUG
        this._mainQueue.push({type:"change scene",scene:"TEMP_test"});
    }
}

class TEMP_test extends Scene {
    constructor(mq, app) {
        super(mq, app);

        this._AddExampleText();
    }

    _AddExampleText() {
        var newElem = new UI_Text(100, 200, "attempting to connect to server");
        this._pixiElements.push(newElem);
        this._app.stage.addChild(newElem.GetPIXI_Element());
    }

    Tick(dT) {
        super.Tick(dT);
    }

    AddServerStatus(b) {
        if (b) {
            this._pixiElements[0].GetPIXI_Element().text = "connected";
        } else {
            this._pixiElements[0].GetPIXI_Element().text = "could not connect";
        }
    }
}
