// Sky Hoffert
// Objects in the game.

class GameObject {
    constructor() {
        this.active = true;

        this._pixiElem = null;
    }

    GetPIXI_Element() { return this._pixiElem; }
    Tick(dT) {}
}

class UI_Text extends GameObject {
    constructor(x,y,s) {
        super();
        const style = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 36,
            fontStyle: 'italic',
            fontWeight: 'bold',
            fill: ['#ffffff', '#00ff99'], // gradient
            stroke: '#4a1850',
            strokeThickness: 5,
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 4,
            dropShadowAngle: Math.PI / 6,
            dropShadowDistance: 6,
            wordWrap: true,
            wordWrapWidth: 440,
        });
        
        this._pixiElem = new PIXI.Text(s, style);
        this._pixiElem.x = x;
        this._pixiElem.y = y;
    }
}