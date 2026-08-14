const SVG_NS = "http://www.w3.org/2000/svg";
const SNAP_DIST = 14;
const ROOM_W = 100;
const ROOM_H = 80;
const MIN_SIZE = 30;
const EDGE_HIT = 10; // thickness of the invisible/hit area for edge-resize handles
const CORNER_HIT = 14; // size of the invisible/hit area for corner-resize handles
const CORNER_EDGES = {
  "top-left": ["left", "top"],
  "top-right": ["right", "top"],
  "bottom-left": ["left", "bottom"],
  "bottom-right": ["right", "bottom"],
};
const DRAG_THRESHOLD = 4; // client px of movement before a press counts as a drag, not a click
const DOOR_LEN = 28; // door opening length along the wall (visual size)
const DOOR_HIT_LEN = 14; // grabbable length for dragging/selecting a door - smaller than the
// visual marker so a wall next to an existing door still has room to click and add another one
const DOOR_THICK = 12; // door marker thickness across the wall
const ZOOM_STEP = 1.1; // viewBox scale factor per wheel tick
const VIEW_W_MIN = 100; // most zoomed in (smallest viewBox width)
const VIEW_W_MAX = 3200; // most zoomed out (largest viewBox width)
const BASE_ASPECT = 600 / 800; // keep viewBox height in this ratio to its width

let nextRoomId = 1;
let nextFloorId = 1;
let nextDoorId = 1;

function seedRoom() {
  return { id: nextRoomId++, x: (800 - ROOM_W) / 2, y: (600 - ROOM_H) / 2, w: ROOM_W, h: ROOM_H };
}

function makeFloor(name) {
  return { id: nextFloorId++, name, rooms: [seedRoom()], doors: [] };
}

const floors = [makeFloor("Floor 1")];
let currentFloorIndex = 0;

const svg = document.getElementById("canvas");
const floorTabsEl = document.getElementById("floorTabs");

let viewBox = { x: 0, y: 0, w: 800, h: 600 };

// The single currently-selected room or door, if any: { type: "room" | "door", id }.
// Delete/Backspace removes whatever is selected.
let selected = null;

// Active drag state: only one of these is non-null at a time.
let moveDrag = null; // { room, floor, start:{x,y}, orig:{x,y,w,h}, others, startClient:{x,y}, moving }
let wallDrag = null; // { room, floor, edge, orig:{x,y,w,h}, others, startClient:{x,y}, resizing }
let cornerDrag = null; // { room, edgeX, edgeY, orig:{x,y,w,h}, others }
let doorDrag = null; // { door, edge, span, startClient:{x,y}, moving }
let bgDrag = null; // { startClientX, startClientY, startViewBoxX, startViewBoxY, pxPerUnitX, pxPerUnitY, panning }

function currentFloor() {
  return floors[currentFloorIndex];
}

function updateViewBoxAttr() {
  svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
}

