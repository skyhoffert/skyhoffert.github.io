
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

    this.AddSprite({id:"player", x: 400, y: 600, width: 100, 
            height: 100, filename: "test_image.png"});
  }

  Update(dT) {

  }
};
