// Inventory (I to toggle). A 2D grid of cells (see createGrid()) - the hand paperdoll is its
// own fixed 2x1 grid (handL/handR), separate from the main grid, whose size comes from
// player.json (playerStats.inventory.columns/rows - see setupInventoryGrid(), clamped to a max
// of 8x8). An item occupies a w x h rectangle of cells (most are 1x1; see
// objects.js's objectSize()) and can be rotated with R while it's being dragged - dropping a
// rotated item so it spans both hand cells at once equips it two-handed (see wield.js).
//
// Pressing F on a holdable prop (see startInventoryPickup, called from main.js's F handler)
// opens the inventory and arms a "pending pickup" - the same floating size preview and ghost
// used while dragging (see previewInfo()/updateDragPreview()) tracks the cursor for it too, R
// still rotates it, and clicking any cell it fits at commits it (the prop is removed from the
// world and placed there); closing the inventory any other way (I again, or Esc) cancels it and
// leaves the prop exactly where it was.
//
// Also handles click-and-hold-to-drag between cells (with the same live valid/invalid ghost
// preview). Dragging an item out of the inventory panel entirely and releasing drops it into
// the world in whatever direction the player's actually looking (see ejectItemToWorld()) - not
// the free OS cursor the inventory leaves the mouse as, which has no relation to where the
// camera's facing. Always lands somewhere (a real surface if one's in reach, open air at the
// reach limit otherwise, letting physics carry it the rest of the way down) rather than ever
// being left stuck in the inventory.

import * as THREE from "three";
import { scene, camera } from "./scene.js";
import { world, physicsObjects } from "./physics.js";
import { interactables, clearActiveInteractableIf } from "./interaction.js";
import { typedCollisionMeshes } from "./map.js";
import { heldLeft, heldRight } from "./hold.js";
import { objectDisplayName, objectEmoji, objectSize, dropObjectOnSurface } from "./objects.js";
import { syncHands } from "./wield.js";
import { requestLock } from "./pointerlock.js";
import { canvas, interactPromptEl } from "./dom.js";
import { playerStats } from "./playerConfig.js";

export const inventoryEl = document.getElementById("inventory");
const inventoryPanelEl = document.getElementById("inventoryPanel");
const inventoryGridEl = document.getElementById("inventoryGrid");
const handSlotsEl = document.getElementById("handSlots");
const dragPreviewEl = document.getElementById("dragPreview");

const MAX_INVENTORY_DIM = 8;

// Facing for a non-square item (e.g. the 1x2 shovel), in degrees clockwise from its default
// (base w x h) orientation - R cycles a preview through all four (see the KeyR handler below).
// 0/180 keep the base footprint (just flipped end-for-end); 90/270 swap it (w x h -> h x w).
// Only meaningful when an item's base w !== h - square items ignore this entirely (footprint
// never changes, and no arrow is shown - see DIR_ARROWS/renderPlacement()).
const DIR_ARROWS = { 0: "▲", 90: "▶", 180: "▼", 270: "◀" }; // ▲ ▶ ▼ ◀

function footprintForDir(baseW, baseH, dir) {
  return dir === 90 || dir === 270 ? { w: baseH, h: baseW } : { w: baseW, h: baseH };
}

// A grid is a rectangle of cells, each either empty (null) or holding a reference to whichever
// placement currently covers it (multiple cells share the same placement for anything bigger
// than 1x1). cellEls are purely decorative (grid lines / empty-cell hover); ghostEl previews
// where a drag would land, positioned via the same grid-column/row-span trick as a placement's
// own element - see renderPlacement(). Sets its own column count (cells are otherwise sized by
// the shared .invSlot CSS's fixed 40px, so nothing else needs to know how wide the grid is).
function createGrid(containerEl, cols, rows) {
  containerEl.replaceChildren();
  containerEl.style.gridTemplateColumns = `repeat(${cols}, 40px)`;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cellEl = document.createElement("div");
      cellEl.className = "invSlot invCell";
      cellEl.style.gridColumn = `${col + 1}`;
      cellEl.style.gridRow = `${row + 1}`;
      containerEl.appendChild(cellEl);
    }
  }
  const ghostEl = document.createElement("div");
  ghostEl.className = "invGhost";
  containerEl.appendChild(ghostEl);
  return { containerEl, cols, rows, cells: new Array(cols * rows).fill(null), ghostEl };
}