function toSvgPoint(evt) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  const ctm = svg.getScreenCTM();
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function otherRooms(floor, excludeId) {
  return floor.rooms.filter((r) => r.id !== excludeId);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function overlapsAny(rect, others) {
  return others.some((o) => rectsOverlap(rect, o));
}

// Snap a single edge coordinate to the nearest neighboring edge within SNAP_DIST.
function snapSingle(value, edges) {
  let best = value;
  let bestDist = SNAP_DIST + 1;
  edges.forEach((e) => {
    const d = Math.abs(e - value);
    if (d < bestDist) {
      bestDist = d;
      best = e;
    }
  });
  return best;
}

// Snap a whole-room translation so either its min or max edge aligns with a neighbor edge.
function bestSnapDelta(minCoord, maxCoord, edges) {
  let bestDelta = 0;
  let bestDist = SNAP_DIST + 1;
  edges.forEach((edge) => {
    const dMin = edge - minCoord;
    if (Math.abs(dMin) < bestDist) {
      bestDist = Math.abs(dMin);
      bestDelta = dMin;
    }
    const dMax = edge - maxCoord;
    if (Math.abs(dMax) < bestDist) {
      bestDist = Math.abs(dMax);
      bestDelta = dMax;
    }
  });
  return bestDelta;
}

function xEdgesOf(rooms) {
  return rooms.flatMap((r) => [r.x, r.x + r.w]);
}

function yEdgesOf(rooms) {
  return rooms.flatMap((r) => [r.y, r.y + r.h]);
}

// --- Wall geometry helpers -------------------------------------------------

function oppositeEdge(edge) {
  return { left: "right", right: "left", top: "bottom", bottom: "top" }[edge];
}

function isVerticalWall(edge) {
  return edge === "left" || edge === "right";
}

function wallFixedCoord(room, edge) {
  if (edge === "right") return room.x + room.w;
  if (edge === "left") return room.x;
  if (edge === "bottom") return room.y + room.h;
  return room.y; // top
}

function wallSpan(room, edge) {
  return isVerticalWall(edge) ? [room.y, room.y + room.h] : [room.x, room.x + room.w];
}

function intersectSpan(a, b) {
  const lo = Math.max(a[0], b[0]);
  const hi = Math.min(a[1], b[1]);
  return hi > lo ? [lo, hi] : null;
}

// A single wall can be adjacent to several rooms at once (e.g. one long room next to two
// shorter ones). Prefer whichever neighbor's span actually contains the click point; fall
// back to the nearest one if the click landed exactly on a seam between two neighbors.
function findWallNeighbor(room, edge, floor, along) {
  const fixedCoord = wallFixedCoord(room, edge);
  const opp = oppositeEdge(edge);
  const EPS = 0.5;
  let fallback = null;
  for (const other of floor.rooms) {
    if (other.id === room.id) continue;
    if (Math.abs(wallFixedCoord(other, opp) - fixedCoord) > EPS) continue;
    const span = intersectSpan(wallSpan(room, edge), wallSpan(other, edge));
    if (!span) continue;
    if (along >= span[0] && along <= span[1]) return { room: other, span };
    const dist = along < span[0] ? span[0] - along : along - span[1];
    if (!fallback || dist < fallback.dist) fallback = { room: other, span, dist };
  }
  return fallback;
}

function createAdjacentRoom(room, edge, along, floor) {
  let rect;
  if (edge === "right") rect = { x: room.x + room.w, y: along - ROOM_H / 2, w: ROOM_W, h: ROOM_H };
  else if (edge === "left") rect = { x: room.x - ROOM_W, y: along - ROOM_H / 2, w: ROOM_W, h: ROOM_H };
  else if (edge === "bottom") rect = { x: along - ROOM_W / 2, y: room.y + room.h, w: ROOM_W, h: ROOM_H };
  else rect = { x: along - ROOM_W / 2, y: room.y - ROOM_H, w: ROOM_W, h: ROOM_H };

  // Snap along the free axis (the wall's own fixed axis is already flush with `room`).
  if (isVerticalWall(edge)) {
    rect.y += bestSnapDelta(rect.y, rect.y + rect.h, yEdgesOf(floor.rooms));
  } else {
    rect.x += bestSnapDelta(rect.x, rect.x + rect.w, xEdgesOf(floor.rooms));
  }

  if (overlapsAny(rect, floor.rooms)) return null;

  const created = { id: nextRoomId++, ...rect };
  floor.rooms.push(created);
  return created;
}

function addDoorOnWall(room, edge, clickPoint, floor) {
  const along = isVerticalWall(edge) ? clickPoint.y : clickPoint.x;
  const neighbor = findWallNeighbor(room, edge, floor, along);

  let roomB, span;
  if (neighbor) {
    roomB = neighbor.room;
    span = neighbor.span;
  } else {
    roomB = createAdjacentRoom(room, edge, along, floor);
    if (!roomB) return;
    span = intersectSpan(wallSpan(room, edge), wallSpan(roomB, edge));
    if (!span) return;
  }

  const doorLen = Math.min(DOOR_LEN, span[1] - span[0]);
  const centerFrac = clamp((along - span[0]) / (span[1] - span[0]), 0, 1);

  floor.doors.push({
    id: nextDoorId++,
    roomAId: room.id,
    roomBId: roomB.id,
    edgeOnA: edge,
    centerFrac,
    doorLen,
  });
  renderCanvas();
}

// Shared geometry for a door: where it sits on its wall right now, recomputed from the two
// rooms' current positions (rather than cached) so moved/resized rooms keep doors honest.
function doorGeometry(door, floor) {
  const roomA = floor.rooms.find((r) => r.id === door.roomAId);
  const roomB = floor.rooms.find((r) => r.id === door.roomBId);
  if (!roomA || !roomB) return null;

  const opp = oppositeEdge(door.edgeOnA);
  const EPS = 0.5;
  if (Math.abs(wallFixedCoord(roomA, door.edgeOnA) - wallFixedCoord(roomB, opp)) > EPS) return null;

  const span = intersectSpan(wallSpan(roomA, door.edgeOnA), wallSpan(roomB, door.edgeOnA));
  if (!span) return null;

  const len = Math.min(door.doorLen, span[1] - span[0]);
  const center = clamp(span[0] + door.centerFrac * (span[1] - span[0]), span[0] + len / 2, span[1] - len / 2);
  const fixedCoord = wallFixedCoord(roomA, door.edgeOnA);
  return { edge: door.edgeOnA, fixedCoord, center, len };
}

function rectAlongWall(edge, fixedCoord, center, len, thick) {
  if (isVerticalWall(edge)) return { x: fixedCoord - thick / 2, y: center - len / 2, w: thick, h: len };
  return { x: center - len / 2, y: fixedCoord - thick / 2, w: len, h: thick };
}

// The full-size marker, purely for display.
function doorRect(door, floor) {
  const geom = doorGeometry(door, floor);
  if (!geom) return null;
  return rectAlongWall(geom.edge, geom.fixedCoord, geom.center, geom.len, DOOR_THICK);
}

// A smaller rect centered on the door, used only for hit-testing (drag/select), so wall space
// just outside an existing door stays clickable for adding another one.
function doorHitRect(door, floor) {
  const geom = doorGeometry(door, floor);
  if (!geom) return null;
  const hitLen = Math.min(DOOR_HIT_LEN, geom.len);
  return rectAlongWall(geom.edge, geom.fixedCoord, geom.center, hitLen, DOOR_THICK);
}

function deleteRoom(roomId) {
  const floor = currentFloor();
  if (floor.rooms.length <= 1) return false; // always keep at least one room to grow from
  floor.rooms = floor.rooms.filter((r) => r.id !== roomId);
  floor.doors = floor.doors.filter((d) => d.roomAId !== roomId && d.roomBId !== roomId);
  renderCanvas();
  return true;
}

function renderCanvas() {
  svg.querySelectorAll(".room, .edge-handle, .corner-handle, .door, .door-hit").forEach((el) => el.remove());
  const floor = currentFloor();

  floor.rooms.forEach((room) => {
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", room.x);
    rect.setAttribute("y", room.y);
    rect.setAttribute("width", room.w);
    rect.setAttribute("height", room.h);
    rect.classList.add("room");
    if (selected && selected.type === "room" && selected.id === room.id) rect.classList.add("selected");
    rect.addEventListener("pointerdown", (evt) => {
      evt.stopPropagation();
      startMoveDrag(evt, room, floor);
    });
    svg.appendChild(rect);

    ["top", "bottom", "left", "right"].forEach((edge) => {
      const handle = document.createElementNS(SVG_NS, "rect");
      handle.classList.add("edge-handle", `edge-${edge}`);
      if (edge === "top" || edge === "bottom") {
        handle.setAttribute("x", room.x);
        handle.setAttribute("width", room.w);
        handle.setAttribute("height", EDGE_HIT);
        handle.setAttribute("y", edge === "top" ? room.y - EDGE_HIT / 2 : room.y + room.h - EDGE_HIT / 2);
      } else {
        handle.setAttribute("y", room.y);
        handle.setAttribute("height", room.h);
        handle.setAttribute("width", EDGE_HIT);
        handle.setAttribute("x", edge === "left" ? room.x - EDGE_HIT / 2 : room.x + room.w - EDGE_HIT / 2);
      }
      handle.addEventListener("pointerdown", (evt) => {
        evt.stopPropagation();
        startWallDrag(evt, room, edge, floor);
      });
      svg.appendChild(handle);
    });

    Object.keys(CORNER_EDGES).forEach((corner) => {
      const [edgeX, edgeY] = CORNER_EDGES[corner];
      const cx = edgeX === "left" ? room.x : room.x + room.w;
      const cy = edgeY === "top" ? room.y : room.y + room.h;
      const handle = document.createElementNS(SVG_NS, "rect");
      handle.classList.add("corner-handle", `corner-${corner}`);
      handle.setAttribute("x", cx - CORNER_HIT / 2);
      handle.setAttribute("y", cy - CORNER_HIT / 2);
      handle.setAttribute("width", CORNER_HIT);
      handle.setAttribute("height", CORNER_HIT);
      handle.addEventListener("pointerdown", (evt) => {
        evt.stopPropagation();
        startCornerDrag(room, edgeX, edgeY, floor);
      });
      svg.appendChild(handle);
    });
  });

  floor.doors.forEach((door) => {
    const d = doorRect(door, floor);
    if (!d) return;
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", d.x);
    rect.setAttribute("y", d.y);
    rect.setAttribute("width", d.w);
    rect.setAttribute("height", d.h);
    rect.classList.add("door");
    if (selected && selected.type === "door" && selected.id === door.id) rect.classList.add("selected");
    svg.appendChild(rect);

    const hit = doorHitRect(door, floor);
    const hitRect = document.createElementNS(SVG_NS, "rect");
    hitRect.setAttribute("x", hit.x);
    hitRect.setAttribute("y", hit.y);
    hitRect.setAttribute("width", hit.w);
    hitRect.setAttribute("height", hit.h);
    hitRect.classList.add("door-hit", isVerticalWall(door.edgeOnA) ? "door-vertical" : "door-horizontal");
    hitRect.addEventListener("pointerdown", (evt) => {
      evt.stopPropagation();
      startDoorDrag(evt, door, floor);
    });
    svg.appendChild(hitRect);
  });
}

function deleteDoor(doorId, floor) {
  floor.doors = floor.doors.filter((d) => d.id !== doorId);
  renderCanvas();
  return true;
}

function startDoorDrag(evt, door, floor) {
  const roomA = floor.rooms.find((r) => r.id === door.roomAId);
  const roomB = floor.rooms.find((r) => r.id === door.roomBId);
  const span = intersectSpan(wallSpan(roomA, door.edgeOnA), wallSpan(roomB, door.edgeOnA));
  if (!span) return;
  selected = { type: "door", id: door.id };
  renderCanvas();
  doorDrag = { door, edge: door.edgeOnA, span, startClient: { x: evt.clientX, y: evt.clientY }, moving: false };
}

function applyDoorDrag(evt) {
  const p = toSvgPoint(evt);
  const along = isVerticalWall(doorDrag.edge) ? p.y : p.x;
  const [lo, hi] = doorDrag.span;
  const len = Math.min(doorDrag.door.doorLen, hi - lo);
  const clamped = clamp(along, lo + len / 2, hi - len / 2);
  doorDrag.door.centerFrac = clamp((clamped - lo) / (hi - lo), 0, 1);
  renderCanvas();
}

function startMoveDrag(evt, room, floor) {
  selected = { type: "room", id: room.id };
  renderCanvas();
  moveDrag = {
    room,
    floor,
    start: toSvgPoint(evt),
    orig: { x: room.x, y: room.y, w: room.w, h: room.h },
    others: otherRooms(floor, room.id),
    startClient: { x: evt.clientX, y: evt.clientY },
    moving: false,
  };
}

function startWallDrag(evt, room, edge, floor) {
  wallDrag = {
    room,
    floor,
    edge,
    orig: { x: room.x, y: room.y, w: room.w, h: room.h },
    others: otherRooms(floor, room.id),
    startClient: { x: evt.clientX, y: evt.clientY },
    resizing: false,
  };
}

function applyMoveDrag(evt) {
  const p = toSvgPoint(evt);
  const dx = p.x - moveDrag.start.x;
  const dy = p.y - moveDrag.start.y;
  const raw = { x: moveDrag.orig.x + dx, y: moveDrag.orig.y + dy, w: moveDrag.orig.w, h: moveDrag.orig.h };

  const snapDx = bestSnapDelta(raw.x, raw.x + raw.w, xEdgesOf(moveDrag.others));
  const snapDy = bestSnapDelta(raw.y, raw.y + raw.h, yEdgesOf(moveDrag.others));
  const snapped = { ...raw, x: raw.x + snapDx, y: raw.y + snapDy };

  const candidate = overlapsAny(snapped, moveDrag.others) ? raw : snapped;

  if (!overlapsAny(candidate, moveDrag.others)) {
    moveDrag.room.x = candidate.x;
    moveDrag.room.y = candidate.y;
    renderCanvas();
  }
}

function rectFromEdgeValue(edge, orig, value) {
  if (edge === "right") {
    const w = Math.max(MIN_SIZE, value - orig.x);
    return { x: orig.x, y: orig.y, w, h: orig.h };
  }
  if (edge === "left") {
    const right = orig.x + orig.w;
    const x = Math.min(value, right - MIN_SIZE);
    return { x, y: orig.y, w: right - x, h: orig.h };
  }
  if (edge === "bottom") {
    const h = Math.max(MIN_SIZE, value - orig.y);
    return { x: orig.x, y: orig.y, w: orig.w, h };
  }
  // edge === "top"
  const bottom = orig.y + orig.h;
  const y = Math.min(value, bottom - MIN_SIZE);
  return { x: orig.x, y, w: orig.w, h: bottom - y };
}

function applyWallResize(evt) {
  const p = toSvgPoint(evt);
  const { room, edge, orig, others } = wallDrag;
  const rawValue = isVerticalWall(edge) ? p.x : p.y;
  const snappedValue = snapSingle(rawValue, isVerticalWall(edge) ? xEdgesOf(others) : yEdgesOf(others));

  const snapped = rectFromEdgeValue(edge, orig, snappedValue);
  const candidate = overlapsAny(snapped, others) ? rectFromEdgeValue(edge, orig, rawValue) : snapped;

  if (!overlapsAny(candidate, others)) {
    room.x = candidate.x;
    room.y = candidate.y;
    room.w = candidate.w;
    room.h = candidate.h;
    renderCanvas();
  }
}

function startCornerDrag(room, edgeX, edgeY, floor) {
  cornerDrag = {
    room,
    edgeX,
    edgeY,
    orig: { x: room.x, y: room.y, w: room.w, h: room.h },
    others: otherRooms(floor, room.id),
  };
}

// Combine two independent per-edge rect updates (one horizontal, one vertical) into one candidate.
function rectFromCornerValues(edgeX, edgeY, orig, xValue, yValue) {
  const horiz = rectFromEdgeValue(edgeX, orig, xValue);
  const vert = rectFromEdgeValue(edgeY, orig, yValue);
  return { x: horiz.x, w: horiz.w, y: vert.y, h: vert.h };
}

function applyCornerResize(evt) {
  const p = toSvgPoint(evt);
  const { edgeX, edgeY, orig, others, room } = cornerDrag;

  const snappedX = snapSingle(p.x, xEdgesOf(others));
  const snappedY = snapSingle(p.y, yEdgesOf(others));
  const snapped = rectFromCornerValues(edgeX, edgeY, orig, snappedX, snappedY);
  const raw = rectFromCornerValues(edgeX, edgeY, orig, p.x, p.y);
  const candidate = overlapsAny(snapped, others) ? raw : snapped;

  if (!overlapsAny(candidate, others)) {
    room.x = candidate.x;
    room.y = candidate.y;
    room.w = candidate.w;
    room.h = candidate.h;
    renderCanvas();
  }
}

// Zoom in/out around the cursor position on scroll.
svg.addEventListener(
  "wheel",
  (evt) => {
    evt.preventDefault();
    const cursor = toSvgPoint(evt);
    const factor = evt.deltaY < 0 ? 1 / ZOOM_STEP : ZOOM_STEP;
    const newW = clamp(viewBox.w * factor, VIEW_W_MIN, VIEW_W_MAX);
    const scale = newW / viewBox.w;

    viewBox.x = cursor.x - (cursor.x - viewBox.x) * scale;
    viewBox.y = cursor.y - (cursor.y - viewBox.y) * scale;
    viewBox.w = newW;
    viewBox.h = newW * BASE_ASPECT;
    updateViewBoxAttr();
  },
  { passive: false }
);

// Background press: pans the canvas if the pointer moves past the drag threshold.
// A plain click on empty space just clears the current selection.
svg.addEventListener("pointerdown", (evt) => {
  const rect = svg.getBoundingClientRect();
  bgDrag = {
    startClientX: evt.clientX,
    startClientY: evt.clientY,
    startViewBoxX: viewBox.x,
    startViewBoxY: viewBox.y,
    pxPerUnitX: rect.width / viewBox.w,
    pxPerUnitY: rect.height / viewBox.h,
    panning: false,
  };
});

svg.addEventListener("pointermove", (evt) => {
  if (moveDrag) {
    if (!moveDrag.moving) {
      const dx = evt.clientX - moveDrag.startClient.x;
      const dy = evt.clientY - moveDrag.startClient.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) moveDrag.moving = true;
    }
    if (moveDrag.moving) applyMoveDrag(evt);
    return;
  }

  if (wallDrag) {
    if (!wallDrag.resizing) {
      const dx = evt.clientX - wallDrag.startClient.x;
      const dy = evt.clientY - wallDrag.startClient.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) wallDrag.resizing = true;
    }
    if (wallDrag.resizing) applyWallResize(evt);
    return;
  }

  if (cornerDrag) {
    applyCornerResize(evt);
    return;
  }

  if (doorDrag) {
    if (!doorDrag.moving) {
      const dx = evt.clientX - doorDrag.startClient.x;
      const dy = evt.clientY - doorDrag.startClient.y;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) doorDrag.moving = true;
    }
    if (doorDrag.moving) applyDoorDrag(evt);
    return;
  }

  if (bgDrag) {
    const dxClient = evt.clientX - bgDrag.startClientX;
    const dyClient = evt.clientY - bgDrag.startClientY;
    if (!bgDrag.panning && Math.hypot(dxClient, dyClient) > DRAG_THRESHOLD) {
      bgDrag.panning = true;
      svg.classList.add("panning");
    }
    if (bgDrag.panning) {
      viewBox.x = bgDrag.startViewBoxX - dxClient / bgDrag.pxPerUnitX;
      viewBox.y = bgDrag.startViewBoxY - dyClient / bgDrag.pxPerUnitY;
      updateViewBoxAttr();
    }
  }
});

