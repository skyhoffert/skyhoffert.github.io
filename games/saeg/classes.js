// Sky Hoffert
// Classes for saeg.

class GameObject {
    constructor(x,y,z,c) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.color = c;
        this.bounds = {left:0,right:0,top:0,bottom:0};
        this.active = true;
    }
    
    Contains(p) { return false; }
    Tick(dT) {}
    Draw(c) {}
}

class DebugRay extends GameObject {
    constructor(x,y,x2,y2,c,sf=true) {
        super(x,y,10,c);
        this.x2 = x2;
        this.y2 = y2;
        this.lineWidth = 1;
        this.singleFrame = sf;
    }

    Tick(dT) {
    }

    Draw(c) {
        let pos = gameStage.camera.ScreenPosition(this.x,this.y);
        let pos2 = gameStage.camera.ScreenPosition(this.x2,this.y2);
        c.beginPath();
        c.moveTo(pos.x,pos.y);
        c.lineTo(pos2.x,pos2.y);
        c.strokeStyle = this.color;
        c.lineWidth = this.lineWidth;
        c.stroke();
        
        if (this.singleFrame) {
            this.active = false;
        }
    }
}

class DebugUI extends GameObject {
    constructor() {
        super(0,0,100,"#303030");
        this.width = 140;
        this.height = 100;
        this.visible = true;

        this.lines = [
            "w: move toward cursor",
            "s: brake",
            "a/d: strafe",
            "c: lock/unlock camera",
            "left click: fire pellet",
            "right click: move camera",
            "mouse wheel: zoom in/out",
            "x: hide this menu"
        ];
        this.xpad = 5;
        this.ypad = 5;
        this.fsize = 8;
    }

    Draw(c) {
        if (!this.visible) { return; }

        // Debug Menu
        c.fillStyle = this.color;
        c.fillRect(0,HEIGHT-this.lines.length*this.fsize-this.ypad*2,this.width,this.height);
        c.font = ""+this.fsize+"px Monospace";
        c.fillStyle = "white";
        for (let i = 0; i < this.lines.length; i++) {
            c.fillText(this.lines[i], this.xpad, HEIGHT-this.lines.length*this.fsize+i*this.fsize);
        }
    }
}

class MenuButton extends GameObject {
    constructor(x,y,w,h,t,tc,f,rect={}) {
        super(x,y,100,"white");
        this.width = w;
        this.height = h;
        this.text = t;
        this.textColor = tc;
        this.font = f;
        this.bounds = {left:x-w/2,right:x+w/2,top:y-h/2,bottom:y+h/2};
        if (rect.drawn) {
            this.drawRect = true;
            this.color = rect.color;
            this.colorFill = rect.colorFill;
            this.borderWidth = rect.borderWidth;
        }

        this.drawn = true;
    }

    Contains(p) {
        return p.x > this.bounds.left && p.x < this.bounds.right && 
            p.y > this.bounds.top && p.y < this.bounds.bottom;
    }

    Draw(c) {
        if (!this.drawn) { return; }

        if (this.drawRect) {
            c.fillStyle = this.colorFill;
            c.strokeStyle = this.color;
            c.lineWidth = this.borderWidth;
            c.fillRect(this.x-this.width/2,this.y-this.height/2,this.width,this.height);
            c.strokeRect(this.x-this.width/2,this.y-this.height/2,this.width,this.height);
        }
        c.font = this.font;
        let tw = c.measureText(this.text).width;
        c.fillStyle = this.textColor;
        c.fillText(this.text,this.x-tw/2,this.y+(parseInt(this.font))/2-3);
    }
}

class TitleButton extends MenuButton {
    constructor() {
        super(WIDTH/2,50,0,0,"Stymphalian Zero","white","80px Monospace");
    }

    Draw(c) {
        this.x += 4;
        this.y += 4;
        this.textColor = "#404040";
        super.Draw(c);

        this.x -= 2;
        this.y -= 2;
        this.textColor = "#a0a0a0";
        super.Draw(c);

        this.x -= 2;
        this.y -= 2;
        this.textColor = "white";
        super.Draw(c);
    }
}

class MainMenuUI extends GameObject {
    constructor() {
        super(0,0,100,"white");
        this.mouse = {x:0,y:0};

        this.buttons = [];

        this.fading = false;
        this.fadingTimeMax = 2000;
        this.fadingTime = this.fadingTimeMax;

        // Title
        this.buttons.push({obj:new TitleButton(),func: function() {}});

        // Start
        this.buttons.push({obj:new MenuButton(WIDTH/2,HEIGHT/2-30,360,100,
                "Begin","white","60px Monospace"),
            func: function() {
                this.fading = true;
            }});

        // Other
        this.buttons.push({obj:new MenuButton(WIDTH/2,HEIGHT/2+80,360,100,
                "Levels","white","60px Monospace"),
            func: function() {
                gameStage = new LevelsMenu();
            }});
    }

    UserInput(t) {
        if (t.type === "key") {
            if (t.key === "Enter" && t.down) {
                // TODO: when enter key is pressed
            }
        } else if (t.type === "mouseMove") {
            this.mouse.x = t.x;
            this.mouse.y = t.y;
        } else if (t.type === "mouseButton") {
            if (t.down) {
                for (let i = 0; i < this.buttons.length; i++) {
                    if (this.buttons[i].obj.Contains({x:this.mouse.x,y:this.mouse.y})) {
                        this.buttons[i].func();
                        return true;
                    }
                }
            }
        }

        return false;
    }

    Tick(dT) {
        if (this.buttons[1].fading) {
            this.fading = true;
        }

        if (this.fading) {
            if (this.fadingTime > 0) {
                this.fadingTime -= dT;
            } else {
                gameStage = new Testground();
            }
        }
    }

