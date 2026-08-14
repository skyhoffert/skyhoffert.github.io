// Inventory (I to toggle). Two hand slots (meant to later hold either two 1x1 items or one
// 1x2 two-handed item) plus a generic grid. Pressing E on a holdable prop (see
// startInventoryPickup, called from main.js's E handler) opens the inventory and arms a
// "pending pickup" - clicking any empty slot commits it (the prop is removed from the world
// and that slot shows its name); closing the inventory any other way (I again, or Esc)
// cancels the pending pickup and leaves the prop exactly where it was.
//
// Also handles click-and-hold-to-drag between slots, and the E-armed pending pickup carried
// over from main.js.

import { scene } from "./scene.js";
import { world, physicsObjects } from "./physics.js";
import { interactables, clearActiveInteractableIf } from "./interaction.js";
import { heldLeft, heldRight } from "./hold.js";
import { objectDisplayName } from "./objects.js";
import { requestLock } from "./pointerlock.js";
import { canvas, interactPromptEl } from "./dom.js";
import { INVENTORY_GRID_COLUMNS, INVENTORY_GRID_ROWS } from "./constants.js";

export const inventoryEl = document.getElementById("inventory");
const inventoryGridEl = document.getElementById("inventoryGrid");

for (let i = 0; i < INVENTORY_GRID_COLUMNS * INVENTORY_GRID_ROWS; i++) {
  const slot = document.createElement("div");
  slot.className = "invSlot";
  slot.dataset.slot = `grid${i}`;
  inventoryGridEl.appendChild(slot);
}

const inventorySlots = {}; // slotId -> { el, item: null | { name, displayName } }
document.querySelectorAll("#inventoryPanel .invSlot").forEach((el) => {
  inventorySlots[el.dataset.slot] = { el, item: null };
});

function setSlotItem(slot, item) {
  slot.item = item;
  slot.el.classList.toggle("filled", !!item);
  slot.el.textContent = item ? item.displayName : "";
  slot.el.title = item ? item.displayName : "";
}

export let inventoryOpen = false;
let pendingPickup = null; // the interactable armed by startInventoryPickup(), or null

export function setInventoryOpen(open) {
  inventoryOpen = open;
  inventoryEl.classList.toggle("open", open);
  // Closing without clicking a slot (I again, Esc, ...) is how a pending pickup is cancelled -
  // the prop was never touched, so there's nothing to undo, just stop waiting for a slot pick.
  if (!open) pendingPickup = null;
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
  setInventoryOpen(true);
  document.exitPointerLock();
  interactPromptEl.classList.remove("visible");
}

// See menu.js's return-to-main-menu flow.
export function resetInventory() {
  Object.values(inventorySlots).forEach((slot) => setSlotItem(slot, null));
  pendingPickup = null;
  setInventoryOpen(false);
}

function placePendingPickup(slotId) {
  const slot = inventorySlots[slotId];
  if (slot.item) return; // not an open/valid position

  const obj = pendingPickup.object;
  const phys = physicsObjects.get(obj);
  if (phys) {
    world.removeBody(phys.body);
    physicsObjects.delete(obj);
  }
  scene.remove(obj);
  const idx = interactables.indexOf(pendingPickup);
  if (idx !== -1) interactables.splice(idx, 1);
  clearActiveInteractableIf(pendingPickup);

  setSlotItem(slot, { name: obj.name, displayName: objectDisplayName(obj.name) });

  setInventoryOpen(false); // also clears pendingPickup
  requestLock();
}

// Click-and-hold an occupied slot, drag to another, release to move it there (or swap, if
// the target's also occupied). document.elementFromPoint() - rather than tracking hover via
// enter/leave events - keeps "what's under the cursor" simple and correct even if the
// inventory was closed/reopened mid-drag. Feedback while dragging: the source slot dims, the
// cursor becomes a grabbing hand, and whatever slot is currently under the cursor lights up
// as the drop target.
let dragSourceSlot = null;
let dragHoverSlot = null; // whichever slot is currently highlighted as the drop target

function slotElementAt(x, y) {
  const el = document.elementFromPoint(x, y);
  return el ? el.closest(".invSlot") : null;
}

function setDragHover(slot) {
  if (dragHoverSlot === slot) return;
  if (dragHoverSlot) dragHoverSlot.el.classList.remove("dragover");
  dragHoverSlot = slot;
  if (dragHoverSlot) dragHoverSlot.el.classList.add("dragover");
}

Object.entries(inventorySlots).forEach(([id, slot]) => {
  slot.el.addEventListener("mousedown", (evt) => {
    if (evt.button !== 0) return;
    if (slot.item) {
      dragSourceSlot = id;
      slot.el.classList.add("dragging");
      inventoryEl.classList.add("dragging");
    } else if (pendingPickup) {
      placePendingPickup(id);
    }
  });
});

document.addEventListener("mousemove", (evt) => {
  if (!dragSourceSlot) return;
  const targetEl = slotElementAt(evt.clientX, evt.clientY);
  const targetSlot = targetEl && targetEl.dataset.slot !== dragSourceSlot ? inventorySlots[targetEl.dataset.slot] : null;
  setDragHover(targetSlot);
});

document.addEventListener("mouseup", (evt) => {
  if (!dragSourceSlot) return;
  const source = inventorySlots[dragSourceSlot];
  source.el.classList.remove("dragging");
  inventoryEl.classList.remove("dragging");
  setDragHover(null);
  dragSourceSlot = null;

  const targetEl = slotElementAt(evt.clientX, evt.clientY);
  const targetId = targetEl && targetEl.dataset.slot;
  if (!targetId || targetId === source.el.dataset.slot) return; // dropped nowhere, or back on itself

  const target = inventorySlots[targetId];
  const sourceItem = source.item;
  setSlotItem(source, target.item);
  setSlotItem(target, sourceItem);
});
