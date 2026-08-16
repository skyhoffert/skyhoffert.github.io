// Live player movement/capability stats, loaded from player.json (see constants.js's
// PLAYER_STATS_URL) via setPlayerStats(), called once from menu.js's loadWorld() before
// gameplay starts. Every module that needs one of these (movement.js, lean.js, hold.js,
// wield.js, pointerlock.js) just imports `playerStats` and reads the property directly - since
// it's the same object mutated in place (not reassigned), every importer sees the loaded values
// automatically, no per-module setter needed. The defaults below (matching player.json's own
// values) are just a safety net for the brief window before that fetch resolves.
export const playerStats = {
  eyeHeight: 1.7,
  crouchEyeHeight: 1.0,
  walkSpeed: 4.5,
  runMult: 2.2,
  jumpSpeed: 6.5,
  crouchSpeedMult: 0.5,
  crouchTransitionSpeed: 6,
  radius: 0.4,
  // Sampled densely (not just knee/head) so a thin horizontal obstacle - a desktop, a shelf -
  // still gets caught by at least one sample even though it only occupies a thin slice of this
  // range; two sparse samples could both miss it entirely, letting the player walk straight
  // through (see movement.js's clampAxisMove()).
  wallCheckHeightsStand: [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4],
  wallCheckHeightsCrouch: [0.2, 0.4, 0.6, 0.8, 1.0],
  groundProbeUp: 0.5,
  groundProbeDown: 5,
  leanDistance: 0.5,
  leanTilt: 0.18,
  leanSpeed: 6,
  leanClearance: 0.15,
  lookSensitivity: 0.0022,
  pitchLimit: Math.PI / 2 - 0.01, // radians - clamps how far up/down the camera can look, just under straight up/down
  interactRadius: 1.6, // meters - how far the player can reach to interact with something (see interaction.js)
  dropReach: 8, // meters - how far a drag-out-of-inventory drop (see inventory.js's ejectItemToWorld()) can raycast to find somewhere to land
  // inventory.js's main grid size (the hand paperdoll is always its own fixed 2x1, separate
  // from this). Clamped to a max of 8x8 there, regardless of what's requested here.
  inventory: {
    columns: 2,
    rows: 2,
  },
  // hold.js: how a hand-carried world prop (real physics body) is sprung toward the camera.
  hold: {
    distance: 0.75, // meters in front of the camera
    sideOffset: 0.2, // meters left/right of center per hand
    rotateSensitivity: 0.008, // radians per pixel of mouse movement while ctrl-rotating
    springStiffness: 450, // N/m pulling the held body toward the hold point
    springDamping: 42, // resists that pull proportional to current velocity, kept near critical damping (2*sqrt(stiffness*mass)) as stiffness changes so it doesn't get oscillatory
    maxForce: 900, // N, clamps the pull so a far-away pickup doesn't snap violently
    angularDamping: 0.99, // 0-1 (1 = near-instant stop), cannon-es Body.angularDamping while held - kills off any twirl left over from before pickup (falling, thrown, bumped, ...) instead of carrying it into your hand; released bodies go back to the cannon-es default so a throw still tumbles normally
    // How fast the held body turns to follow wherever it was sitting *relative to the camera*
    // at pickup (or last ctrl-rotate - see applyHoldTorque()), so it loosely turns along with
    // you as you look around instead of staying fixed in world space. Drives angularVelocity
    // directly rather than a torque/stiffness spring - these props are small enough that their
    // rotational inertia is tiny, so even a modest torque against it spun the body up
    // explosively instead of settling. Roughly "closes this fraction of the remaining
    // orientation gap per second" - lower = looser/laggier follow, higher = snappier.
    rotFollowSpeed: 6,
  },
  // wield.js: how an inventory-equipped item (camera-child viewmodel, no physics) is posed.
  // rotationX/Y/Z tilt in radians - Z (roll) mirrors between hands (handL gets the negated
  // angle, like an opposite wrist twist); X (pitch) and Y (yaw) apply the same to both.
  wield: {
    distance: 0.35, // meters in front of the camera
    sideOffset: 0.25, // meters left/right of center per hand
    downOffset: 0.25, // meters below the camera
    rotationX: 0.0,
    rotationY: Math.PI / 2,
    rotationZ: 0.0,
    // A two-handed item (see inventory.js's grid - one occupying both hand cells at once) is
    // held centered instead of offset to a side. Which of these two poses it uses depends on
    // its weapons.json type (see wield.js's twoHandRotation()/twoHandTargetPosition()) - a
    // melee weapon (e.g. the shovel) is rotated to lay across the view left-to-right instead of
    // pointing away from the camera, like something carried at the ready; a gun (e.g. the
    // shotgun) keeps pointing forward, like something aimed down its sights.
    twoHand: {
      distance: 0.5,
      downOffset: 0.3,
      sideOffset: 0.0,
      rotationX: 0.0,
      rotationY: Math.PI, // an extra 90° (yaw) past the one-handed pose so it lies flat across the view instead of pointing forward
      rotationZ: Math.PI / 2,
      // A roll around the camera's own forward axis, applied on top of the rotationX/Y/Z pose
      // above (not mixed into it - see wield.js's twoHandRotation()), so the item angles up
      // toward whichever end it's currently facing rather than lying perfectly level. Mirrors
      // along with everything else, so it flips consistently for either grip direction - tune
      // to taste (and its sign - flip it if the slope comes out backwards).
      tiltAngle: 0.3,
    },
    // Same idea as twoHand above, but for a two-handed gun - rotationY matches the one-handed
    // pose (points forward) rather than twoHand's extra 90°. rotationZ is a small cant/tilt
    // (mirrors the same way as twoHand's, so swapping which hand grips which end - see
    // inventory.js's syncHandsFromGrid() - still visibly does something); tiltAngle is unused
    // here (0) since there's no "which end is up" concept for something pointing straight out.
    twoHandGun: {
      distance: 0.46,
      downOffset: 0.24,
      sideOffset: 0.13,
      rotationX: 0.0,
      rotationY: 1.59840734641021,
      rotationZ: 0.0,
      tiltAngle: 0.0,
    },
  },
};

export function setPlayerStats(stats) {
  Object.assign(playerStats, stats);
}