    Draw(c) {
        for (let i = 0; i < this.buttons.length; i++) {
            this.buttons[i].obj.Draw(c);
        }

        // Draw fade.
        if (this.fading) {
            c.globalAlpha = 1-(this.fadingTime/this.fadingTimeMax)**4;
            c.fillStyle = "black";
            c.fillRect(0,0,WIDTH,HEIGHT);
            c.globalAlpha = 1.0;
        }
    }
}

class LevelsUI extends GameObject {
    constructor() {
        super(0,0,100,"white");
        this.mouse = {x:0,y:0};

        this.buttons = [];

        this.fading = false;
        this.fadingTimeMax = 2000;
        this.fadingTime = this.fadingTimeMax;
        this.targetLevel = null;

        this.buttons.push({obj:new MenuButton(140,40,280,100,"<- Back","white","60px Monospace"),
            func:function() {
                gameStage = new MainMenu();
            }});
        // Stages
        this.buttons.push({obj:new MenuButton(130,200,240,100,
                "Testground","white","40px Monospace",{drawn:true,color:"gray",colorFill:"black"}),
            func: function() {
                this.targetLevel = "Testground";
                this.fading = true;
            }});
        // Stages
        this.buttons.push({obj:new MenuButton(380,200,240,100,
                "TODO","white","40px Monospace",{drawn:true,color:"gray",colorFill:"black"}),
            func: function() {
                //this.targetLevel = "Asteroids";
                //this.fading = true;
            }});
    }

    UserInput(t) {
        if (t.type === "mouseMove") {
            this.mouse.x = t.x;
            this.mouse.y = t.y;
        } else if (t.type === "mouseButton") {
            if (t.down) {
                for (let i = 0; i < this.buttons.length; i++) {
                    if (this.buttons[i].obj.Contains({x:this.mouse.x,y:this.mouse.y})) {
                        this.buttons[i].func();
                        return true;
                    }
                }
            }
        }

        return false;
    }
    
    Tick(dT) {
        // Check if any buttons are "fading".
        for (let i = 0; i < this.buttons.length; i++) {
            if (this.buttons[i].fading) {
                this.fading = true;
                this.targetLevel = this.buttons[i].targetLevel;
            }
        }

        if (this.fading) {
            if (this.fadingTime > 0) {
                this.fadingTime -= dT;
            } else {
                if (this.targetLevel === "Testground") {
                    gameStage = new Testground();
                } else {
                    console.log(this.targetLevel);
                }
            }
        }
    }

    Draw(c) {
        for (let i = 0; i < this.buttons.length; i++) {
            this.buttons[i].obj.Draw(c);
        }

        // Draw fade.
        if (this.fading) {
            c.globalAlpha = 1-(this.fadingTime/this.fadingTimeMax)**4;
            c.fillStyle = "black";
            c.fillRect(0,0,WIDTH,HEIGHT);
            c.globalAlpha = 1.0;
        }
    }
}

class PauseUI extends GameObject {
    constructor() {
        super(0,0,100,"white");

        this.mouse = {x:0,y:0};
        this.buttons = [];

        this.active = false;

        // Continue
        this.buttons.push({obj:new MenuButton(WIDTH/2,HEIGHT/2,300,100,
                "Continue","white","40px Monospace"),clicked:false,
            func:function() {
                this.clicked = true;
            }});
        // Menu
        this.buttons.push({obj:new MenuButton(WIDTH-100,HEIGHT-25,200,40,
                "Main Menu","white","30px Monospace"),clicked:false,
            func:function() {
                this.clicked = true;
            }});
    }

    UserInput(t) {
        if (t.type === "key") {
            if (t.key === "Escape" && t.down) {
                this.active = !this.active;
            }
        } else if (t.type === "mouseMove") {
            this.mouse.x = t.x;
            this.mouse.y = t.y;
        } else if (t.type === "mouseButton") {
            if (this.active && t.down) {
                for (let i = 0; i < this.buttons.length; i++) {
                    if (this.buttons[i].obj.Contains({x:this.mouse.x,y:this.mouse.y})) {
                        this.buttons[i].func();
                        return true;
                    }
                }
            }
        }

        return false;
    }

    Tick(dT) {
        // TODO: this is a messy solution. Better way?
        if (this.active) {
            if (this.buttons[0].clicked) {
                this.buttons[0].clicked = false;
                this.active = false;
            } else if (this.buttons[1].clicked) {
                this.buttons[1].clicked = false;
                if (confirm("You will lose progress!")) {
                    gameStage.Destroy();
                    gameStage = new MainMenu();
                }
            }
        }
    }
    
    Draw(c) {
        if (!this.active) { return; }

        c.globalAlpha = 0.7;
        c.fillStyle = "black";
        c.fillRect(0,0,WIDTH,HEIGHT);
        c.globalAlpha = 1.0;

        for (let i = 0; i < this.buttons.length; i++) {
            this.buttons[i].obj.Draw(c);
        }
    }
}

class GameUI extends GameObject {
    constructor(gs) {
        super(0,0,100,"white");
        this.mouse = {x:0,y:0};
        this.buttons = [];
        this.gameStage = gs;
        
        this.fading = true;
        this.fadingTimeMax = 2000;
        this.fadingTime = this.fadingTimeMax;

        // Music
        this.buttons.push({obj:new MenuButton(7,7,14,14,"m","white","14px Monospace",
            {drawn:true,color:"white",colorFill:"#222222",borderWidth:2}),func: function() {
                if (this.obj.text === "x") {
                    this.obj.text = "m";
                } else {
                    this.obj.text = "x";
                }
                gs.ToggleMusic();
            }});
        // Sounds
        this.buttons.push({obj:new MenuButton(21,7,14,14,"s","white","14px Monospace",
            {drawn:true,color:"white",colorFill:"#222222",borderWidth:2}),func: function() {
                if (this.obj.text === "x") {
                    this.obj.text = "s";
                } else {
                    this.obj.text = "x";
                }
                gs.ToggleSound();
            }});
            
        // Pause menu
        this.pauseUI = new PauseUI();
    }

