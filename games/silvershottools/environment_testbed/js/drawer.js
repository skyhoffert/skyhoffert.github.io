// Drawers: any object prefixed "DRAWER_" (see constants.js's DRAWER_PREFIX) becomes its own
// independent open/close state machine plus its own kinematic collision body and positional
// open/close sounds - the sliding equivalent of door.js's rotating doors. Wired up by map.js
// once the map's loaded and each drawer's COLL_ children are found - one setupDrawer() call per
// drawer object, each with its own axis/slideDistance/speed from the map's JSON sidecar (falling
// back to constants.js's DRAWER_AXIS/DRAWER_SLIDE_DISTANCE/DRAWER_SPEED for whatever it doesn't
// customize) - unlike a door's hinge, which axis a drawer should even slide along varies with
// how it happened to be modeled/oriented in Blender, so it's per-instance config rather than a
// single hardcoded axis.
//
// A drawer can optionally start locked (drawerCfg.locked), same idea as door.js's own locked
// door - F does nothing while locked. Nothing in this module ever clears it itself; that's
// lock.js's or comboLock.js's job, whichever's paired with this drawer by name (see
// unlockDrawer() below) - once cleared, a drawer behaves exactly like one that was never locked.

import * as THREE from "three";
import * as CANNON from "../../vendor/cannon-es.js";
import { world, colliderToShape, worldInverseNoScale, wakeNearbyBodies } from "./physics.js";
import { registerInteractable } from "./interaction.js";
import { listener, audioLoader, playOneShot } from "./audio.js";
import { registerSound, unregisterSound } from "./settings.js";
import { DOOR_SOUND_REF_DISTANCE, DRAWER_AXIS, DRAWER_SLIDE_DISTANCE, DRAWER_SPEED, WAKE_RADIUS } from "./constants.js";

let drawers = []; // [{ object, axisKey, closedValue, openValue, speed, target, isOpen, settled, body, openSound, closeSound }]

// Scratch vectors for reading a drawer's *world* position - cannon-es only understands world
// space, but a DRAWER_ object's own .position is local to whatever it's parented under (e.g.
// the desk), so copying it directly into the body would only be correct for a drawer sitting
// unparented at the scene root. Reused (not per-call) since setupDrawer()/updateDrawers() are
// never reentrant with each other.
const drawerWorldPos = new THREE.Vector3();
const drawerWorldQuat = new THREE.Quaternion();

// "x"/"y"/"z", optionally "-" prefixed for the opposite direction (e.g. "-z") - see
// constants.js's DRAWER_AXIS and the map JSON sidecar's per-drawer "axis" field.
function resolveAxis(axisStr) {
  const s = String(axisStr).trim().toLowerCase();
  const sign = s.startsWith("-") ? -1 : 1;
  const key = s.replace(/^[+-]/, "");
  if (key !== "x" && key !== "y" && key !== "z") {
    console.warn(`drawer.js: unrecognized axis "${axisStr}", falling back to "z"`);
    return { key: "z", sign };
  }
  return { key, sign };
}

function toggleDrawer(drawer) {
  if (drawer.locked) return; // still locked - only unlockDrawer() (called by lock.js/comboLock.js) can clear this
  drawer.isOpen = !drawer.isOpen;
  drawer.target = drawer.isOpen ? drawer.openValue : drawer.closedValue;
  drawer.settled = false;
  // Anything resting in/on the drawer (e.g. a revolver spawned into it) may be asleep - see
  // physics.js's wakeNearbyBodies(). Radius-limited (rather than waking the whole world, like an
  // earlier version of this did) so opening one drawer doesn't also stir awake unrelated props
  // sitting elsewhere in the map.
  drawer.object.updateMatrixWorld();
  drawer.object.getWorldPosition(drawerWorldPos);
  wakeNearbyBodies(drawerWorldPos, WAKE_RADIUS);
  // Reuses door.js's open/close sounds - a drawer pulling/pushing on runners reads close enough
  // to a door swinging that there's no need for dedicated assets yet.
  if (drawer.isOpen) playOneShot(drawer.openSound);
}