function bindGridEvents(grid) {
  grid.containerEl.addEventListener("mousedown", (evt) => {
    if (evt.button !== 0) return;
    const cell = cellFromPoint(grid, evt.clientX, evt.clientY);
    if (!cell) return;
    const placement = grid.cells[cellIndex(grid, cell.col, cell.row)];
    if (placement) {
      startDrag(placement, evt.clientX, evt.clientY);
    } else if (pendingPickup) {
      tryPlacePendingPickup(grid, cell.col, cell.row);
    }
  });
}

let mainGrid = null; // built by setupInventoryGrid() once player.json has loaded - see below
const handGrid = createGrid(handSlotsEl, 2, 1); // always fixed 2x1, not player.json-configurable
bindGridEvents(handGrid);
const grids = [handGrid]; // setupInventoryGrid() adds mainGrid once it exists

// (Re)builds the main grid at its currently-configured size (playerStats.inventory.columns/
// rows, from player.json - clamped to a sane MAX_INVENTORY_DIM per side regardless of what's
// requested there), replacing any previous one. Called once from menu.js's loadWorld(), before
// gameplay starts, same as buildObjectLibrary()/setupMap()/etc. - and safe to call again on a
// later Play click if the configured size changed in the meantime, since resetInventory()
// (menu.js's return-to-main-menu flow) already clears out anything placed in the old one first.
export function setupInventoryGrid() {
  if (mainGrid) grids.splice(grids.indexOf(mainGrid), 1);
  const cols = Math.max(1, Math.min(MAX_INVENTORY_DIM, Math.round(playerStats.inventory.columns)));
  const rows = Math.max(1, Math.min(MAX_INVENTORY_DIM, Math.round(playerStats.inventory.rows)));
  mainGrid = createGrid(inventoryGridEl, cols, rows);
  grids.push(mainGrid);
  bindGridEvents(mainGrid);
}

function cellIndex(grid, col, row) {
  return row * grid.cols + col;
}

function forEachCell(col, row, w, h, fn) {
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) fn(c, r);
  }
}

// ignore lets a placement's own cells count as empty, for checking whether it still fits
// somewhere that includes (all or part of) where it already is - e.g. rotating in place.
function canPlace(grid, col, row, w, h, ignore) {
  if (col < 0 || row < 0 || col + w > grid.cols || row + h > grid.rows) return false;
  let ok = true;
  forEachCell(col, row, w, h, (c, r) => {
    const occupant = grid.cells[cellIndex(grid, c, r)];
    if (occupant && occupant !== ignore) ok = false;
  });
  return ok;
}

function occupantsIn(grid, col, row, w, h, ignore) {
  const set = new Set();
  forEachCell(col, row, w, h, (c, r) => {
    const occupant = grid.cells[cellIndex(grid, c, r)];
    if (occupant && occupant !== ignore) set.add(occupant);
  });
  return set;
}

// Tries to fit every placement in `items` into a col/row/w/h region (as if it were empty),
// without any of them overlapping each other - used to figure out whether a set of items
// displaced by a drop can all be relocated into wherever the dragged item is vacating (see
// evaluateTarget()/commitDrop() below), so e.g. a 1x2 item can swap places with two 1x1s (or
// one smaller item), not just one item of the exact same footprint. Greedy (largest-area first,
// first available spot scanning row-major) rather than an exhaustive solver - good enough for
// how small this inventory ever gets, and simple to reason about; a packing it fails to find
// might occasionally still technically exist for some pathological arrangement, but "no swap"
// is a safe, visible failure mode either way (the ghost just shows red). Returns an array of
// { placement, col, row } (absolute grid coordinates, one entry per item in `items`), or null
// if no arrangement fits everything.
function packIntoRegion(items, regionCol, regionRow, regionW, regionH) {
  const occupied = new Array(regionW * regionH).fill(false);
  const sorted = [...items].sort((a, b) => b.w * b.h - a.w * a.h);
  const placements = [];
  for (const p of sorted) {
    let spot = null;
    for (let r = 0; spot === null && r <= regionH - p.h; r++) {
      for (let c = 0; spot === null && c <= regionW - p.w; c++) {
        let fits = true;
        for (let rr = r; fits && rr < r + p.h; rr++) {
          for (let cc = c; fits && cc < c + p.w; cc++) {
            if (occupied[rr * regionW + cc]) fits = false;
          }
        }
        if (fits) spot = { c, r };
      }
    }
    if (!spot) return null;
    for (let rr = spot.r; rr < spot.r + p.h; rr++) {
      for (let cc = spot.c; cc < spot.c + p.w; cc++) {
        occupied[rr * regionW + cc] = true;
      }
    }
    placements.push({ placement: p, col: regionCol + spot.c, row: regionRow + spot.r });
  }
  return placements;
}