    UserInput(t) {
        if (t.type === "mouseMove") {
            this.mouse.x = t.x;
            this.mouse.y = t.y;
        } else if (t.type === "mouseButton") {
            if (t.down) {
                for (let i = 0; i < this.buttons.length; i++) {
                    if (this.buttons[i].obj.Contains({x:this.mouse.x,y:this.mouse.y})) {
                        this.buttons[i].func();
                        return true;
                    }
                }
            }
        }

        return this.pauseUI.UserInput(t);
    }

    Tick(dT) {
        if (this.fading && this.fadingTime > 0) {
            this.fadingTime -= dT;
        } else if (this.fadingTime <= 0) {
            this.fading = false;
        }

        this.pauseUI.Tick(dT);
    }
    
    Draw(c) {
        for (let i = 0; i < this.buttons.length; i++) {
            this.buttons[i].obj.Draw(c);
        }

        // Draw fade.
        if (this.fading) {
            c.globalAlpha = (this.fadingTime/this.fadingTimeMax)**4;
            c.fillStyle = "black";
            c.fillRect(0,0,WIDTH,HEIGHT);
            c.globalAlpha = 1.0;
        }

        this.pauseUI.Draw(c);
    }
}

class PlayerUI extends GameObject {
    constructor(p) {
        super(0,0,100,"black");
        this.player = p;
    }

    Draw(c) {
        // Lives.
        let lsize = 20;
        c.fillStyle = this.player.colorFill;
        c.fillRect(WIDTH/2-lsize*2,HEIGHT-lsize-5,lsize,lsize);
        c.fillRect(WIDTH/2-lsize/2,HEIGHT-lsize-5,lsize,lsize);
        c.fillRect(WIDTH/2+lsize,HEIGHT-lsize-5,lsize,lsize);
        c.lineWidth = 3;
        c.strokeStyle = this.player.color;
        if (this.player.lives > 2) {
            c.strokeRect(WIDTH/2+lsize,HEIGHT-lsize-5,lsize,lsize);
        }
        if (this.player.lives > 1) {
            c.strokeRect(WIDTH/2-lsize/2,HEIGHT-lsize-5,lsize,lsize);
        }
        if (this.player.lives > 0) {
            c.strokeRect(WIDTH/2-lsize*2,HEIGHT-lsize-5,lsize,lsize);
        }

        // Pellet shooter.
        let wid = (1 - this.player.pelletCooldown / this.player.pelletCooldownMax)**2 * (lsize*2-10);
        c.fillStyle = "#102010";
        c.fillRect(WIDTH/2-(lsize*2-10)/2,HEIGHT-lsize-15,(lsize*2-10),5);
        c.fillStyle = "green";
        c.fillRect(WIDTH/2-wid/2,HEIGHT-lsize-15,wid,5);

        // Strafe.
        wid = (1 - this.player.strafeTimerLeft / this.player.strafeTimerMax)**2 * lsize;
        c.fillStyle = this.player.colorFill;
        c.fillRect(WIDTH/2-lsize*2,HEIGHT-lsize-15,lsize,5);
        c.fillStyle = this.player.color;
        c.fillRect(WIDTH/2-lsize*2,HEIGHT-lsize-15,wid,5);
        wid = (1 - this.player.strafeTimerRight / this.player.strafeTimerMax)**2 * lsize;
        c.fillStyle = this.player.colorFill;
        c.fillRect(WIDTH/2+lsize*2,HEIGHT-lsize-15,-lsize,5);
        c.fillStyle = this.player.color;
        c.fillRect(WIDTH/2+lsize*2,HEIGHT-lsize-15,-wid,5);
    }
}

class Player extends GameObject {
    constructor(x,y,id,gs) {
        super(x,y,0,"#404080");
        this.colorFill = "#101020";
        this.vx = 0;
        this.vy = 0;
        this.accel = 0.00025;
        this.size = 12;
        this.id = id;
        this.keys = {};
        this.mouse = {x:0,y:0,downL:false,downR:false};
        this.gameStage = gs;
        this.bounds = {left:this.x-this.size,right:this.x+this.size,
            top:this.y-this.size,bottom:this.y+this.size};
        this.angle = 0;
        this.sensors = [
            {angle:PI*0/1,dist:-1,obj:null,ray:new DebugRay(this.x,this.y,this.x,this.y,"red",false)},
            {angle:PI*1/4,dist:-1,obj:null,ray:new DebugRay(this.x,this.y,this.x,this.y,"red",false)},
            {angle:PI*1/2,dist:-1,obj:null,ray:new DebugRay(this.x,this.y,this.x,this.y,"red",false)},
            {angle:PI*3/4,dist:-1,obj:null,ray:new DebugRay(this.x,this.y,this.x,this.y,"red",false)},
            {angle:PI*1/1,dist:-1,obj:null,ray:new DebugRay(this.x,this.y,this.x,this.y,"red",false)},
            {angle:PI*5/4,dist:-1,obj:null,ray:new DebugRay(this.x,this.y,this.x,this.y,"red",false)},
            {angle:PI*3/2,dist:-1,obj:null,ray:new DebugRay(this.x,this.y,this.x,this.y,"red",false)},
            {angle:PI*7/4,dist:-1,obj:null,ray:new DebugRay(this.x,this.y,this.x,this.y,"red",false)},
        ];
        for (let i = 0; i < this.sensors.length; i++) {
            this.gameStage.Add(this.sensors[i].ray,"debug");
        }
        this.drawDebugRays = false;

        this.bumpTimer = 0.0;
        this.bumpTimerMax = 50;
        this.bumpRange = this.size;
        this.bumpFactor = 0.5;

        this.maxLives = 3;
        this.lives = this.maxLives;

        this.iframeTimer = 0;
        this.iframeTimerMax = 1200;
        this.iframeBlinkTimer = 0;
        this.iframeBlinkTimerMax = 200;
        this.iframeBlinkOn = false;
        this.iframeColor = "#808090";

        this.pelletSpeed = 0.6;
        this.pelletCooldown = 0;
        this.pelletCooldownMax = 1000;
        this.pelletWantToFire = false;

        this.playAudio = true;
        this.pelletAudio = new Audio("audio/shoot.wav");
        this.pelletAudio.volume = 0.05;
        this.accelAudio = new Audio("audio/accel.wav");
        this.accelAudio.volume = 0.1;
        this.accelAudio.loop = true;

        this.strafeTimerLeft = 0;
        this.strafeTimerRight = 0;
        this.strafeTimerMax = 800;
        this.strafeImpulse = 0.0085;

        this.exhaustCooldown = 0;
        this.exhaustCooldownMax = 50;

        this.brakeIncrement = 0.0002;

        this.debugUI = new DebugUI();
        this.gameStage.Add(this.debugUI,"debug");
        this.playerUI = new PlayerUI(this);
        this.gameStage.Add(this.playerUI,"debug");
    }

