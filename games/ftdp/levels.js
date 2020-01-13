//
// Sky Hoffert
// Levels for ftdp.
//

const LEVEL_0 = {
    terrain: [
        new Rectangle(0, -50, 800, 40),
        new RotatedRectangle(320, -90, 190, 30, pi/8),
        new Rectangle(-420, -230, 40, 400),
        new Rectangle(420, -85, 40, 110),
        new Rectangle(700,-310,200,40),
        new Rectangle(-360,-80,80,20),
        new RotatedRectangle(-308,-72,34,20,-pi/6),
        new Rectangle(690, -50, 500, 40),
        new Rectangle(960,-85,40,110)
    ],
    enemies: [
        new SimpleEnemy(800,-100)
    ],
    player: new Player(-360, -220, 12, "#9999ff"),
    coins: [
        new Coin(0, -160),
        new Coin(700,-350),
    ],
    camera: {x:0,y:-400}
};
