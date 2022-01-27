
class Stage extends Entity {
  constructor() {
    super({"id":"stage", "x":0, "y":0});
    this.active = true;

    G_content.visible = true;
  }

  Reset() {}
};

class DebugStage extends Stage {
  constructor() {
    super();

    this.AddSprite({id:"map", x: 400, y: 500, width: 800, 
      height: 800, filename: "debug_map.png"});

    this.AddSprite({id:"key", x: 320, y: 600, width: 40,
      height: 40, filename: "key.png"});

    this.AddSprite({id:"player", x: 400, y: 250, width: 90, 
            height: 90, filename: "test_image.png"});
            
    this.AddSprite({id:"crate", x: 505, y: 325, width: 80, 
      height: 80, filename: "crate.png"});

    this.collision_rects = [];

    // Walls.
    this.collision_rects.push({x:130, y:500, w:50, h:600}); // Left wall.
    this.collision_rects.push({x:670, y:500, w:50, h:800}); // Right wall.
    this.collision_rects.push({x:400, y:120, w:500, h:50}); // Top wall.
    this.collision_rects.push({x:400, y:900, w:500, h:50}); // Bottom wall.
    
    // Bottom left angled wall.
    this.collision_rects.push({x:290, y:855, w:50, h:50});
    this.collision_rects.push({x:245, y:810, w:50, h:50});
    this.collision_rects.push({x:200, y:765, w:50, h:50});
    this.collision_rects.push({x:155, y:720, w:50, h:50});

    // Top left barrels.
    this.collision_rects.push({x:178, y:240, w:50, h:70});
    this.collision_rects.push({x:225, y:200, w:50, h:70});
    this.collision_rects.push({x:255, y:160, w:150, h:70});

    // Center boxes.
    this.collision_rects.push({x:426, y:435, w:246, h:160}); // Main large.
    this.collision_rects.push({x:532, y:530, w:50, h:40}); // Bottem right barrel.
    this.collision_rects.push({x:465, y:370, w:170, h:50}); // Red crate.
    this.collision_rects.push({x:418, y:342, w:40, h:25}); // Top tip.
    this.collision_rects.push({x:440, y:512, w:160, h:80}); // Big green.
    this.collision_rects.push({x:430, y:570, w:95, h:40}); // Bottom small green.
    this.collision_rects.push({x:270, y:455, w:70, h:40}); // Left small green.

    this.player_left = this.sprites.player.x - 29;
    this.player_right = this.sprites.player.x + 29;
    this.player_top = this.sprites.player.y - 38;
    this.player_bottom = this.sprites.player.y + 38;
  }

  MovePlayer(x, y) {
    if (x < 0) {
      if (this.sprites.player.scale.x > 0) {
        this.sprites.player.scale.x *= -1;
      }
    } else {
      if (this.sprites.player.scale.x < 0) {
        this.sprites.player.scale.x *= -1;
      }
    }
    this.sprites.player.x += x;
    this.sprites.player.y += y;

    this.player_left = this.sprites.player.x - 25;
    this.player_right = this.sprites.player.x + 25;
    this.player_top = this.sprites.player.y - 40;
    this.player_bottom = this.sprites.player.y + 40;

    G_needs_update = true;

    let coll = false;
    for (let i = 0; i < this.collision_rects.length; i++) {
      let r = this.collision_rects[i];
      if (sContains(this.player_left, this.player_top, r.x, r.y, r.w, r.h)) {
        coll = true;
        break;
      }
      if (sContains(this.player_left, this.player_bottom, r.x, r.y, r.w, r.h)) {
        coll = true;
        break;
      }
      if (sContains(this.player_right, this.player_top, r.x, r.y, r.w, r.h)) {
        coll = true;
        break;
      }
      if (sContains(this.player_right, this.player_bottom, r.x, r.y, r.w, r.h)) {
        coll = true;
        break;
      }
    }

    if (coll) {
      this.sprites.player.x -= x;
      this.sprites.player.y -= y;

      this.player_left = this.sprites.player.x - 25;
      this.player_right = this.sprites.player.x + 25;
      this.player_top = this.sprites.player.y - 40;
      this.player_bottom = this.sprites.player.y + 40;
  
      G_needs_update = true;
    }
  }

  Update(dT) {
    this.sprites.crate.rotation += 0.0001 * dT;
  }

  Draw() {
    if (DRAW_DEBUG === false) { return; }
    for (let i = 0; i < this.collision_rects.length; i++) {
      let r = this.collision_rects[i];
      G_graphics[3].beginFill(0, 0);
      G_graphics[3].lineStyle(1, 0x228822);
      G_graphics[3].drawRect(r.x - r.w/2, r.y - r.h/2, r.w, r.h);
      G_graphics[3].endFill();
    }
    
    G_graphics[3].beginFill(0,0);
    G_graphics[3].lineStyle(1, 0x440404);
    G_graphics[3].drawRect(this.player_left, this.player_top,
      this.player_right - this.player_left, this.player_bottom - this.player_top);
    G_graphics[3].endFill();
  }
};
