// Live wield-pose tuning panel (P to toggle) - sliders/number inputs bound directly to
// playerStats.wield's position/rotation fields (see playerConfig.js) for all three wielded
// poses (one-handed, two-handed melee, two-handed gun), so a pose can be dialed in by eye
// in-game instead of guessing numbers and reloading. Nothing here is persisted - it edits the
// live playerStats object in place (same one wield.js reads every repose), so once a pose looks
// right the values shown in the JSON readout at the bottom are what should be copied back into
// player.json by hand.

import { playerStats } from "./playerConfig.js";
import { getWielded, getWieldedStats, reposeWielded } from "./wield.js";
import { canvas } from "./dom.js";
import { requestLock } from "./pointerlock.js";

let wieldDebugOn = false;

const panelEl = document.getElementById("wieldDebug");

// scene.js's camera has a near-clip plane at 0.1 - a distance slider allowed to go all the way
// to 0 would let the item cross in front of it and vanish (clipped, not just "very close"), so
// its minimum is kept a little above that instead of the natural-seeming 0.
const DISTANCE_MIN = 0.15;

// Each section edits one pose config object (see playerConfig.js's playerStats.wield); "which"
// identifies how to tell whether that pose is the one actually visible right now (see
// sectionStatusText() below).
const SECTIONS = [
  {
    title: "One-Hand (handL / handR)",
    which: "hand",
    target: () => playerStats.wield,
    fields: [
      { key: "distance", label: "distance", min: DISTANCE_MIN, max: 1.5 },
      { key: "sideOffset", label: "side offset", min: 0, max: 1 },
      { key: "downOffset", label: "down offset", min: 0, max: 1 },
      { key: "rotationX", label: "rotation X", angle: true },
      { key: "rotationY", label: "rotation Y", angle: true },
      { key: "rotationZ", label: "rotation Z", angle: true },
    ],
  },
  {
    title: "Two-Hand: melee",
    which: "melee",
    target: () => playerStats.wield.twoHand,
    fields: [
      { key: "distance", label: "distance", min: DISTANCE_MIN, max: 1.5 },
      { key: "downOffset", label: "down offset", min: 0, max: 1 },
      { key: "sideOffset", label: "side offset", min: -1, max: 1 },
      { key: "rotationX", label: "rotation X", angle: true },
      { key: "rotationY", label: "rotation Y", angle: true },
      { key: "rotationZ", label: "rotation Z", angle: true },
      { key: "tiltAngle", label: "tilt angle", angle: true },
    ],
  },
  {
    title: "Two-Hand: gun",
    which: "gun",
    target: () => playerStats.wield.twoHandGun,
    fields: [
      { key: "distance", label: "distance", min: DISTANCE_MIN, max: 1.5 },
      { key: "downOffset", label: "down offset", min: 0, max: 1 },
      { key: "sideOffset", label: "side offset", min: -1, max: 1 },
      { key: "rotationX", label: "rotation X", angle: true },
      { key: "rotationY", label: "rotation Y", angle: true },
      { key: "rotationZ", label: "rotation Z", angle: true },
      { key: "tiltAngle", label: "tilt angle", angle: true },
    ],
  },
];

const ANGLE_MIN = -Math.PI;
const ANGLE_MAX = Math.PI;
const STEP = 0.01;

const statusEls = []; // { el, section } - refreshed each frame while open, see refreshStatus()
const pullFns = []; // re-reads every field's slider/number from playerStats - see setWieldDebugOpen()
const jsonOutEl = document.createElement("textarea");
jsonOutEl.readOnly = true;
jsonOutEl.addEventListener("focus", () => jsonOutEl.select());

function refreshJsonOut() {
  jsonOutEl.value = JSON.stringify(playerStats.wield, null, 2);
}

