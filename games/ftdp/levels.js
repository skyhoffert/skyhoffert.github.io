//
// Sky Hoffert
// Levels for ftdp.
//

const LEVEL_0 = {
    terrain: [
        new RotatedRectangle(-308,-72,40,20,-pi/6, true),
        new RotatedRectangle(330, -68, 185, 80, pi/8, true),
        new RotatedRectangle(1050, -68, 185, 80, -pi/8, true),
        new Rectangle(0, 30, 800, 200),
        new Rectangle(-600, -330, 400, 800),
        new Rectangle(420, -105, 40, 70),
        new Rectangle(700,-310, 200, 40),
        new Rectangle(-360,-80,80,20),
        new Rectangle(690, 30, 580, 200),
        new Rectangle(960,-105,40,70),
        /*
        new RotatedRectangle(1200, -350, 40, 300, -pi/32),
        new RotatedRectangle(1050, -450, 40, 300, -pi/32),
        new Rectangle(1180, 30, 400, 200),
        */
        new RotatedRectangle(1850, -200, 120, 40, pi/10),
        new RotatedRectangle(1250, -500, 120, 40, -pi/8),
        new RotatedRectangle(1550, -700, 120, 40, pi/6),
        new RotatedRectangle(1880, -550, 220, 40, pi/10),
        
        new Rectangle(1480, 30, 1000, 200),
        new Rectangle(2180, -200, 400, 1000),
        new Rectangle(1550,-310, 200, 40),
        new Rectangle(1800,-910, 40, 300),

        new Rectangle(2750, -200, 400, 1000),
    ],
    background: [
        new BGRect(2000, -100, 50, 800, 6, "#002200"),
        new BGShape(300, -200, 2, "#002200", [
            {x:-10,y:0},
            {x:10,y:-10},
            {x:10,y:10},
            {x:0,y:300}
        ]),
        new BGRect(0, -100, 100, 300, 2, "#002200"),
        new BGShape(1000, -230, 2, "#002200", [
            {x:-10,y:0},
            {x:10,y:10},
            {x:10,y:-10},
            {x:0,y:300}
        ]),
        new BGRect(1500, -50, 100, 200, 2, "#002200"),
    ],
    enemies: [
        new SimpleEnemy(800,-100)
    ],
    player: new Player(-360, -720, 12, "#9999ff"),
    coins: [
        new Coin(0, -160),
        new Coin(700,-350),
    ],
    camera: {x:-100,y:-500,z:1}
};