window.addEventListener("pointerup", (evt) => {
  if (moveDrag) {
    moveDrag = null;
  } else if (wallDrag) {
    if (!wallDrag.resizing) {
      addDoorOnWall(wallDrag.room, wallDrag.edge, toSvgPoint(evt), wallDrag.floor);
    }
    wallDrag = null;
  } else if (cornerDrag) {
    cornerDrag = null;
  } else if (doorDrag) {
    doorDrag = null;
  } else if (bgDrag) {
    if (!bgDrag.panning && selected) {
      selected = null;
      renderCanvas();
    }
    svg.classList.remove("panning");
    bgDrag = null;
  }
});

window.addEventListener("keydown", (evt) => {
  if ((evt.key !== "Delete" && evt.key !== "Backspace") || !selected) return;
  evt.preventDefault();
  if (selected.type === "room" && deleteRoom(selected.id)) {
    selected = null;
  } else if (selected.type === "door" && deleteDoor(selected.id, currentFloor())) {
    selected = null;
  }
});

function renderFloorTabs() {
  floorTabsEl.innerHTML = "";
  floors.forEach((floor, index) => {
    const tab = document.createElement("div");
    tab.classList.add("floorTab");
    if (index === currentFloorIndex) tab.classList.add("active");

    const nameBtn = document.createElement("button");
    nameBtn.type = "button";
    nameBtn.classList.add("name");
    nameBtn.textContent = floor.name;
    nameBtn.addEventListener("click", () => {
      currentFloorIndex = index;
      selected = null;
      renderFloorTabs();
      renderCanvas();
    });
    tab.appendChild(nameBtn);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.classList.add("close");
    closeBtn.textContent = "×";
    closeBtn.title = "Delete floor";
    closeBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      if (floors.length <= 1) return;
      floors.splice(index, 1);
      if (currentFloorIndex >= floors.length) currentFloorIndex = floors.length - 1;
      selected = null;
      renderFloorTabs();
      renderCanvas();
    });
    tab.appendChild(closeBtn);

    floorTabsEl.appendChild(tab);
  });
}

document.getElementById("addFloorBtn").addEventListener("click", () => {
  floors.push(makeFloor(`Floor ${nextFloorId}`));
  currentFloorIndex = floors.length - 1;
  selected = null;
  renderFloorTabs();
  renderCanvas();
});

updateViewBoxAttr();
renderFloorTabs();
renderCanvas();
