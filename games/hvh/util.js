// Sky Hoffert
// Utility for this project.

class Timer {
    constructor(t,type,p={}) {
        this.active = true;
        this.type = type;
        this.params = p;
        this._timer = t;
    }

    Tick(dT) {
        this._timer -= dT;

        return this._timer <= 0;
    }
}