    ToggleSound() {
        this.playAudio = !this.playAudio;
    }

    Die() {
        for (let i = 0; i < this.sensors.length; i++) {
            this.sensors[i].active = false;
        }

        this.debugUI.active = false;
        this.playerUI.active = false;

        this.accelAudio.pause();
        this.pelletAudio.pause();
    }

    Hit() {
        this.lives--;
        this.iframeTimer = this.iframeTimerMax;
    }

    Contains(p) {
        return false;
    }

    Input(t) {
        if (this.gameStage.menu.pauseUI.active) { return; }

        if (t.type === "key") {
            this.keys[t.key] = t.down;

            if (t.key === "c" && t.down) {
                if (this.gameStage.camera.target == null) {
                    this.gameStage.camera.SetTarget(this);
                } else {
                    this.gameStage.camera.target = null;
                }
            } else if (t.key === "x" && t.down) {
                this.debugUI.visible = !this.debugUI.visible;
            }
        } else if (t.type === "mouseMove") {
            if (this.mouse.downR && this.gameStage.camera.target == null) {
                this.gameStage.camera.Move(this.mouse.x-t.x,this.mouse.y-t.y);
            }
            this.mouse.x = t.x;
            this.mouse.y = t.y;
        } else if (t.type === "mouseButton") {
            if (t.btn === 0) {
                this.mouse.downL = t.down;

                if (t.down) {
                    this.pelletWantToFire = true;
                }
            } else if (t.btn === 2) {
                this.mouse.downR = t.down;
            }
        }
    }

