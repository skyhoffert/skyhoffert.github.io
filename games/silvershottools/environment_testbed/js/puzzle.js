// Generic "focus mode" for in-world minigames (combo locks today - see comboLock.js; a keypad,
// safe, or card game could plug into this same layer later). Entering a puzzle just flips
// puzzleActive, which movement.js/attack.js/hold.js/main.js each check the same way they already
// check document.pointerLockElement, so the player stands still and can't swing/grab anything
// while fiddling with a lock. Pointer lock itself stays engaged the whole time (unlike
// inventory.js's or wieldDebug.js's DOM panels, which exit it) - mouse-look keeps working, so the
// player aims at whatever sub-part of the puzzle (a dial, a button, ...) the same way they aim at
// anything else in the world; the puzzle module itself does its own raycast against just its own
// geometry to figure out what's under the crosshair (see comboLock.js's hoveredDial()).
//
// There's no explicit "cancel" here - Escape (or alt-tab, or anything else that drops pointer
// lock) already releases the mouse via the browser itself, same as everywhere else in the game
// (see the "Esc = release mouse" hint), and the pointerlockchange listener below just treats that
// as leaving the puzzle too.

import { canvas, interactPromptEl } from "./dom.js";

export let puzzleActive = false;
let exitCallback = null; // whatever the current puzzle module passed to enterPuzzle(), or null

// onExit is called whenever the puzzle ends, solved or not - e.g. comboLock.js uses it to forget
// which lock was focused.
export function enterPuzzle(onExit) {
  puzzleActive = true;
  exitCallback = onExit || null;
  // main.js stops calling interaction.js's updateInteractables() (which normally drives this)
  // while puzzleActive, so the prompt would otherwise stay frozen showing whatever it said the
  // instant before - e.g. still "[F] Try combination" once already inside the puzzle.
  interactPromptEl.classList.remove("visible");
}

export function exitPuzzle() {
  if (!puzzleActive) return;
  puzzleActive = false;
  const cb = exitCallback;
  exitCallback = null;
  if (cb) cb();
}

document.addEventListener("pointerlockchange", () => {
  if (puzzleActive && document.pointerLockElement !== canvas) exitPuzzle();
});

// See menu.js's return-to-main-menu flow.
export function resetPuzzle() {
  puzzleActive = false;
  exitCallback = null;
}