// Whether dropping source at (col, row, w, h) in grid is a legal move - either the target's
// entirely empty, or whatever it's occupied by (one item, or several smaller ones) can all be
// packed into source's own vacated footprint instead (packIntoRegion() above), which makes it a
// swap. Shared by the ghost preview and the actual drop so they can never disagree - a case the
// preview draws green always agrees with what dropping there will actually do.
function evaluateTarget(grid, col, row, w, h, source) {
  if (col < 0 || row < 0 || col + w > grid.cols || row + h > grid.rows) return { ok: false, swapPack: null };
  const occupants = occupantsIn(grid, col, row, w, h, source);
  if (occupants.size === 0) return { ok: true, swapPack: null };
  // A pending pickup (source is null - see previewInfo()) is coming from outside the grid
  // entirely, so there's nowhere sensible to relocate whatever's displaced - only an empty
  // target works.
  if (!source) return { ok: false, swapPack: null };
  const packing = packIntoRegion(occupants, source.col, source.row, source.w, source.h);
  return packing ? { ok: true, swapPack: packing } : { ok: false, swapPack: null };
}

function renderPlacement(p) {
  p.el.textContent = p.item.emoji;
  p.el.title = p.item.displayName;
  p.el.style.gridColumn = `${p.col + 1} / span ${p.w}`;
  p.el.style.gridRow = `${p.row + 1} / span ${p.h}`;
  if (p.baseW !== p.baseH) p.el.dataset.dirArrow = DIR_ARROWS[p.dir];
  else delete p.el.dataset.dirArrow;
}

function addPlacement(grid, col, row, w, h, item, dir) {
  const el = document.createElement("div");
  el.className = "invSlot invTile filled";
  grid.containerEl.appendChild(el);
  const size = objectSize(item.name);
  const p = { grid, col, row, w, h, baseW: size.w, baseH: size.h, dir, item, el };
  forEachCell(col, row, w, h, (c, r) => {
    grid.cells[cellIndex(grid, c, r)] = p;
  });
  renderPlacement(p);
  return p;
}

function removePlacement(p) {
  forEachCell(p.col, p.row, p.w, p.h, (c, r) => {
    p.grid.cells[cellIndex(p.grid, c, r)] = null;
  });
  p.el.remove();
}

function clearCells(p) {
  forEachCell(p.col, p.row, p.w, p.h, (c, r) => {
    p.grid.cells[cellIndex(p.grid, c, r)] = null;
  });
}

function placeCells(p, grid, col, row, w, h, dir) {
  p.grid = grid;
  p.col = col;
  p.row = row;
  p.w = w;
  p.h = h;
  p.dir = dir;
  forEachCell(col, row, w, h, (c, r) => {
    grid.cells[cellIndex(grid, c, r)] = p;
  });
  if (p.el.parentElement !== grid.containerEl) grid.containerEl.appendChild(p.el);
  renderPlacement(p);
}

// Split into clearCells()/placeCells() above rather than one combined step because a multi-item
// swap (see commitDrop()) needs to clear every displaced placement's old cells *before* placing
// any of them - see its own comment for why doing them one at a time (clear-then-place,
// clear-then-place, ...) corrupts things whenever one item's old cells are another's new ones.
function movePlacement(p, grid, col, row, w, h, dir) {
  clearCells(p);
  placeCells(p, grid, col, row, w, h, dir);
}

// Derives wield.js's hand state from the hand grid: a placement covering both cells is
// two-handed; otherwise whatever (if anything) covers each cell individually is one-handed.
// twoHandMirrored flips which end (e.g. a shovel's blade) is over which hand - see wield.js's
// twoHandRotation() - an arbitrary but consistent mapping from the two possible horizontal
// dirs a 2-cell-wide item can have; if it comes out backwards, flip the sign of
// player.json's wield.twoHand.rotationZ instead of changing this mapping.
function syncHandsFromGrid() {
  const left = handGrid.cells[cellIndex(handGrid, 0, 0)];
  const right = handGrid.cells[cellIndex(handGrid, 1, 0)];
  if (left && left === right) {
    syncHands({ handL: null, handR: null, twoHand: left.item, twoHandMirrored: left.dir === 270 });
  } else {
    syncHands({ handL: left ? left.item : null, handR: right ? right.item : null, twoHand: null, twoHandMirrored: false });
  }
}