    Tick(dT) {
        if (this.gameStage.menu.pauseUI.active) { return; }

        let pos = this.gameStage.camera.ScreenPosition(this.x,this.y);
        this.angle = Math.atan2(-(this.mouse.y-pos.y),this.mouse.x-pos.x);

        if (this.exhaustCooldown > 0) {
            this.exhaustCooldown -= dT;
        }

        if (this.iframeTimer > 0) {
            this.iframeTimer -= dT;
            this.iframeBlinkTimer -= dT;
            if (this.iframeBlinkTimer <= 0) {
                this.iframeBlinkOn = !this.iframeBlinkOn;
                this.iframeBlinkTimer = this.iframeBlinkTimerMax;
            }
        } else {
            this.iframeBlinkTimer = 0;
            this.iframeBlinkOn = false;
        }

        // Forward/backward acceleration.
        if (this.keys["w"] || this.keys[" "]) {
            this.vx += cosF(this.angle) * this.accel * dT;
            this.vy -= sinF(this.angle) * this.accel * dT;
            if (this.playAudio) {
                this.accelAudio.play();
            }
            
            if (this.exhaustCooldown <= 0) {
                let ro = Math.random()*PI/8 - PI/16;
                this.gameStage.Add(new Pellet(this.x-this.size*cosF(this.angle),
                    this.y+this.size*sinF(this.angle),
                    this.vx-this.pelletSpeed*cosF(this.angle+ro),
                    this.vy+this.pelletSpeed*sinF(this.angle+ro),
                    1,"#406040",this.gameStage),"pellet");
                this.exhaustCooldown = this.exhaustCooldownMax;
            }
        } else if (this.keys["s"]) {
            let vm = Distance(0,0,this.vx,this.vy);
            let ang = Math.atan2(this.vy,this.vx);
            if (vm > this.brakeIncrement * dT) {
                vm -= this.brakeIncrement * dT;
                this.vx = cosF(ang) * vm;
                this.vy = sinF(ang) * vm;
            } else {
                this.vx = 0;
                this.vy = 0;
            }
        } else {
            this.accelAudio.pause();
        }

        // Strafing.
        if (this.strafeTimerLeft > 0) {
            this.strafeTimerLeft -= dT;
        }
        if (this.strafeTimerRight > 0) {
            this.strafeTimerRight -= dT;
        }

        if (this.keys["a"]) {
            if (this.strafeTimerLeft <= 0) {
                this.vx += cosF(this.angle + PI/2) * this.strafeImpulse * dT;
                this.vy -= sinF(this.angle + PI/2) * this.strafeImpulse * dT;
                this.strafeTimerLeft = this.strafeTimerMax;
            }
        } else if (this.keys["d"]) {
            if (this.strafeTimerRight <= 0) {
                this.vx += cosF(this.angle - PI/2) * this.strafeImpulse * dT;
                this.vy -= sinF(this.angle - PI/2) * this.strafeImpulse * dT;
                this.strafeTimerRight = this.strafeTimerMax;
            }
        }

        this.x += this.vx * dT;
        this.y += this.vy * dT;

        let numHits = 0;
        let maxDist = -1;
        let maxDistIdx = -1;
        let castDist = this.size*2;
        let castStep = 2;
        for (let i = 0; i < this.sensors.length; i++) {
            let rc = Raycast(this.x,this.y,this.sensors[i].angle,castDist,
                this.gameStage.world,this.gameStage.terrain,castStep);
            if (this.drawDebugRays) {
                this.sensors[i].ray.x = this.x;
                this.sensors[i].ray.y = this.y;
            }
            if (rc.hit) {
                if (this.drawDebugRays) {
                    this.sensors[i].ray.x2 = rc.hitpt.x;
                    this.sensors[i].ray.y2 = rc.hitpt.y;
                    this.sensors[i].ray.color = "red";
                }
                this.sensors[i].obj = rc.obj;
                this.sensors[i].dist = rc.dist;
                if (rc.dist <= this.bumpRange) {
                    numHits++;
                }
                if (rc.dist > maxDist) {
                    maxDist = rc.dist;
                    maxDistIdx = i;
                }
            } else {
                if (this.drawDebugRays) {
                    this.sensors[i].ray.x2 = this.x+castDist*cosF(this.sensors[i].angle);
                    this.sensors[i].ray.y2 = this.y-castDist*sinF(this.sensors[i].angle);
                    this.sensors[i].ray.color = "green";
                }
                this.sensors[i].dist = -1;
                if (castDist > maxDist) {
                    maxDist = castDist;
                    maxDistIdx = i;
                }
            }
        }
        
        if (numHits > 0) {
            if (this.iframeTimer <= 0) {
                this.Hit();
            }
        }
        
        if (this.bumpTimer <= 0) {
            if (numHits < 8) {
                let hits = {left:false,right:false,up:false,down:false};
                // Right sensor hit.
                if (this.sensors[0].dist !== -1 && this.sensors[0].dist <= this.bumpRange) {
                    this.bumpTimer = this.bumpTimerMax;
                    this.vx = this.vx > 0 ? -this.vx*this.bumpFactor : this.vx;
                    this.x -= this.bumpRange - this.sensors[0].dist;
                    hits.right = true;
                } 
                // Left sensor.
                if (this.sensors[4].dist !== -1 && this.sensors[4].dist <= this.bumpRange) {
                    this.bumpTimer = this.bumpTimerMax;
                    this.vx = this.vx < 0 ? -this.vx*this.bumpFactor : this.vx;
                    this.x += this.bumpRange - this.sensors[4].dist + 1;
                    hits.left = true;
                }
                // Up sensor.
                if (this.sensors[2].dist !== -1 && this.sensors[2].dist <= this.bumpRange) {
                    this.bumpTimer = this.bumpTimerMax;
                    this.vy = this.vy < 0 ? -this.vy*this.bumpFactor : this.vy;
                    this.y += this.bumpRange - this.sensors[2].dist + 1;
                    hits.up = true;
                }
                // Down sensor.
                if (this.sensors[6].dist !== -1 && this.sensors[6].dist <= this.bumpRange) {
                    this.bumpTimer = this.bumpTimerMax;
                    this.vy = this.vy > 0 ? -this.vy*this.bumpFactor : this.vy;
                    this.y -= this.bumpRange - this.sensors[6].dist + 1;
                    hits.down = true;
                }
                // Up-Right sensor.
                if (!hits.up && !hits.right && this.sensors[1].dist !== -1 &&
                        this.sensors[1].dist <= this.bumpRange) {
                    this.bumpTimer = this.bumpTimerMax;
                    this.vx = this.vx > 0 ? -this.vx*this.bumpFactor : this.vx;
                    this.vy = this.vy < 0 ? -this.vy*this.bumpFactor : this.vy;
                    this.x -= this.bumpRange/2 - this.sensors[1].dist/2 + 1;
                    this.y -= this.bumpRange/2 - this.sensors[1].dist/2 + 1;
                }
                // Up-Left sensor.
                if (!hits.up && !hits.left && this.sensors[3].dist !== -1 &&
                        this.sensors[3].dist <= this.bumpRange) {
                    this.bumpTimer = this.bumpTimerMax;
                    this.vx = this.vx < 0 ? -this.vx*this.bumpFactor : this.vx;
                    this.vy = this.vy < 0 ? -this.vy*this.bumpFactor : this.vy;
                    this.x += this.bumpRange/2 - this.sensors[3].dist/2 + 1;
                    this.y -= this.bumpRange/2 - this.sensors[3].dist/2 + 1;
                }
                // Down-Left sensor.
                if (!hits.down && !hits.left && this.sensors[5].dist !== -1 &&
                        this.sensors[5].dist <= this.bumpRange) {
                    this.bumpTimer = this.bumpTimerMax;
                    this.vx = this.vx < 0 ? -this.vx*this.bumpFactor : this.vx;
                    this.vy = this.vy > 0 ? -this.vy*this.bumpFactor : this.vy;
                    this.x += this.bumpRange/2 - this.sensors[5].dist/2 + 1;
                    this.y += this.bumpRange/2 - this.sensors[5].dist/2 + 1;
                }
                // Down-Right sensor.
                if (!hits.down && !hits.right && this.sensors[7].dist !== -1 &&
                        this.sensors[7].dist <= this.bumpRange) {
                    this.bumpTimer = this.bumpTimerMax;
                    this.vx = this.vx > 0 ? -this.vx*this.bumpFactor : this.vx;
                    this.vy = this.vy > 0 ? -this.vy*this.bumpFactor : this.vy;
                    this.x -= this.bumpRange/2 - this.sensors[7].dist/2 + 1;
                    this.y -= this.bumpRange/2 - this.sensors[7].dist/2 + 1;
                }
            } else {
                this.vx = 0;
                this.vy = 0;
            }
        } else {
            this.bumpTimer -= dT;
        }
        
        // Adjust bounds.
        this.bounds = {left:this.x-this.size,right:this.x+this.size,
            top:this.y-this.size,bottom:this.y+this.size};

        // Pellet stuff.
        if (this.pelletCooldown <= 0) {
            if (this.pelletWantToFire) {
                this.gameStage.Add(new Pellet(this.x,this.y,this.vx+this.pelletSpeed*cosF(this.angle),
                    this.vy-this.pelletSpeed*sinF(this.angle),3,"green",this.gameStage),"pellet");
                this.pelletWantToFire = false;
                this.pelletCooldown = this.pelletCooldownMax;
                if (this.playAudio) {
                    this.pelletAudio.play();
                }
            }
        } else {
            this.pelletCooldown -= dT;
            this.pelletWantToFire = false;
        }
    }

