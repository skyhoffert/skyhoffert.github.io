// cannon-es world plus the shape-building shared by props, static map geometry, and the door.
// Only OBJ_ props are simulated as dynamic bodies here. The player keeps its own raycast-based
// movement/collision (a generic rigid-body character controller is its own can of worms - see
// movement.js), so this world only ever contains: one static body per typed COLL_ mesh in the
// map, one kinematic body for the door, and one dynamic compound body (built from
// COLL_BOX_/COLL_SPHERE_/COLL_CYLINDER_ children) per spawned prop.

import * as THREE from "three";
import * as CANNON from "../../vendor/cannon-es.js";
import { worldStats } from "./worldConfig.js";
import {
  COLLISION_PREFIX,
  COLL_BOX_PREFIX,
  COLL_SPHERE_PREFIX,
  COLL_CYLINDER_PREFIX,
  CYLINDER_SEGMENTS,
  PROP_MASS,
} from "./constants.js";

// Built with whatever worldStats.gravity currently is - at this point (module-init time,
// synchronous) that's just its default, since world.json hasn't loaded yet. syncGravity(),
// called once world.json has (see menu.js's loadWorld()), re-applies the real value: unlike
// every other worldStats field, this one's baked into a separate CANNON.Vec3 rather than read
// live off worldStats each use, so it needs that explicit follow-up.
export const world = new CANNON.World({ gravity: new CANNON.Vec3(0, worldStats.gravity, 0) });
world.allowSleep = true; // resting props stop being simulated until something disturbs them

export function syncGravity() {
  world.gravity.set(0, worldStats.gravity, 0);
}

export const physicsObjects = new Map(); // OBJ_ instance -> { body, centerOffset }

// Turns one COLL_BOX_/COLL_SPHERE_/COLL_CYLINDER_ mesh into a cannon shape plus its offset
// (position + rotation) relative to some reference frame. For props that reference is the
// prop root's inverse world matrix (so the shape rides correctly wherever it sits in the
// prop's hierarchy); for static map colliders it's the identity matrix, which makes the
// "offset" just the mesh's own world transform.
export function colliderToShape(collider, referenceInverseMatrix) {
  const relMatrix = new THREE.Matrix4().multiplyMatrices(referenceInverseMatrix, collider.matrixWorld);
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  relMatrix.decompose(position, quaternion, scale);

  const geom = collider.geometry;
  let shape = null;
  // Offset (in the collider's own local space) from its object origin/pivot to its actual
  // geometric center - a CANNON shape is always centered on its own origin, but the mesh's
  // pivot isn't necessarily at its geometry's center (e.g. a floor slab pivoted at its
  // bottom face so it can be placed flush with the ground), so this has to be corrected for.
  const localCenter = new THREE.Vector3();

  if (collider.name.startsWith(COLL_BOX_PREFIX)) {
    geom.computeBoundingBox();
    const bb = geom.boundingBox;
    bb.getCenter(localCenter);
    shape = new CANNON.Box(
      new CANNON.Vec3(
        ((bb.max.x - bb.min.x) * scale.x) / 2,
        ((bb.max.y - bb.min.y) * scale.y) / 2,
        ((bb.max.z - bb.min.z) * scale.z) / 2
      )
    );
  } else if (collider.name.startsWith(COLL_SPHERE_PREFIX)) {
    geom.computeBoundingSphere();
    localCenter.copy(geom.boundingSphere.center);
    shape = new CANNON.Sphere(geom.boundingSphere.radius * scale.x); // non-uniform scale can't be represented by a sphere
  } else if (collider.name.startsWith(COLL_CYLINDER_PREFIX)) {
    geom.computeBoundingBox();
    const bb = geom.boundingBox;
    bb.getCenter(localCenter);
    const radius = (Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * scale.x) / 2;
    const height = (bb.max.y - bb.min.y) * scale.y;
    shape = new CANNON.Cylinder(radius, radius, height, CYLINDER_SEGMENTS);
  }

  if (!shape) return null;

  position.add(localCenter.multiply(scale).applyQuaternion(quaternion));
  return { shape, position, quaternion };
}

// Builds one dynamic compound body for a spawned prop instance from all of its
// COLL_BOX_/COLL_SPHERE_/COLL_CYLINDER_ children (there can be more than one).
function shapeDebugString(shape) {
  if (shape instanceof CANNON.Box) {
    return `Box half-extents (${shape.halfExtents.x.toFixed(2)}, ${shape.halfExtents.y.toFixed(2)}, ${shape.halfExtents.z.toFixed(2)})`;
  }
  if (shape instanceof CANNON.Sphere) return `Sphere radius ${shape.radius.toFixed(2)}`;
  if (shape instanceof CANNON.Cylinder) return `Cylinder radius ${shape.radiusTop.toFixed(2)} height ${shape.height.toFixed(2)}`;
  return "unknown shape";
}

