//
// Sky Hoffert
// Levels for ftdp.
//

const LEVELS = {
level0:{
    name:"level0",
    terrain: [
        ["rr",-308,-72,40,20,-pi/6,true], // "start" ramp
        ["rr",330,-68,185,80,pi/8,true],
        ["rr",1050,-68,185,80,-pi/8,true],
        ["r",0,30,800,200,false],
        ["r",-600,-330,400,800,false],
        ["r",420,-105,40,70,false],
        ["r",700,-310,200,40,false],
        ["r",-360,-80,80,20,false], // "start" platform
        ["r",690,30,580,200,false],
        ["r",960,-105,40,70,false],

        ["rr",1850,-200,120,40,pi/12,false],
        ["rr",1250,-500,120,40,-pi/8,false],
        ["rr",1550,-700,120,40,pi/6,false],
        ["rr",1880,-550,220,40,pi/10,false],
        
        ["r",1480,30,1000,200,false],

        ["r",2450,-460,200,80,true],

        ["rr",2178,-740,20,110,-pi/64,false],
        ["r",2180,-200,400,1000,false], // left building

        ["r",1550,-310,200,40,false],
        ["r",1800,-910,40,300,false],

        ["rr",2750,-720,20,40,pi/64,false],
        ["r",2680,-710,40,20,false],
        ["r",2750,-200,400,1000,false], // right building

        ["r",3150,-810,40,400,false],
        ["r",3400,-510,300,40,false], // enemy platform

        ["r",3100,-210,300,40,false],
        ["r",3000,-250,100,40,false],
        ["r",3570,-590,40,200,true], // harmful wall by floating platform
        ["r",3450,30,1000,200,false], // ground after buildings
        ["r",4100,0,300,250,false], // platform with enemies

        ["rr",5760,-72,40,20,pi/6,true], // "end" ramp
        ["rr",4550,-475,40,650,-pi/32,false], // building wall left
        ["rr",4850,-390,250,670,-pi/32,false], // building wall right

        ["r",5350,-90,200,40,true], // platform with enemy at end

        ["r",5050,30,1600,200,false], // final ground
        ["r",5810,-80,80,20,false], // "end" platform
        ["r",6050,-430,400,2000,false], // right bound
        
        ["bb",700,-260,40,0.015], // block blades
        ["bb",1550,-260,40,0.015],
        ["bb",1800,-740,60,-0.015],
        ["bb",3220,-75,40,-0.015],
        ["bb",3220,-185,40,0.015],
        ["bb",4100,-300,50,0.015],
        ["bb",4570,-200,50,0.015],

        ["bb",5350,-300,40,0.015,{x:5350,y:-300},{x:5350,y:-170},1.5], // Final blade

        ["r",5220,-750,40,600,true], // harmful wall at end
    ],
    background: [
        ["bgr",2000,-100,50,800,6,"#004400","#000200"],

        ["bgr",4000,-155,100,350,6,"#004400","#000200"],

        ["bgr",8000,-155,100,450,6,"#004400","#000200"],
        ["bgr",8000,-75,40,350,4,"#004400"],"#000200",
        ["bgr",7000,-100,40,400,4,"#004400","#000200"],
        ["bgr",7500,-30,40,370,4,"#004400","#000200"],

        ["bgs",300,-200,2,"#004400","#000200",[
            {x:-10,y:0},
            {x:10,y:-10},
            {x:10,y:10},
            {x:0,y:300}
        ]],
        ["bgr",0,-100,100,400,2,"#004400","#000200"],
        ["bgs",1000,-230,2,"#004400","#000200",[
            {x:-10,y:0},
            {x:10,y:10},
            {x:10,y:-10},
            {x:0,y:300}
        ]],
        ["bgr",1500,-50,100,300,2,"#004400","#000200"],

        ["bgr",3000,-155,100,350,2,"#004400","#000200"],
        ["bgr",3500,-100,120,250,2,"#004400","#000200"],
        ["bgr",2400,-155,180,380,2,"#004400","#000200"],
        ["bgr",2800,-105,140,290,2,"#004400","#000200"],

        ["bgr",8000,-800,40,40,10,"#668866","#061206"], // moon
    ],
    foreground: [
        ["p",-80,-68,12,40,"#00e600"],
        ["p",40,-68,12,30,"#00e600"],
        ["p",500,-68,16,60,"#00e600"],
        ["p",-220,-68,8,20,"#00e600"],
        
        ["p",1320,-68,18,80,"#00e600"],
        ["p",1430,-68,12,10,"#00e600"],
        ["p",1500,-68,8,20,"#00e600"],
        ["p",1620,-68,10,60,"#00e600"],
        
        ["p",3580,-68,14,60,"#00e600"],
        ["p",3400,-68,12,40,"#00e600"],
        ["p",3800,-68,16,50,"#00e600"],
        
        ["p",5120,-68,16,50,"#00e600"],
        ["p",5600,-68,12,40,"#00e600"],
    ],
    enemies: [
        ["m",800,-100,1,1],
        ["m",1550,-500,1,1],
        ["m",4100,-100,1,1],
        ["m",4100,-100,-1,1],
        ["m",5350,-100,2,0.7],
    ],
    player: [-360,-720,12,"#9999ff","#060610",{left:-10000,right:10000,top:-10000,bottom:10000}],
    coins: [
        ["c",0,-160],
        ["c",700,-350],
        ["c",1550,-400],
        ["c",1960,-90],
        ["c",1640,-1065],
        ["c",2465,-585],
        ["c",3400,-555],
        ["c",3100,-100],
        ["c",4700,-1050],
        ["c",4975,-90],
    ],
    camera: {x:-100,y:-500,z:1.2,lb:-500,rb:5950,bb:0,tb:10000},
    levelEnd: {x:5810,y:-140,w:80,h:100},
    nextLevel: "level1"
},
level1:{
    name:"level1",
    terrain: [
        ["bgr",1300,-1820,1200,4100,false], // BG of skyscraper
        ["rr",-408,-2,40,20,-pi/6,true], // "start" ramp
        ["r",-600,-1800,200,4000,false], // left wall
        ["r",100,100,1200,200,false], // ground for start
        ["r",-460,-10,80,20,false], // Start platform
        
        ["r",-100,-22,40,40,true], // mulper here
        ["r",200,-22,40,40,true],
        
        ["r",1300,100,1200,200,false], // ground for skyscraper
        ["r",1880,-1030,40,2600,false], // right skyscraper wall
        ["r",720,-1312,40,2416,false], // left skyscraper wall
        ["kd",720,-52,40,100,{x:650,y:-20}], // entrance to skyscraper
        ["bb",1600,-20,30,0.015], // first floor blade
        
        // first/second floor
        ["r",1220,-124,960,40,false], // first floor ceiling
        ["r",1680,-394,40,500,false], // first floor elevator
        ["r",1630,-624,60,40,false], // first floor elevator landing
        ["r",1520,-514,40,540,false],
        ["r",1080,-514,40,540,false], // second floor coin room right wall
        ["r",1300,-534,80,580,false], // sulper wall
        ["r",1680,-804,360,40,false], // second floor upper ledge right
        ["r",920,-804,360,40,false], // second floor upper ledge left
        ["bb",1720,-120,40,-0.015], // first floor elevator blade
        ["bb",1560,-340,35,0.015], // first floor elevator blade 2
        // Second floor coin room
        ["otb",900,-280,120,40,0,3],
        ["otb",900,-430,120,40,0,3],
        ["otb",900,-580,120,40,0,3],
        ["bb",990,-280,50,-0.015],
        ["bb",1030,-280,50,0.015],
        ["bb",770,-430,50,0.015],
        ["bb",810,-430,50,-0.015],
        ["bb",990,-580,50,-0.015],
        ["bb",1030,-580,50,0.015],
        // Second floor upper part
        ["r",1611,-982,497,84,false], // second floor upper ceiling right
        ["r",989,-982,497,84,false], // second floor upper ceiling left
        ["kd",1300,-960,120,40,{x:800,y:-880}],
        ["kd",1300,-1004,120,40,{x:1800,y:-880}],

        // Third floor
        ["r",1300,-1150,900,40,false], // ground
        ["bb",1100,-1040,40,0.015],
        ["bb",1500,-1040,40,-0.015],
        ["r",1300,-1210,600,80,false], // platform
        ["r",1610,-1400,500,40,false], // third floor upper ceiling right
        ["r",989,-1400,497,40,false], // third floor upper ceiling left
        ["bb",1250,-1400,50,-0.015],

        // Fourth floor
        ["r",1380,-1470,40,100,false], // entrance wall
        ["r",1350,-1540,1020,40,false], // ground
        // Steps
        ["r",1410,-1600,900,80,false],
        ["r",1460,-1680,800,80,false],
        ["r",1510,-1760,700,80,false],
        ["r",1560,-1840,600,80,false],
        ["r",1610,-1920,500,80,false],
        ["r",1660,-2000,400,80,false],
        ["r",1710,-2080,300,80,false],
        ["r",1760,-2160,200,80,false],
        ["r",890,-2350,300,40,false], // Secret coin ledge
        ["rr",2072,-2442,40,160,pi/5,false], // overhand steep wall
        ["r",1390,-2500,1300,40,false], // Ceiling
        ["r",1930,-2350,140,40,false], // Overhand ledge
        ["r",2135,-2385,60,40,false], // Overhand ledge landing

        // Fifth floor
        ["r",1880,-3150,40,1000,false], // right wall
        ["rr",1569,-3478,140,40,pi/10,false], // elevator exit ramp
        ["r",1650,-3020,40,1000,false], // elevator wall
        ["r",1300,-3670,1200,40,false], // Ceiling
        ["bb",1765,-3000,40,0.015,{x:1765,y:-2650},{x:1765,y:-3570},3], // elevator blade
        ["bb",1765,-3000,40,0.015,{x:1765,y:-3570},{x:1765,y:-2650},3], // elevator blade
        ["r",1400,-3580,40,140,false], // shortcut blocking wall
        ["otb",1238,-3570,80,40,0,4], // otb on shortcut
        // Right section
        ["r",1400,-3250,160,40,false], // top platform
        ["r",1550,-2990,160,40,false], // middle platform
        ["bb",1500,-3100,40,0.015,{x:1400,y:-3100},{x:1600,y:-3100},1], // middle blade
        ["bb",1500,-2800,40,-0.015,{x:1350,y:-2900},{x:1600,y:-2900},1.2], // bottom blade
        // Bottom section
        ["r",1250,-2770,450,40,false], // bottom section ceiling
        ["bb",1250,-2700,40,0.015,{x:1000,y:-2700},{x:1500,y:-2700},2], // top blade
        ["bb",1250,-2570,40,0.015,{x:1500,y:-2570},{x:1000,y:-2570},2], // bottom blade
        // Left section
        ["rr",830,-2900,200,40,-pi/12,false], // bottom
        ["rr",1170,-3060,200,40,pi/12,false], // middle
        ["rr",920,-3200,120,40,-pi/20,false], // top
        ["rr",1180,-3400,120,40,pi/8,false], // top top
        ["bb",1080,-3000,40,-0.015,{x:840,y:-3030},{x:1200,y:-2860},1.8], // bottom blade
        ["bb",1080,-3000,40,-0.015,{x:900,y:-3080},{x:1200,y:-3180},2], // middle blade
        ["bb",1080,-3000,40,-0.015,{x:1080,y:-3150},{x:1080,y:-3600},1.4], // top blade
        ["r",864,-3390,40,160,true], // harmful at exit
        ["otb",792,-3390,100,40,0,2], // otb on exit
        ["r",720,-3080,40,860,false], // left wall
        ["r",1300,-3190,40,800,true], // central harmful wall
        // Nook
        ["r",820,-2670,160,40,false], // nook ceiling
        ["r",880,-2585,40,130,false], // nook right wall
        ["rr",512,-3454,240,40,pi/10,false], // left overhang ramp
        ["r",660,-3490,80,40,false], // left overhang landing
        // Ceiling Section
        ["r",1300,-3880,1200,40,false], // Ceiling
        ["kd",720,-3775,40,166,{x:780,y:-2590}], // Ceiling key door
        ["r",1300,-3710,150,36,true], // mulper block
        // Overhand Section
        ["rr",460,-3000,80,500,pi/24,false], // Overhang rotated part
        ["rr",225,-3060,40,400,pi/24,false], // Overhang rotated part matching
        ["rr",168,-3250,100,40,-pi/24,false], // Leftmost platform
        ["rr",245,-2600,200,40,-pi/16,false], // bottom ledge
        ["otb",525,-2500,160,40,0,3], // otb at way bottom
        ["bb",540,-2850,30,0.015], // bottom blade
        ["bb",690,-2920,30,-0.015], // middle blade
        ["bb",520,-2990,30,0.015], // top blade

        // Roof
        ["r",1300,-4400,80,1000,false], // Spire
        // OTB left path to top
        ["otb",1100,-4200,40,40,0,2], // otb wall jumper
        ["otb",1060,-4240,120,40,0,3], // otb landing
        ["r",984,-4660,40,400,true], // blocks otb 2
        ["otb",900,-4510,120,40,0,3], // otb 2
        ["otb",860,-4470,40,40,0.1,3], // otb 2 wall jumper 1
        ["otb",600,-4540,40,80,0,3], // otb 2 wall jumper 2
        ["otb",1032,-4680,50,80,0,0.6], // otb 3
        // OTB coin path on right
        ["otb",2100,-3800,120,40,0.05,1.2],
        ["otb",2100,-3600,120,40,0.05,1.2],
        ["otb",2100,-3450,200,40,0.05,1.2],
        ["otb",2300,-3350,100,40,0.05,1.2],
        ["otb",2520,-3250,110,40,0.05,1.2],
        ["otb",2340,-3190,80,40,0.05,1.2],
        ["otb",2480,-3000,120,40,0.05,1.2],
        ["otb",2750,-2920,100,40,0.5,1.4],
        // Right path
        ["otb",1500,-4130,120,40,0.02,2],
        ["rr",1600,-4400,200,40,pi/16,false],
        ["r",1500,-4680,40,250,false], // vertical wall closest to top
        ["rr",1604,-4836,250,40,pi/8,false], // platform to jump to end
        ["bb",1500,-4820,30,-0.015], // left blade
        ["bb",1700,-4900,30,0.015], // right blade
        ["bb",1700,-4900,30,0.015,{x:1380,y:-4930},{x:1560,y:-5090},1], // final blade
    ],
    background: [
        ["bgr",2000,0,200,1000,4,"#003300","#000500"],

        /*
        ["bgr",1300,-400,1150,1000,0,"#003300","#000500"], // First/second floor skyscraper bg
        ["bgr",1300,-1150,1150,400,0,"#003300","#000500"], // Third floor skyscraper bg
        ["bgr",1300,-1910,1150,1020,0,"#003300","#000500"], // Fourth floor skyscraper bg
        ["bgr",1300,-3060,1150,1070,0,"#003300","#000500"], // Fifth floor skyscraper bg
        */
    ],
    foreground: [
        ["p",-280,0,10,8,"#00e600"],
        ["p",-200,0,12,40,"#00e600"],
        ["p",400,0,14,50,"#00e600"],
    ],
    enemies: [
        ["m",0,-10,1,1],

        // First floor julpers
        ["j",900,-20,2,0.015],
        ["j",1000,-20,0.2,0.015],
        ["j",1100,-20,2,0.015],
        ["j",1200,-20,0.2,0.015],
        ["j",1300,-20,2,0.015],

        // Sulper wall on second floor
        ["s",1350,-384,0.04],
        ["s",1350,-684,0.04],
        ["s",1250,-384,0.04],
        ["s",1250,-684,0.04],
        
        // Sulpers blocking keys
        ["j",990,-814,0.2,0.01],
        ["j",1610,-814,0.2,0.01],
        
        // Third floor mulpers
        ["m",1300,-1250,1,1],
        ["m",1300,-1250,-1,1],
        
        // Stairs Julpers
        ["j",1000,-1620,1,0.018],
        ["j",1200,-2080,1,0.018],
        ["j",1400,-1940,1,0.018],
        ["j",1600,-2400,1,0.018],
        
        // Fifth floor mulper block
        ["j",1100,-3700,0.8,0.016],
        ["m",1300,-3720,2,0.5],
        ["j",1500,-3700,0.8,0.016],
    ],
    player: [-460,-400,12,"#9999ff","#060610",{left:-10000,right:10000,top:-10000,bottom:20}],
    coins: [
        ["c",50,-100],
        ["c",1560,-280],
        ["c",900,-700],
        ["c",1300,-1100],
        ["rc",1000,-1450],
        ["c",890,-2390],
        ["c",2350,-2500],
        ["c",1250,-2635],
        ["c",520,-2910],
        ["c",2750,-2980],
        ["c",1730,-4760],
    ],
    camera: {x:-300,y:-300,z:1.2,lb:-600,rb:10000,bb:50,tb:-10000},
    levelEnd: {x:1300,y:-4950,w:80,h:100},
    nextLevel: "playground"
},
playground:{
    name:"playground",
    terrain: [
        ["r",-500,0,80,1000,false],
        ["r",500,0,80,1000,false],
        ["r",0,500,1000,80,false],
        ["r",0,-500,1000,80,false],
        ["r",-400,450,200,100,false],
        ["r",-400,200,200,100,false],
        ["r",400,150,200,100,false],
        ["r",440,-80,120,50,false],
        ["r",200,-300,200,40,false],
        ["r",-380,-300,200,40,false],
        ["r",-220,-400,40,200,false],
    ],
    background: [
        ["bgr",2000,0,200,200,4,"#003300","#000500"],
    ],
    foreground: [
    ],
    enemies: [
    ],
    player: [0,0,12,"#9999ff","#060610",{left:-10000,right:10000,top:-10000,bottom:10000}],
    coins: [
    ],
    camera: {x:0,y:0,z:1.2,lb:-1000,rb:1000,bb:1000,tb:-1000},
    levelEnd: {x:0,y:10000,w:100,h:100},
    nextLevel: "playground"
},
testground:{
    name:"testground",
    terrain: [
        ["r",-500,0,80,1000,false],
        ["r",500,0,80,1000,false],
        ["r",0,500,1000,80,false],
        ["r",0,-500,1000,80,false],

        ["r",-200,300,100,40,false], // julper ceiling
        
        ["r",0,110,130,40,false], // sulper block

        ["kd",-400,400,40,100,{x:-350,y:300}],

        ["otb",300,300,100,40,0,4],
        ["otb",240,140,80,40,0,4],
        ["otb",325,0,90,40,0,4],
        ["otb",300,-140,90,40,0,4],
        
        ["bb",450,200,40,0.015], // Final blade
        ["bb",0,0,40,0.02,{x:-300,y:200},{x:300,y:-300},3], // Final blade
    ],
    background: [
        ["bgr",2000,0,200,200,4,"#003300","#000500"],
    ],
    foreground: [
    ],
    enemies: [
        ["j",120,400,2,0.02],
        ["j",-200,400,2,0.015],

        ["s",0,80,0.04],
        ["s",0,80,-0.04],
    ],
    player: [0,300,12,"#9999ff","#060610",{left:-10000,right:10000,top:-10000,bottom:10000}],
    coins: [
    ],
    camera: {x:0,y:0,z:1.2,lb:-1000,rb:1000,bb:1000,tb:-1000},
    levelEnd: {x:0,y:10000,w:100,h:100},
    nextLevel: "testground"
}
};