export let inventoryOpen = false;
let pendingPickup = null; // the interactable armed by startInventoryPickup(), or null

export function setInventoryOpen(open) {
  inventoryOpen = open;
  inventoryEl.classList.toggle("open", open);
  if (!open) {
    // Closing without clicking a cell (I again, Esc, ...) is how a pending pickup is
    // cancelled - the prop was never touched, so there's nothing to undo, just stop waiting
    // for a cell pick.
    pendingPickup = null;
    resolveDragOnClose(); // also refreshes the preview if it was showing the drag itself
    updateDragPreview(lastMouseX, lastMouseY); // hides it if that was the pending pickup's preview instead
  }
}

function toggleInventory() {
  if (inventoryOpen) {
    setInventoryOpen(false);
    // Reusing requestLock() (rather than canvas.requestPointerLock() directly) also
    // re-resumes the audio context, consistent with how the game is first entered.
    requestLock();
  } else {
    setInventoryOpen(true);
    document.exitPointerLock();
  }
}

window.addEventListener("keydown", (evt) => {
  if (evt.code !== "KeyI" || evt.repeat) return;
  if (!inventoryOpen && document.pointerLockElement !== canvas) return;
  toggleInventory();
});

// Opens the inventory and arms a pending pickup for an E'd-on prop; called from main.js's
// E keydown handler, which arbitrates between this and non-holdable interactables (doors,
// switches).
export function startInventoryPickup(interactable) {
  const obj = interactable.object;
  // Don't hand-carry and inventory-pick-up the same prop at once.
  if ((heldLeft && heldLeft.object === obj) || (heldRight && heldRight.object === obj)) return;
  pendingPickup = interactable;
  // 90, not 0 - a non-square (2-cell) item's base footprint (dir 0) is vertical, but the more
  // useful default is already lying horizontal/facing right, matching how a two-handed item
  // (see wield.js) actually gets equipped - square items ignore dir entirely, so this only
  // affects those.
  previewDir = 90;
  setInventoryOpen(true);
  document.exitPointerLock();
  interactPromptEl.classList.remove("visible");
  updateDragPreview(lastMouseX, lastMouseY);
}

// See menu.js's return-to-main-menu flow.
export function resetInventory() {
  grids.forEach((grid) => {
    new Set(grid.cells.filter(Boolean)).forEach(removePlacement);
    grid.cells.fill(null);
  });
  pendingPickup = null;
  setInventoryOpen(false);
  syncHandsFromGrid();
}

function tryPlacePendingPickup(grid, col, row) {
  const obj = pendingPickup.object;
  const size = objectSize(obj.name);
  const { w, h } = footprintForDir(size.w, size.h, previewDir); // match whatever orientation the preview was showing
  const anchorCol = Math.min(col, grid.cols - w);
  const anchorRow = Math.min(row, grid.rows - h);
  if (anchorCol < 0 || anchorRow < 0 || !canPlace(grid, anchorCol, anchorRow, w, h, null)) return;

  const phys = physicsObjects.get(obj);
  if (phys) {
    world.removeBody(phys.body);
    physicsObjects.delete(obj);
  }
  scene.remove(obj);
  const idx = interactables.indexOf(pendingPickup);
  if (idx !== -1) interactables.splice(idx, 1);
  clearActiveInteractableIf(pendingPickup);

  addPlacement(
    grid,
    anchorCol,
    anchorRow,
    w,
    h,
    {
      name: obj.name,
      displayName: objectDisplayName(obj.name),
      emoji: objectEmoji(obj.name),
    },
    previewDir
  );

  setInventoryOpen(false); // also clears pendingPickup
  requestLock();
  syncHandsFromGrid();
}

// Click-and-hold an occupied cell, drag to another, release to move it there (or swap, if
// whatever's in the way can be packed into source's own vacated spot - see
// packIntoRegion()/evaluateTarget()). R cycles the orientation of whatever's currently being
// previewed - see updateDragPreview(). Feedback: the source tile dims (drag only), the cursor
// becomes a grabbing hand, a floating tile follows the cursor sized to the item's actual
// footprint (plus a facing arrow if it's non-square), and a ghost outline over whichever grid
// is currently under the cursor previews where it'd land (green if that fits, red if it
// doesn't).
let dragSource = null; // the placement being dragged, or null
let previewDir = 0; // current preview facing, in degrees - see footprintForDir()/DIR_ARROWS
let dragTarget = null; // { grid, col, row, w, h, dir, ok, swapPack } for wherever the cursor currently is, or null
let lastMouseX = 0;
let lastMouseY = 0;