    Draw(c) {
        if (!this.gameStage.camera.InCam(this)) { return; }

        let pos = this.gameStage.camera.ScreenPosition(this.x,this.y);
        let poss = [];
        poss.push(this.gameStage.camera.ScreenPosition(this.x+cosF(this.angle)*this.size,
            this.y-sinF(this.angle)*this.size));
        poss.push(this.gameStage.camera.ScreenPosition(this.x+cosF(this.angle+PI*3/4)*this.size,
            this.y-sinF(this.angle+PI*3/4)*this.size));
        poss.push(this.gameStage.camera.ScreenPosition(this.x+cosF(this.angle+PI)*this.size/3,
            this.y-sinF(this.angle+PI)*this.size/3));
        poss.push(this.gameStage.camera.ScreenPosition(this.x+cosF(this.angle+PI*5/4)*this.size,
            this.y-sinF(this.angle+PI*5/4)*this.size));
        c.beginPath();
        c.moveTo(poss[0].x,poss[0].y);
        for (let i = 1; i < poss.length; i++) {
            c.lineTo(poss[i].x,poss[i].y);
        }
        c.closePath();
        c.fillStyle = this.colorFill;
        c.fill();
        c.lineWidth = 3*this.gameStage.camera.zoom;
        c.strokeStyle = this.color;
        if (this.iframeBlinkOn) {
            c.strokeStyle = this.iframeColor;
        }
        c.stroke();
    }
}

class Triangle extends GameObject {
    constructor(p1,p2,p3,c,dts,gs) {
        super(0,0,-1,c);
        this.colorFill = "#200404";
        let l = p1.x <= p2.x && p1.x <= p3.x ? p1.x : p2.x <= p1.x && p2.x <= p3.x ? p2.x : p3.x;
        let r = p1.x >= p2.x && p1.x >= p3.x ? p1.x : p2.x >= p1.x && p2.x >= p3.x ? p2.x : p3.x;
        let t = p1.y <= p2.y && p1.y <= p3.y ? p1.y : p2.y <= p1.y && p2.y <= p3.y ? p2.y : p3.y;
        let b = p1.y >= p2.y && p1.y >= p3.y ? p1.y : p2.y >= p1.y && p2.y >= p3.y ? p2.y : p3.y;
        this.bounds = {left:l,right:r,top:t,bottom:b};
        this.x = (l+r)/2;
        this.y = (t+b)/2;
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;
        this.thirdSideDraw = dts;
        this.gameStage = gs;
        this.areaSquared = Math.sqrt(AOTS(this.p1,this.p2,this.p3));
    }

    Contains(p) {
        // First, ensure the point is within the bounds of this object
        if (p.x < this.bounds.left || p.x > this.bounds.right || 
                p.y < this.bounds.top || p.y > this.bounds.bottom) {
            return false;
        }

        let area1 = Math.sqrt(AOTS(this.p1,this.p2,p));
        let area2 = Math.sqrt(AOTS(this.p2,this.p3,p));
        let area3 = Math.sqrt(AOTS(this.p1,this.p3,p));

        if (area1 + area2 + area3 <= this.areaSquared) {
            return true;
        }

        return false;
    }

    Tick(dT){}

    Draw(c) {
        let sp1 = this.gameStage.camera.ScreenPosition(this.p1.x,this.p1.y);
        let sp2 = this.gameStage.camera.ScreenPosition(this.p2.x,this.p2.y);
        let sp3 = this.gameStage.camera.ScreenPosition(this.p3.x,this.p3.y);

        c.beginPath();
        c.moveTo(sp1.x,sp1.y);
        c.lineTo(sp2.x,sp2.y);
        c.lineTo(sp3.x,sp3.y);
        if (this.thirdSideDraw) {
            c.closePath();
        }
        c.fillStyle = this.colorFill;
        c.fill();
        c.lineWidth = 3*this.gameStage.camera.zoom;
        c.strokeStyle = this.color;
        c.stroke();
    }
}

// Rectangles are a combination of two rectangles. As of now, they can only be drawn if exactly
// square with the viewport.
class Rectangle extends GameObject {
    constructor(l,t,r,b,c,gs) {
        super((l+r)/2,(b+t)/2,-1,c);
        this.t1 = new Triangle({x:l,y:t},{x:l,y:b},{x:r,y:b},c,false,gs);
        this.t2 = new Triangle({x:l,y:t},{x:r,y:t},{x:r,y:b},c,false,gs);
    }

