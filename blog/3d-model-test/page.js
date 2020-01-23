//
// Sky Hoffert
// 3D Model Test
//

var canvas = document.getElementById("canvas");
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, 4/3, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer({canvas:canvas});
renderer.setSize(800, 600);

var loader = new THREE.GLTFLoader();

var charScene = null;
var charAnims = null;
var charAnimMixer = null;

// Load a glTF resource
loader.load(
	// resource URL
	"Model.glb",
	// called when the resource is loaded
	function ( gltf ) {
        charScene = gltf.scene;
        charScene.position.y = -3;

		scene.add(charScene);

        charAnims = gltf.animations; // Array<THREE.AnimationClip>
        charAnimMixer = new THREE.AnimationMixer(charScene);
	},
	function ( xhr ) {
		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
	function ( error ) {
		console.log( 'An error happened' );
	}
);

var light = new THREE.AmbientLight( 0x606060 ); // soft white light
var light2 = new THREE.PointLight(0xaaaaaa, 1, 200);
light2.position.set(50,10,10);
scene.add(light);
scene.add(light2);

var g = new THREE.BoxGeometry(3,3,3);
var m = new THREE.MeshPhongMaterial({color:0x884455,side:THREE.DoubleSide,flatShading:true});
var p = new THREE.Mesh(g,m);
p.rotation.x = Math.PI/2;
p.position.y = -4.5;
scene.add(p);

camera.position.z = 6;

var clock = new THREE.Clock();

var playing = false;

function animate() {
    if (charScene !== null) {
        scene.rotation.y += 0.005;

        if (!playing) {
            playing = true;
            charAnimMixer.clipAction(charAnims[0]).play();
        }

        let dT = clock.getDelta();
        charAnimMixer.update(dT);
    }

    renderer.render( scene, camera );
    
    requestAnimationFrame( animate );
}
animate();