function cellFromPoint(grid, x, y) {
  const rect = grid.containerEl.getBoundingClientRect();
  if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) return null;
  const col = Math.floor(((x - rect.left) / rect.width) * grid.cols);
  const row = Math.floor(((y - rect.top) / rect.height) * grid.rows);
  return { col, row };
}

function hideGhosts() {
  grids.forEach((grid) => grid.ghostEl.classList.remove("visible"));
}

// What's currently being positioned, if anything: either the placement being dragged out of the
// grid, or a pending pickup on its way in from the world (see startInventoryPickup()) - either
// way, an item plus its base (unrotated, dir-0) footprint, and a placement to ignore in fit
// checks (null for a pending pickup, since it isn't occupying any cells yet).
function previewInfo() {
  if (dragSource) return { item: dragSource.item, baseW: dragSource.baseW, baseH: dragSource.baseH, ignore: dragSource };
  if (pendingPickup) {
    const obj = pendingPickup.object;
    const size = objectSize(obj.name);
    return {
      item: { emoji: objectEmoji(obj.name), displayName: objectDisplayName(obj.name) },
      baseW: size.w,
      baseH: size.h,
      ignore: null,
    };
  }
  return null;
}

// Single source of truth for the floating preview tile and the grid ghost - driven entirely off
// previewInfo() and previewDir, so every caller (starting a drag/pickup, R, mousemove, or
// either one ending) just calls this rather than juggling show/hide state of its own.
function updateDragPreview(x, y) {
  const info = previewInfo();
  dragPreviewEl.classList.toggle("visible", !!info);
  // Only an actual drag (not a pending pickup - see previewInfo()) can be released into the
  // world; a pending pickup's prop is still sitting wherever it always was until a cell
  // commits it, so moving outside the panel with one armed doesn't drop anything.
  dragPreviewEl.classList.toggle("willDrop", !!dragSource && !isOverPanel(x, y));
  hideGhosts();
  dragTarget = null;
  if (!info) {
    delete dragPreviewEl.dataset.dirArrow;
    return;
  }

  dragPreviewEl.textContent = info.item.emoji;
  dragPreviewEl.style.left = `${x}px`;
  dragPreviewEl.style.top = `${y}px`;
  if (info.baseW !== info.baseH) dragPreviewEl.dataset.dirArrow = DIR_ARROWS[previewDir];
  else delete dragPreviewEl.dataset.dirArrow;

  const { w, h } = footprintForDir(info.baseW, info.baseH, previewDir);
  dragPreviewEl.style.setProperty("--w", w);
  dragPreviewEl.style.setProperty("--h", h);

  for (const grid of grids) {
    const cell = cellFromPoint(grid, x, y);
    if (!cell) continue;

    const col = Math.min(cell.col, grid.cols - w);
    const row = Math.min(cell.row, grid.rows - h);
    if (col < 0 || row < 0) break; // doesn't fit in this grid at all in this orientation

    const result = evaluateTarget(grid, col, row, w, h, info.ignore);
    grid.ghostEl.style.gridColumn = `${col + 1} / span ${w}`;
    grid.ghostEl.style.gridRow = `${row + 1} / span ${h}`;
    grid.ghostEl.classList.toggle("invalid", !result.ok);
    grid.ghostEl.classList.add("visible");
    dragTarget = { grid, col, row, w, h, dir: previewDir, ok: result.ok, swapPack: result.swapPack };
    break;
  }
}

function startDrag(placement, x, y) {
  dragSource = placement;
  previewDir = placement.dir; // preview starts facing however it's already sitting, not reset to 0
  placement.el.classList.add("dragging");
  inventoryEl.classList.add("dragging");
  updateDragPreview(x, y);
}

function endDrag() {
  dragSource.el.classList.remove("dragging");
  inventoryEl.classList.remove("dragging");
  dragSource = null;
  // Refreshes (rather than just hiding) the preview - if a pending pickup was armed
  // underneath this drag the whole time, its own preview picks back up here.
  updateDragPreview(lastMouseX, lastMouseY);
}

const dropRaycaster = new THREE.Raycaster();
const dropDir = new THREE.Vector3();
const dropNormal = new THREE.Vector3();
const dropPoint = new THREE.Vector3();
const DROP_FALLBACK_NORMAL = new THREE.Vector3(0, 1, 0);