    Contains(p) {
        return this.t1.Contains(p) || this.t2.Contains(p);
    }
    
    Tick(dT){
        this.t1.Tick(dT);
        this.t2.Tick(dT);
    }

    Draw(c) {
        this.t1.Draw(c);
        this.t2.Draw(c);
    }
}

class Pellet extends GameObject {
    constructor(x,y,vx,vy,s,c,gs) {
        super(x,y,0,c);
        this.size = s;
        this.vx = vx;
        this.vy = vy;
        this.gameStage = gs;
        // Adjust bounds.
        this.bounds = {left:this.x-this.size,right:this.x+this.size,
            top:this.y-this.size,bottom:this.y+this.size};

        this.lifetime = 2000;
    }

    Contains(p) { return false; }

    Tick(dT) {
        if (this.gameStage.menu.pauseUI.active) { return; }

        this.lifetime -= dT;

        this.x += this.vx * dT;
        this.y += this.vy * dT;

        // Adjust bounds.
        this.bounds = {left:this.x-this.size,right:this.x+this.size,
            top:this.y-this.size,bottom:this.y+this.size};

        let rc = Raycast(this.x,this.y,0,1,this.gameStage.world,this.gameStage.terrain,1);

        if (rc.hit || this.lifetime <= 0) {
            this.active = false;
        }
    }

    Draw(c) {
        if (!this.gameStage.camera.InCam(this)) { return; }

        let pos = this.gameStage.camera.ScreenPosition(this.x, this.y);
        c.beginPath();
        c.arc(pos.x,pos.y,this.size*this.gameStage.camera.zoom,0,TWOPI);
        c.lineWidth = 3*this.gameStage.camera.zoom;
        c.strokeStyle = this.color;
        c.stroke();
    }
}

class Camera {
    constructor(l,r,t,b) {
        this.bounds = {left:l,right:r,top:t,bottom:b};
        this.x = (l+r)/2;
        this.y = (b+t)/2;
        this.width = r-l;
        this.height = b-t;
        this.target = null;
        this.tracking = false;
        this.trackingFactor = 0.004;
        this.zoom = 1.0;
        this.shouldSmoothZoom = true;
        this.smoothZooming = false;
        this.targetZoom = 1.0;
        this.maxSmoothZoomIncrement = 0.05;
    }
    
    SetTarget(o) {
        if (o === null) {
            this.tracking = false;
        } else {
            this.tracking = true;
        }
        this.target = o;
    }

    InCam(o) {
        return !(this.bounds.right < o.bounds.left || this.bounds.left > o.bounds.right ||
            this.bounds.top > o.bounds.bottom || this.bounds.bottom < o.bounds.top);
    }

    ScreenPosition(x,y) {
        return {x:(x-this.x+this.width/2)*this.zoom,y:(y-this.y+this.height/2)*this.zoom};
    }

    Move(x,y) {
        x /= this.zoom;
        y /= this.zoom;
        this.bounds.left += x;
        this.bounds.right += x;
        this.x += x;
        this.bounds.top += y;
        this.bounds.bottom += y;
        this.y += y;
    }

    _Zoom(f) {
        this.zoom *= f;
        this.width /= f;
        this.height /= f;
        this.bounds = {left:this.x-this.width/2,right:this.x+this.width/2,
            top:this.y-this.height/2,bottom:this.y+this.height/2};
    }

    Zoom(f) {
        if (this.shouldSmoothZoom) {
            this.targetZoom = this.zoom*f;
            this.smoothZooming = true;
        } else {
            this._Zoom(f);
        }
    }

    ZoomTo(z) {
        if (this.shouldSmoothZoom) {
            this.targetZoom = z;
            this.smoothZooming = true;
        } else {
            this._Zoom(z/this.zoom);
        }
    }

    Tick(dT) {
        if (this.target && this.tracking) {
            let dx = 0;
            let dy = 0;
            if (typeof this.target.vx !== undefined) {
                dx = this.target.x - this.x + this.target.vx*300;
                dy = this.target.y - this.y + this.target.vy*300;
            } else {
                dx = this.target.x - this.x;
                dy = this.target.y - this.y;
            }

            this.Move(dx*this.trackingFactor * dT, dy*this.trackingFactor * dT);
        }

        if (this.smoothZooming) {
            let dZ = (this.targetZoom-this.zoom)/10;
            if (Math.abs(dZ) < 0.0002) {
                this.smoothZooming = false;
                this._Zoom(this.targetZoom/this.zoom);
            } else if (Math.abs(dZ) > this.maxSmoothZoomIncrement) {
                this._Zoom(1+Math.sign(dZ)*this.maxSmoothZoomIncrement);
            } else {
                this._Zoom(1+dZ);
            }
        }
    }
}

class GameStage {
    constructor() {
        this.world = [];
        this.terrain = [];
        this.players = [];
        this.pellets = [];
        this.debugObjs = [];
        this.drawOrder = [];
        this.camera = new Camera(-WIDTH/2,WIDTH/2,-HEIGHT/2,HEIGHT/2);
        this.localPlayerID = -1;
        this.zoomable = true;
        this.zoomFactor = 1.1;
    }

    Destroy() {
        for (let i = 0; i < this.players.length; i++) {
            this.world[this.players[i]].Die();
        }
    }

    Add(o,t) {
        if (t === "player") {
            this.players.push(this.world.length);
        } else if (t === "terrain") {
            this.terrain.push(this.world.length);
        } else if (t === "debug") {
            this.debugObjs.push(this.world.length);
        } else if (t === "pellet") {
            this.pellets.push(this.world.length);
        }

        this.world.push(o);

        // TODO: i dont think this must be done every time something is added
        this.AdjustDrawOrder();
    }

