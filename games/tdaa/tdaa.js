// Sky Hoffert
// tdaa.js code file
// Last Modified Nov 17, 2019

var scene = new THREE.Scene();
var renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setClearColor("#000000");
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create a basic perspective camera.
var camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);

// Creat a "ship".
var ship = new Ship();
ship.add(camera);
scene.add(ship.mesh);
camera.position.z = 3;
camera.position.y = 2;
camera.rotation.x = -Math.PI/16;

// Create a Cube Mesh with basic material.
var geometry = new THREE.IcosahedronGeometry(1, 1);
var material = new THREE.MeshPhongMaterial({color: "#222222", flatShading: true});
var sphere = new THREE.Mesh(geometry, material);
sphere.position.set(1, 2, -5);

// Add cube to Scene.
scene.add(sphere);

// Add a "sun" light to the screen.
const light = new THREE.DirectionalLight(0xFFFFFF, 2);
light.position.set(10, 10, 5);
light.target.position.set(0, 0, 0);
scene.add(light);
scene.add(light.target);

// Add an ambient light.
scene.add(new THREE.AmbientLight(0xFFFFFF, 0.5));

// For FPS calculations.
const UPS = 60;
const UDR = 1000 / UPS;
var prevTime = Date.now();
var input = new Input();

function Tick(dT) {
    if (input.keys["d"]) {
        ship.Accelerate(new THREE.Vector3(0.0005 * dT, 0, 0));
    } else if (input.keys["a"]) {
        ship.Accelerate(new THREE.Vector3(-0.0005 * dT, 0, 0));
    } else if (input.keys["w"]) {
        ship.Accelerate(new THREE.Vector3(0, 0, -0.0005 * dT));
    } else if (input.keys["s"]) {
        ship.Accelerate(new THREE.Vector3(0, 0, 0.0005 * dT));
    } else if (input.keys["Shift"]) {
        ship.Accelerate(new THREE.Vector3(0, 0.0005 * dT, 0));
    } else if (input.keys["c"]) {
        ship.Accelerate(new THREE.Vector3(0, -0.0005 * dT, 0));
    }

    if (input.mouse.down) {
        ship.mesh.rotateZ(input.mouse.dx * dT * 0.0005);
        ship.mesh.rotateX(-input.mouse.dy * dT * 0.0005);
        input.mouse.dx = 0;
        input.mouse.dy = 0;
    }

    ship.Tick(dT);
}

var render = function () {
    let now = Date.now();
    let diff = now - prevTime;

    // If we should update/render.
    if (diff > UDR) {
        prevTime = now;

        Tick(diff);
        
        renderer.render(scene, camera);
    }

    requestAnimationFrame(render);
};

render();

document.addEventListener("mousemove", function (evt) {
    if (input.mouse.x !== -1) {
        // Only true if first setting up mouse.
        input.mouse.dx = input.mouse.x - evt.x;
        input.mouse.dy = input.mouse.y - evt.y;
    }
    input.mouse.x = evt.x;
    input.mouse.y = evt.y;
}, false);

document.addEventListener("mousedown", function (evt) {
    input.mouse.down = true;
    input.mouse.downX = evt.x;
    input.mouse.downY = evt.y;
}, false);

document.addEventListener("mouseup", function (evt) {
    input.mouse.down = false;
}, false);

document.addEventListener("keydown", function (evt) {
    input.keys[evt.key] = true;
}, false);

document.addEventListener("keyup", function (evt) {
    input.keys[evt.key] = false;
}, false);