function isOverPanel(x, y) {
  const rect = inventoryPanelEl.getBoundingClientRect();
  return x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom;
}

// Drops placement into the world in whatever direction the player is actually looking (the
// camera, not the free OS cursor the inventory leaves the mouse as), out to playerStats.dropReach.
// Only raycasts against typedCollisionMeshes - real physical surfaces - not every COLL_ mesh,
// so an untyped player-only blocker (e.g. a bookcase's clip-prevention collider) never becomes
// a place to rest an item; it'll correctly hit that bookcase's actual COLL_BOX_ shelf colliders
// instead. If nothing's within reach there, it's dropped in open air at the reach limit anyway
// (world-up normal, same as resting flush on an invisible flat surface) rather than left stuck
// in the inventory - dropObjectOnSurface() gives it a real physics body, so it just falls the
// rest of the way to whatever's below once spawned.
function ejectItemToWorld(placement) {
  camera.getWorldDirection(dropDir);
  dropRaycaster.set(camera.position, dropDir);
  dropRaycaster.far = playerStats.dropReach;
  const hits = dropRaycaster.intersectObjects(typedCollisionMeshes, false);

  let hitPoint;
  let hitNormal;
  if (hits.length > 0) {
    hitPoint = hits[0].point;
    hitNormal = dropNormal.copy(hits[0].face.normal).transformDirection(hits[0].object.matrixWorld);
  } else {
    hitPoint = dropPoint.copy(camera.position).addScaledVector(dropDir, playerStats.dropReach);
    hitNormal = DROP_FALLBACK_NORMAL;
  }

  const instance = dropObjectOnSurface(placement.item.name, hitPoint, hitNormal);
  if (instance) {
    removePlacement(placement);
    syncHandsFromGrid();
  }
}

// If the inventory closes (any way - I again, Esc, clicking Menu/Settings, ...) while an item
// is mid-drag, there's no cell for it to land in, so it gets ejected into the world instead of
// just vanishing - see setInventoryOpen() above.
function resolveDragOnClose() {
  if (!dragSource) return;
  const source = dragSource;
  endDrag();
  ejectItemToWorld(source);
}

// Resolves a drop already validated by evaluateTarget() (via the ghost preview) as ok:
// relocates whatever the target was occupied by (target.swapPack - one item, or several
// smaller ones, each with its own pre-computed col/row - see packIntoRegion()) into source's
// own vacated spot, then moves source into the target. Every displaced placement's (and
// source's own) old cells are cleared up front, before anyone is placed - clearing and placing
// one at a time instead would have each move's own "clear my old cells" step wipe out cells
// another move just claimed, since a swap's "old cells" for one side are exactly the "new
// cells" another side is about to occupy.
function commitDrop(source, target) {
  if (target.swapPack) {
    const sourceOrigin = { grid: source.grid, col: source.col, row: source.row };
    clearCells(source);
    target.swapPack.forEach(({ placement }) => clearCells(placement));
    placeCells(source, target.grid, target.col, target.row, target.w, target.h, target.dir);
    target.swapPack.forEach(({ placement, col, row }) => {
      placeCells(placement, sourceOrigin.grid, col, row, placement.w, placement.h, placement.dir);
    });
  } else {
    movePlacement(source, target.grid, target.col, target.row, target.w, target.h, target.dir);
  }
  syncHandsFromGrid();
}

window.addEventListener("keydown", (evt) => {
  if (evt.code !== "KeyR" || evt.repeat) return;
  if (!dragSource && !pendingPickup) return;
  previewDir = (previewDir + 90) % 360;
  updateDragPreview(lastMouseX, lastMouseY);
});

document.addEventListener("mousemove", (evt) => {
  lastMouseX = evt.clientX;
  lastMouseY = evt.clientY;
  if (!dragSource && !pendingPickup) return;
  updateDragPreview(evt.clientX, evt.clientY);
});

document.addEventListener("mouseup", (evt) => {
  if (!dragSource) return;
  const source = dragSource;
  const target = dragTarget;
  const overPanel = isOverPanel(evt.clientX, evt.clientY);
  endDrag();
  if (target && target.ok) commitDrop(source, target);
  // Dropped outside the inventory panel entirely (not just on an invalid cell within it) -
  // that's "dragged out", so it lands in the world instead of snapping back.
  else if (!overPanel) ejectItemToWorld(source);
});
