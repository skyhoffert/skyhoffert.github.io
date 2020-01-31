// Sky Hoffert
// Page for 2dchar.

var canvas = document.getElementById("canvas");
canvas.width = WIDTH;
canvas.height = HEIGHT;
canvas.style.width = ""+4/3*0.9*window.innerHeight+"px";
canvas.style.height = ""+0.9*window.innerHeight+"px";
var context = canvas.getContext("2d");

var world = [];

// Add some test bones.
var testBone = new Bone(WIDTH/2,HEIGHT/2,40,0,6,"green");
world.push(testBone);
var testBoneChild = new Bone(40,0,20,0,5,"cyan");
world.push(testBoneChild);
testBone.AddChild(testBoneChild);
var testBone2 = new Bone(20,0,10,0,4,"red");
testBoneChild.AddChild(testBone2);
world.push(testBone2);

var human = new HumanBody(WIDTH/2,HEIGHT*3/4);
world.push(human);

function Tick(dT) {
    for (let i = 0; i < world.length; i++) {
        world[i].Tick(dT);
    }
    
    context.fillStyle = "black";
    context.fillRect(0,0,WIDTH,HEIGHT);

    for (let i = 0; i < world.length; i++) {
        world[i].Draw(context);
    }

    testBone.Rotate(0.01);
    testBoneChild.Rotate(-0.027);
    testBone2.Rotate(0.049);
    human.bones[0].Rotate(-0.01);
    human.bones[4].Rotate(sinF(elapsed+pi/2)/100);
}

var elapsed = 0;
var prevTime = Date.now();
var frames = 0;
var time = 0;

function Update() {
    let now = Date.now();
    let dT = now - prevTime;
    time += dT;
    elapsed += dT/1000;

    if (true || dT >= 1000/FPS) {
        Tick(dT);
        prevTime = now;
        frames++;
    }

    if (time > 10000) {
        console.log("[DEBUG] FPS:"+Math.round(frames/time*1000*1000)/1000);
        time = 0;
        frames = 0;
    }
    requestAnimationFrame(Update);
}

requestAnimationFrame(Update);