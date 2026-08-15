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
  wallCheckHeightsStand: [0.3, 1.4],
  wallCheckHeightsCrouch: [0.3, 0.8],
  groundProbeUp: 0.5,
  groundProbeDown: 5,
  leanDistance: 0.5,
  leanTilt: 0.18,
  leanSpeed: 6,
  leanClearance: 0.15,
  lookSensitivity: 0.0022,
  pitchLimit: Math.PI / 2 - 0.01, // radians - clamps how far up/down the camera can look, just under straight up/down
  interactRadius: 2.2, // meters - how far the player can reach to interact with something (see interaction.js)
  dropReach: 8, // meters - how far a drag-out-of-inventory drop (see inventory.js's ejectItemToWorld()) can raycast to find somewhere to land
  // inventory.js's main grid size (the hand paperdoll is always its own fixed 2x1, separate
  // from this). Clamped to a max of 8x8 there, regardless of what's requested here.
  inventory: {
    columns: 2,
    rows: 2,
  },
  // hold.js: how a hand-carried world prop (real physics body) is sprung toward the camera.
  hold: {
    distance: 1, // meters in front of the camera
    sideOffset: 0.2, // meters left/right of center per hand
    rotateSensitivity: 0.008, // radians per pixel of mouse movement while ctrl-rotating
    springStiffness: 450, // N/m pulling the held body toward the hold point
    springDamping: 42, // resists that pull proportional to current velocity, kept near critical damping (2*sqrt(stiffness*mass)) as stiffness changes so it doesn't get oscillatory
    maxForce: 900, // N, clamps the pull so a far-away pickup doesn't snap violently
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
    // held centered instead of offset to a side, and rotated to lay across the view
    // left-to-right instead of pointing away from the camera.
    twoHand: {
      distance: 0.5,
      downOffset: 0.3,
      rotationX: 0.0,
      rotationY: Math.PI, // an extra 90° (yaw) past the one-handed pose so it lies flat across the view instead of pointing forward
      rotationZ: Math.PI / 2,
    },
  },
};

export function setPlayerStats(stats) {
  Object.assign(playerStats, stats);
}