// Range + number inputs kept in sync with each other and with target()[field.key] - whichever
// one the user just touched wins, then both are re-read from the object so they can't drift.
function buildFieldRow(target, field) {
  const min = field.angle ? ANGLE_MIN : field.min;
  const max = field.angle ? ANGLE_MAX : field.max;

  const row = document.createElement("div");
  row.className = "wieldRow";

  const head = document.createElement("div");
  head.className = "rowHead";
  const labelEl = document.createElement("span");
  labelEl.textContent = field.label;
  const numberEl = document.createElement("input");
  numberEl.type = "number";
  numberEl.step = STEP;
  numberEl.min = min;
  numberEl.max = max;
  head.append(labelEl, numberEl);

  const rangeEl = document.createElement("input");
  rangeEl.type = "range";
  rangeEl.step = STEP;
  rangeEl.min = min;
  rangeEl.max = max;

  function pull() {
    const value = target()[field.key];
    rangeEl.value = value;
    numberEl.value = Math.round(value * 1000) / 1000;
  }
  function push(value) {
    target()[field.key] = value;
    reposeWielded();
    refreshJsonOut();
  }

  rangeEl.addEventListener("input", () => {
    push(Number(rangeEl.value));
    numberEl.value = Math.round(Number(rangeEl.value) * 1000) / 1000;
  });
  numberEl.addEventListener("input", () => {
    if (numberEl.value === "") return;
    push(Number(numberEl.value));
    rangeEl.value = numberEl.value;
  });

  pull();
  pullFns.push(pull);
  row.append(head, rangeEl);
  return row;
}

function buildPanel() {
  const heading = document.createElement("h2");
  heading.textContent = "Wield Pose Tuning";
  panelEl.appendChild(heading);

  SECTIONS.forEach((section) => {
    const h3 = document.createElement("h3");
    panelEl.appendChild(h3);
    statusEls.push({ el: h3, section });

    section.fields.forEach((field) => {
      panelEl.appendChild(buildFieldRow(section.target, field));
    });
  });

  const jsonLabel = document.createElement("h3");
  jsonLabel.textContent = "wield (copy into player.json)";
  panelEl.appendChild(jsonLabel);
  panelEl.appendChild(jsonOutEl);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "Close";
  closeBtn.addEventListener("click", () => setWieldDebugOpen(false));
  panelEl.appendChild(closeBtn);

  refreshJsonOut();
}
buildPanel();

// Which pose is actually being shown right now, so the section headers can say so - the panel
// edits all three poses regardless of what's in hand, but only whichever's currently equipped
// will visibly move as its sliders change.
function activeWhich() {
  const twoHand = getWielded("twoHand");
  if (twoHand) {
    const stats = getWieldedStats("twoHand");
    return stats && stats.type === "gun" ? "gun" : "melee";
  }
  if (getWielded("handL") || getWielded("handR")) return "hand";
  return null;
}

function refreshStatus() {
  const active = activeWhich();
  statusEls.forEach(({ el, section }) => {
    const isActive = section.which === active;
    el.textContent = section.title + (isActive ? "  → equipped now" : "");
    el.classList.toggle("wieldActive", isActive);
  });
}

let rafHandle = null;
function statusLoop() {
  refreshStatus();
  if (wieldDebugOn) rafHandle = requestAnimationFrame(statusLoop);
}

function setWieldDebugOpen(open) {
  wieldDebugOn = open;
  panelEl.classList.toggle("open", open);
  if (open) {
    document.exitPointerLock();
    pullFns.forEach((pull) => pull()); // re-read current playerStats.wield values (player.json's fetch may have completed since the panel was last built/opened)
    refreshJsonOut();
    statusLoop();
  } else {
    cancelAnimationFrame(rafHandle);
  }
}

window.addEventListener("keydown", (evt) => {
  if (evt.code !== "KeyP" || evt.repeat) return;
  if (!wieldDebugOn && document.pointerLockElement !== canvas) return;
  if (wieldDebugOn) {
    setWieldDebugOpen(false);
    requestLock();
  } else {
    setWieldDebugOpen(true);
  }
});

window.addEventListener("keydown", (evt) => {
  if (evt.code !== "Escape" || evt.repeat) return;
  if (!wieldDebugOn) return;
  setWieldDebugOpen(false);
});