// Called once per DRAWER_-prefixed object from map.js's setupMap(), with that drawer's object,
// its (possibly empty) COLL_ children found during the map traversal, and its config from the
// map's JSON sidecar ({ axis?, slideDistance?, speed? }, keyed by object name) - any field it
// omits (or omitting the config entirely) falls back to the matching DRAWER_* constant, so a
// drawer only needs an entry at all for whatever it wants to customize.
export function setupDrawer(drawerObj, drawerColliders, drawerCfg) {
  const openSound = new THREE.PositionalAudio(listener);
  const closeSound = new THREE.PositionalAudio(listener);
  [openSound, closeSound].forEach((sound) => {
    sound.setRefDistance(DOOR_SOUND_REF_DISTANCE);
    registerSound(sound, "sfx", 1);
  });
  audioLoader.load("assets/sounds/door_open.wav", (buffer) => openSound.setBuffer(buffer));
  audioLoader.load("assets/sounds/door_close.wav", (buffer) => closeSound.setBuffer(buffer));
  drawerObj.add(openSound);
  drawerObj.add(closeSound);

  const { key: axisKey, sign: axisSign } = resolveAxis(drawerCfg.axis ?? DRAWER_AXIS);
  const closedValue = drawerObj.position[axisKey];
  const drawer = {
    object: drawerObj,
    axisKey,
    closedValue,
    openValue: closedValue + axisSign * (drawerCfg.slideDistance ?? DRAWER_SLIDE_DISTANCE),
    speed: drawerCfg.speed ?? DRAWER_SPEED,
    target: closedValue,
    isOpen: false,
    settled: true, // starts already at rest in the closed position - no sound on load
    body: null,
    openSound,
    closeSound,
    locked: !!drawerCfg.locked,
  };
  drawers.push(drawer);

  registerInteractable(drawerObj, {
    promptText: () => (drawer.locked ? "[F] Locked" : drawer.isOpen ? "[F] Close drawer" : "[F] Open drawer"),
    onActivate: () => toggleDrawer(drawer),
  });

  if (drawerColliders.length === 0) {
    console.warn(`"${drawerObj.name}" has no COLL_ children (none found nested under it in the scene graph) - it won't block anything physically.`);
  } else {
    // Kinematic rather than static: its transform is driven by updateDrawers() each frame
    // instead of by the solver, but it still generates real contact against dynamic props.
    drawerObj.updateMatrixWorld(true);
    const drawerWorldInverse = worldInverseNoScale(drawerObj);
    const drawerBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
    drawerColliders.forEach((collider) => {
      const result = colliderToShape(collider, drawerWorldInverse);
      if (result) drawerBody.addShape(result.shape, result.position, result.quaternion);
      else console.warn(`"${collider.name}" on "${drawerObj.name}" doesn't match COLL_BOX_/COLL_SPHERE_/COLL_CYLINDER_; skipping.`);
    });
    if (drawerBody.shapes.length > 0) {
      // drawerObj.matrixWorld is already current - updateMatrixWorld(true) ran a few lines up.
      drawerObj.getWorldPosition(drawerWorldPos);
      drawerObj.getWorldQuaternion(drawerWorldQuat);
      drawerBody.position.set(drawerWorldPos.x, drawerWorldPos.y, drawerWorldPos.z);
      drawerBody.quaternion.set(drawerWorldQuat.x, drawerWorldQuat.y, drawerWorldQuat.z, drawerWorldQuat.w);
      world.addBody(drawerBody);
      drawer.body = drawerBody;
    } else {
      console.warn(`"${drawerObj.name}" had COLL_ children but none produced a usable shape.`);
    }
  }
}

// Called by lock.js's tryUnlock() or comboLock.js's solveLock() once a paired lock/combo is
// satisfied - clears .locked so a plain F now opens the drawer normally. A no-op (beyond the
// warning) if drawerName doesn't match any known drawer - same reasoning as door.js's unlockDoor().
export function unlockDrawer(drawerName) {
  const drawer = drawers.find((d) => d.object.name === drawerName);
  if (!drawer) {
    console.warn(`unlockDrawer: no drawer named "${drawerName}" (check the lock's "drawer" field in the map's JSON sidecar).`);
    return;
  }
  drawer.locked = false;
}

// See menu.js's return-to-main-menu flow. setupDrawer() builds fresh ones on the next load.
export function resetDrawers() {
  drawers.forEach((drawer) => {
    unregisterSound(drawer.openSound);
    unregisterSound(drawer.closeSound);
  });
  drawers = [];
}

export function updateDrawers(dt) {
  drawers.forEach((drawer) => {
    const obj = drawer.object;
    const current = obj.position[drawer.axisKey];
    const diff = drawer.target - current;
    if (Math.abs(diff) > 0.001) {
      obj.position[drawer.axisKey] = current + Math.sign(diff) * Math.min(Math.abs(diff), drawer.speed * dt);
    } else if (!drawer.settled) {
      obj.position[drawer.axisKey] = drawer.target;
      drawer.settled = true;
      if (!drawer.isOpen) playOneShot(drawer.closeSound);
    }
    // Kinematic bodies aren't touched by the solver, so its collision box has to be driven by
    // hand - orientation never changes (it only slides), only position. Same local-vs-world
    // distinction as setupDrawer() above: obj.position just changed, so obj.matrixWorld needs a
    // refresh (cheap - this doesn't have a moving parent, so no need to force the whole
    // ancestor chain) before reading the drawer's actual world position back out of it.
    if (drawer.body) {
      obj.updateMatrixWorld();
      obj.getWorldPosition(drawerWorldPos);
      // Also set .velocity, not just .position - the solver reads a kinematic body's velocity
      // (not its position delta) to work out friction against anything resting on it, so
      // without this a prop sitting in the drawer (e.g. a revolver placed on it via a SPAWN_
      // marker) would just stay put in world space while the drawer's collision box slides out
      // from under it instead of being dragged along with it. Zero once the drawer settles,
      // same as everything just standing still on a surface that's stopped moving.
      const invDt = dt > 0 ? 1 / dt : 0;
      drawer.body.velocity.set(
        (drawerWorldPos.x - drawer.body.position.x) * invDt,
        (drawerWorldPos.y - drawer.body.position.y) * invDt,
        (drawerWorldPos.z - drawer.body.position.z) * invDt
      );
      drawer.body.position.set(drawerWorldPos.x, drawerWorldPos.y, drawerWorldPos.z);
    }
  });
}
