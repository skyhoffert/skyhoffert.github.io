// Sky Hoffert
// tdaa-classes.js : classes for tdaa
// Last Modified on Nov 17, 2019

class Input {
    constructor() {
        this.mouse = {"x":-1, "y":0, "down":false, "downX":0, "downY":0, "dx":0, "dy":0};
        this.keys = {"w":false, "a":false, "s":false, "d":false};
    }
}

class Ship {
    constructor() {
        this.size = 0.5;
        this.color = 0x00ff00;

        let shipGeom = new THREE.BoxGeometry(this.size, this.size, this.size);
        // DEBUG : some more interesting shape than a box
        shipGeom = new THREE.IcosahedronGeometry(this.size, 0);
        let shipMat = new THREE.MeshPhongMaterial({color: this.color, flatShading: true});
        this.mesh = new THREE.Mesh(shipGeom, shipMat);

        this.vel = new THREE.Vector3(0, 0, 0);
        this.slowFactor = 0.95;
    }

    add(obj) {
        this.mesh.add(obj);
    }

    Accelerate(v) {
        let mag = v.length();
        v.applyMatrix4((new THREE.Matrix4()).extractRotation(this.mesh.matrix));
        this.vel.add(v);
    }

    Tick(dT) {
        this.mesh.position.add(this.vel);

        this.vel.multiplyScalar(this.slowFactor);
    }
}
