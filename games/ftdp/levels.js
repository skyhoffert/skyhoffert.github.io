//
// Sky Hoffert
// Levels for ftdp.
//

const LEVEL_0 = {
    terrain: [
        new RotatedRectangle(-308,-72,40,20,-pi/6, true), // "start" ramp
        new RotatedRectangle(330, -68, 185, 80, pi/8, true),
        new RotatedRectangle(1050, -68, 185, 80, -pi/8, true),
        new Rectangle(0, 30, 800, 200),
        new Rectangle(-600, -330, 400, 800),
        new Rectangle(420, -105, 40, 70),
        new Rectangle(700,-310, 200, 40),
        new Rectangle(-360,-80,80,20), // "start" platform
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

        new RotatedRectangle(2180, -740, 20, 100, -pi/64),
        new Rectangle(2180, -200, 400, 1000), // left building

        new Rectangle(1550,-310, 200, 40),
        new Rectangle(1800,-910, 40, 300),

        new RotatedRectangle(2750, -720, 20, 40, pi/64),
        new Rectangle(2680, -710, 40, 20),
        new Rectangle(2750, -200, 400, 1000), // right building

        new Rectangle(3150,-810, 40, 400),
        new Rectangle(3400,-510, 300, 40), // enemy platform

        new Rectangle(3100,-210, 300, 40),
        new Rectangle(3450, 30, 1000, 200), // ground after buildings
        new Rectangle(4100, 0, 300, 250), // platform with enemies

        new RotatedRectangle(5760,-72,40,20, pi/6, true), // "end" ramp
        new RotatedRectangle(4550, -475, 40, 650, -pi/32), // building wall left
        new RotatedRectangle(4850, -390, 250, 670, -pi/32), // building wall right

        new Rectangle(5350, -90, 200, 40), // platform with enemy at end

        new Rectangle(5050, 30, 1600, 200), // final ground
        new Rectangle(5810, -80, 80, 20), // "end" platform
        new Rectangle(6050, -430, 400, 1000), // right bound
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

        new BGRect(3230, -75, 40, 150, 0, "#008800"),

        new BGRect(8000, -800, 40, 40, 10, "#004400"), // moon
    ],
    enemies: [
        new SimpleEnemy(800,-100),
        new SimpleEnemy(1550,-500),
        new SimpleEnemy(4100,-100),
        new SimpleEnemy(4100,-100,-1),
        new SimpleEnemy(5350,-100,2,0.7),
    ],
    player: new Player(-360, -720, 12, "#9999ff"),
    //player: new Player(2750, -2000, 12, "#9999ff"), // DEBUG
    coins: [
        new Coin(0, -160),
        new Coin(700,-350),
        new Coin(1550, -400),
        new Coin(1960, -90),
        new Coin(1640, -1085),
        new Coin(2465, -585),
        new Coin(3400, -555),
        new Coin(3100, -100),
        new Coin(4700, -1050),
        new Coin(4975, -90),
    ],
    camera: {x:-100,y:-500,z:1,lb:-500,rb:5950}
};