export function buildPropBody(instance) {
  console.log(`Building physics body for "${instance.name}":`);
  instance.updateMatrixWorld(true);
  // Deliberately excludes the instance's own scale (unlike the identity matrix used for static
  // map colliders below): cannon-es shapes carry no scale of their own, so a collision child's
  // size/offset needs to come out in world-sized units. Inverting the instance's *full* world
  // matrix here would cancel that scale back out, leaving shapes sized in the mesh's raw
  // pre-export-scale units instead - invisible for props whose root happens to export at scale
  // 1, but wildly wrong (and physics-exploding) for any prop baked down by some other factor.
  const instancePos = new THREE.Vector3();
  const instanceQuat = new THREE.Quaternion();
  const instanceScale = new THREE.Vector3();
  instance.matrixWorld.decompose(instancePos, instanceQuat, instanceScale);
  const instanceWorldInverse = new THREE.Matrix4().compose(instancePos, instanceQuat, new THREE.Vector3(1, 1, 1)).invert();

  const body = new CANNON.Body({ mass: PROP_MASS });
  let hasShape = false;

  instance.traverse((child) => {
    if (!child.isMesh || !child.name.startsWith(COLLISION_PREFIX)) return;
    const result = colliderToShape(child, instanceWorldInverse);
    if (!result) {
      console.warn(`"${child.name}" on "${instance.name}" doesn't match COLL_BOX_/COLL_SPHERE_/COLL_CYLINDER_; skipping.`);
      return;
    }
    body.addShape(result.shape, result.position, result.quaternion);
    hasShape = true;
    console.log(`  "${child.name}" -> ${shapeDebugString(result.shape)} at (${result.position.x.toFixed(2)}, ${result.position.y.toFixed(2)}, ${result.position.z.toFixed(2)})`);
  });

  if (!hasShape) {
    console.warn(`"${instance.name}" has no recognized collision children; using its visual bounds as a fallback box.`);
    const size = new THREE.Box3().setFromObject(instance).getSize(new THREE.Vector3());
    body.addShape(
      new CANNON.Box(new CANNON.Vec3(Math.max(size.x, 0.05) / 2, Math.max(size.y, 0.05) / 2, Math.max(size.z, 0.05) / 2))
    );
  }

  body.position.copy(instance.position);
  body.quaternion.copy(instance.quaternion);
  return body;
}

const IDENTITY_MATRIX = new THREE.Matrix4();

export function hasTypedCollisionPrefix(name) {
  return name.startsWith(COLL_BOX_PREFIX) || name.startsWith(COLL_SPHERE_PREFIX) || name.startsWith(COLL_CYLINDER_PREFIX);
}

// Builds a static body for one map COLL_BOX_/COLL_SPHERE_/COLL_CYLINDER_ mesh. cannon-es's
// narrowphase only supports Trimesh contact against Sphere and Plane (not Box or Cylinder -
// there's no dispatch entry for it at all), so map collision has to be built from the same
// typed primitives as props rather than an arbitrary Trimesh, or dynamic props would just
// fall straight through. Only called for meshes hasTypedCollisionPrefix() already confirmed
// match one of those, so the null case below is a defensive fallback, not the normal path
// for a plain "COLL_" (player-only) collider - those are intentionally never passed in.
export function buildStaticColliderBody(mesh) {
  const result = colliderToShape(mesh, IDENTITY_MATRIX);
  if (!result) {
    console.warn(`"${mesh.name}" matched a typed COLL_ prefix but colliderToShape() still failed to build a shape for it.`);
    return;
  }
  const body = new CANNON.Body({ mass: 0 });
  body.addShape(result.shape, result.position, result.quaternion);
  world.addBody(body);
}

// Steps the world (real rigid-body dynamics - falling, tumbling, resting contact on the map's
// static collider bodies) and copies each prop's resulting transform onto its three.js mesh.
// Forces (e.g. the hold spring - see hold.js's applyHeldForces()) must be applied before this
// runs each frame; this only steps and reads the result back out.
// Tears the world back down to empty - see menu.js's return-to-main-menu flow.
export function resetPhysicsWorld() {
  [...world.bodies].forEach((body) => world.removeBody(body));
  physicsObjects.clear();
}

export function stepPhysics(dt) {
  world.step(1 / 60, dt, 3);
  for (const [obj, phys] of physicsObjects) {
    obj.position.set(phys.body.position.x, phys.body.position.y, phys.body.position.z);
    obj.quaternion.set(phys.body.quaternion.x, phys.body.quaternion.y, phys.body.quaternion.z, phys.body.quaternion.w);
  }
}
