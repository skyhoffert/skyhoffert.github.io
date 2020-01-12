//
// Sky Hoffert
// Levels for ftdp.
//

const LEVEL_0 = {
    terrain: [
        new Rectangle(0, -50, 800, 40),
        new RotatedRectangle(320, -90, 200, 30, pi/8),
        new Rectangle(-420, -230, 40, 400),
        new Rectangle(420, -230, 40, 400),
        new Rectangle(300,-360,200,40),
        new Rectangle(-360,-80,80,20),
        new RotatedRectangle(-308,-72,34,20,-pi/6)
    ],
    player: new Player(0, -220, 12, "purple"),
    coins: [
        new Coin(-360, -160)
    ],
    camera: {x:0,y:-400}
};
