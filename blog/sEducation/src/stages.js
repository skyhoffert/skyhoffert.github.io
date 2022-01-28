
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

    this.player_spawn_x = 400;
    this.player_spawn_y = 250;

    this.key_spawn_x = 320;
    this.key_spawn_y = 600;
    this.key_pickup_sqr_dist = 800;

    this.player_has_key = false;

    this.door_x = 510;
    this.door_y = 190;

    this.door_unlock_sqr_dist = 2500;

    this.AddSprite({id:"map", x: 400, y: 500, width: 800, height: 800, filename: "debug_map.png",
      draw_layer: 1});

    this.AddSprite({id:"key", x: this.key_spawn_x, y: this.key_spawn_y, width: 40, height: 40, 
      filename: "key.png", draw_layer: 1});

    this.AddSprite({id:"player", x: this.player_spawn_x, y: this.player_spawn_y, width: 90,
            height: 90, filename: "test_image.png"});
            
    this.AddSprite({id:"crate", x: 505, y: 325, width: 80, height: 80, filename: "crate.png"});

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

    this.AdjustPlayerCollisionBox();
  }

  MovePlayer(x, y) {
    if (x < 0) {
      if (this.sprites.player.scale.x > 0) {
        this.sprites.player.scale.x *= -1;
        if (this.player_has_key) {
          this.sprites.key.scale.x *= -1;
        }
      }
    } else {
      if (this.sprites.player.scale.x < 0) {
        this.sprites.player.scale.x *= -1;
        if (this.player_has_key) {
          this.sprites.key.scale.x *= -1;
        }
      }
    }
    this.sprites.player.x += x;
    this.sprites.player.y += y;
    this.AdjustPlayerCollisionBox();

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
      this.AdjustPlayerCollisionBox();
  
      G_needs_update = true;
    }
  }

  Pickup() {
    if (this.player_has_key === true) { return; }

    if (sSqrDist(this.sprites.player.x, this.sprites.player.y, this.key_spawn_x, this.key_spawn_y) <
        this.key_pickup_sqr_dist) {
      this.player_has_key = true;

      this.MoveSpriteDrawLayer("key", 3);
    }
  }

  Use() {
    if (this.player_has_key === false) { return; }

    if (sSqrDist(this.sprites.player.x, this.sprites.player.y, this.door_x, this.door_y) <
        this.door_unlock_sqr_dist) {
      this.player_has_key = false;
      this.sprites.key.x = -100;
      this.sprites.key.y = -100;
      this.Win();
    }
  }

  Win() {
    this.Stop(false);

    document.getElementById("div_win").style.display = "block";
  }

  AdjustPlayerCollisionBox() {
    this.player_left = this.sprites.player.x - 29;
    this.player_right = this.sprites.player.x + 29;
    this.player_top = this.sprites.player.y - 38;
    this.player_bottom = this.sprites.player.y + 38;
  }

  Update(dT) {
    this.sprites.crate.rotation += 0.0002 * dT;

    if (this.player_has_key === true) {
      this.sprites.key.x = this.sprites.player.x;
      this.sprites.key.y = this.sprites.player.y;
    }

    // This code moves the screen so that it follows the player. Only really matters for laptops.
    let move_y = 0;
    let move_speed = 0.1;
    if (this.sprites.player.y > kHeight*0.8) {
      move_y = -move_speed;
    } else if (this.sprites.player.y < kHeight*0.2) {
      move_y = move_speed;
    }
    
    if (sFuzzyEquals(move_y, 0) === false) {
      for (let k in this.sprites) {
        this.sprites[k].y += move_y * dT;
      }
      for (let i = 0; i < this.collision_rects.length; i++) {
        this.collision_rects[i].y += move_y * dT;
      }
      this.door_y += move_y * dT;
      this.key_spawn_y += move_y * dT;
      this.player_spawn_y += move_y * dT;
    }
  }

  // When the "Reset" button is pressed, first we must stop the action.
  Stop(reset=true) {
    if (G_running === true) {
      // Raise flag for runner.js code to catch.
      G_stop_for_reset = true;

      for (let k in G_lerpers) {
        G_lerpers[k].elapsed = G_lerpers[k].dur;
      }
      for (let k in G_lurkers) {
        G_lerpers[k].active = false;
      }
    }

    if (reset === false) { return; }

    this.Reset();
  }

  Reset() {
    document.getElementById("div_win").style.display = "none";
    document.getElementById("p_next_scenario").innerHTML = "";

    this.sprites.player.x = this.player_spawn_x;
    this.sprites.player.y = this.player_spawn_y;

    this.player_has_key = false;
    this.sprites.key.x = this.key_spawn_x;
    this.sprites.key.y = this.key_spawn_y;
    this.MoveSpriteDrawLayer("key", 1);
  }

  Draw() {
    if (kDrawDebug === false) { return; }
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

    G_graphics[3].lineStyle(1, 0x222288);
    G_graphics[3].drawCircle(this.key_spawn_x, this.key_spawn_y, sSqrt(this.key_pickup_sqr_dist));

    G_graphics[3].lineStyle(1, 0x222288);
    G_graphics[3].drawCircle(this.door_x, this.door_y, sSqrt(this.door_unlock_sqr_dist));
  }
};