    // Removes an object at index i from the world. This will also cascade to other arrys to keep
    //     things manageable. NOTE: static objects should appear AS EARLY AS POSSIBLE in the world
    //     array in order to run things as fast as possible.
    Remove(i) {
        // remove from terrain.
        for (let j = 0; j < this.terrain.length; j++) {
            if (this.terrain[j] === i) {
                this.terrain.splice(j,1);
                j--;
            } else if (this.terrain[j] > i) {
                this.terrain[j]--;
            }
        }

        // remove from players.
        for (let j = 0; j < this.players.length; j++) {
            if (this.players[j] === i) {
                this.players.splice(j,1);
                j--;
            } else if (this.players[j] > i) {
                this.players[j]--;
            }
        }

        // remove from pellets.
        for (let j = 0; j < this.pellets.length; j++) {
            if (this.pellets[j] === i) {
                this.pellets.splice(j,1);
                j--;
            } else if (this.pellets[j] > i) {
                this.pellets[j]--;
            }
        }

        // remove from debugobjs.
        for (let j = 0; j < this.debugObjs.length; j++) {
            if (this.debugObjs[j] === i) {
                this.debugObjs.splice(j,1);
                j--;
            } else if (this.debugObjs[j] > i) {
                this.debugObjs[j]--;
            }
        }
        
        // remove from drawOrder.
        for (let j = 0; j < this.drawOrder.length; j++) {
            if (this.drawOrder[j] === i) {
                this.drawOrder.splice(j,1);
                j--;
            } else if (this.drawOrder[j] > i) {
                this.drawOrder[j]--;
            }
        }

        this.world.splice(i,1);
    }

    AdjustDrawOrder() {
        this.drawOrder = [];
        for (let i = 0; i < this.world.length; i++) {
            let z = this.world[i].z;

            // TODO: use a binary search since this array is ordered
            let added = false;
            for (let j = 0; j < this.drawOrder.length; j++) {
                if (z < this.world[this.drawOrder[j]].z) {
                    this.drawOrder.splice(j,0,i);
                    added = true;
                    break;
                }
            }
            if (!added) {
                this.drawOrder.push(i);
            }
        }
    }

    UserInput(t) {
        if (this.zoomable && t.type === "mouseWheel") {
            if (t.dY < 0) {
                this.camera.Zoom(this.zoomFactor);
            } else {
                this.camera.Zoom(1/this.zoomFactor);
            }
        }
        if (this.localPlayerID === -1 || this.world.length === 0) { return; }

        // Apply user input to the local player.
        this.world[this.players[this.localPlayerID]].Input(t);
    }

    Tick(dT) {
        this.camera.Tick(dT);

        // Tick in reverse order so things can be removed.
        for (let i = this.world.length-1; i >= 0; i--) {
            this.world[i].Tick(dT);
            if (!this.world[i].active) {
                this.Remove(i);
            }
        }
    }

    Draw(c) {
        c.fillStyle = "black";
        c.fillRect(0,0,WIDTH,HEIGHT);

        for (let i = 0; i < this.drawOrder.length; i++) {
            this.world[this.drawOrder[i]].Draw(c);
        }
    }
}

class Testground extends GameStage {
    constructor() {
        super();
        this.Add(new Player(0,0,this.localPlayerID,this),"player");
        this.localPlayerID = 0;

        this.Add(new Triangle({x:-200,y:-120},{x:300,y:-100},{x:0,y:-300},"red",true,this),"terrain");
        this.Add(new Triangle({x:-500,y:100},{x:500,y:200},{x:0,y:600},"red",true,this),"terrain");
        this.Add(new Rectangle(200,-200,400,200,"red",this),"terrain");

        this.Add(new Triangle({x:-300,y:200},{x:-800,y:-100},{x:-900,y:400},"red",true,this),"terrain");
        
        this.bgmusic = new Audio("audio/bgmusic.mp3");
        this.bgmusic.volume = 0.4;
        this.bgmusic.volume = 0; // DEBUG
        this.bgmusic.loop = true;
        this.bgmusic.play();

        this.menu = new GameUI(this);
        this.Add(this.menu,"debug");
    }

    Destroy() {
        super.Destroy();

        this.bgmusic.pause();
    }

    ToggleMusic() {
        if (this.bgmusic.paused) {
            this.bgmusic.play();
        } else {
            this.bgmusic.pause();
        }
    }

    ToggleSound() {
        for (let i = 0; i < this.players.length; i++) {
            this.world[this.players[i]].ToggleSound();
        }
    }
    
    UserInput(t) {
        if (!this.menu.UserInput(t)) {
            if (!this.menu.pauseUI.active) {
                super.UserInput(t);
            }
        }
    }

    Tick(dT) {
        super.Tick(dT);

        if (this.world[this.players[this.localPlayerID]] && 
                this.world[this.players[this.localPlayerID]].lives <= 0) {
            this.world[this.players[this.localPlayerID]].Die();
            this.camera.SetTarget(null);
            this.Remove(this.players[this.localPlayerID]);
            this.localPlayerID = 0;
            this.Add(new Player(0,0,this.localPlayerID,this),"player");
        }
    }
}

class MainMenu extends GameStage {
    constructor() {
        super();

        this.zoomable = false;

        this.menu = new MainMenuUI();
        this.Add(this.menu,"debug");
    }

    UserInput(t) {
        super.UserInput(t);

        this.menu.UserInput(t);
    }
}

class LevelsMenu extends GameStage {
    constructor() {
        super();
        
        this.zoomable = false;

        this.menu = new LevelsUI();
        this.Add(this.menu,"debug");
    }

    UserInput(t) {
        super.UserInput(t);

        this.menu.UserInput(t);
    }
}
