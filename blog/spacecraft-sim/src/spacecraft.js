
class Spacecraft {
  constructor() {
    this.time = Date.now();
  }

  Tick() {
    let now = Date.now();
    this.dT = now - this.time;
    this.time = now;
  }
}
