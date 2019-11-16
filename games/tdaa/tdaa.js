// Sky Hoffert
// tdaa.js code file
// Last Modified Nov 15, 2019

var scene = new THREE.Scene();

var renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setClearColor("#000000");
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// Create a basic perspective camera.
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

// Creat a "ship".
const SHIPSIZE = 0.5;
var shipGeom = new THREE.BoxGeometry(SHIPSIZE, SHIPSIZE, SHIPSIZE);
var shipMat = new THREE.MeshPhongMaterial({color: 0x00ff00});
var ship = new THREE.Mesh(shipGeom, shipMat);
ship.add(camera);
scene.add(ship);
camera.position.z = 5;
camera.position.y = 2;
camera.rotation.x = -Math.PI/8;

// Debug
var dir = new THREE.Vector3(1, 2, 0).normalize();
var devArrow = new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), 1, 0xffff00);
scene.add(devArrow);

// Create a Cube Mesh with basic material.
var geometry = new THREE.IcosahedronGeometry(1, 1);
var material = new THREE.MeshPhongMaterial({color: "#433F81", flatShading: true});
var sphere = new THREE.Mesh(geometry, material);

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
var keys = {};

function Tick(dT) {
    if (keys["d"]) {
        ship.translateX(0.001 * dT);
    } else if (keys["a"]) {
        ship.translateX(-0.001 * dT);
    } else if (keys["w"]) {
        ship.translateZ(-0.001 * dT);
    } else if (keys["s"]) {
        ship.translateZ(0.001 * dT);
    } else if (keys["A"]) {
        ship.rotateY(0.001 * dT);
    } else if (keys["D"]) {
        ship.rotateY(-0.001 * dT);
    } else if (keys["W"]) {
        //ship.rotateX(0.001 * dT);
    } else if (keys["S"]) {
        //ship.rotateX(-0.001 * dT);
    }

    devArrow.position.set(ship.position.x, ship.position.y, ship.position.z);
    let dir = new THREE.Vector3(Math.sin(ship.rotation.y), 0, -Math.cos(ship.rotation.y));
    devArrow.setLength(dir.length());
    devArrow.setDirection(dir.normalize());
    console.log(dir);
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

document.addEventListener("keydown", function (evt) {
    keys[evt.key] = true;
}, false);

document.addEventListener("keyup", function (evt) {
    keys[evt.key] = false;
}, false);