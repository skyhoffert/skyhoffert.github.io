// Generic helpers with no dependency on any particular game system.

export function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function isDescendantOf(obj, ancestor) {
  if (!ancestor) return false;
  for (let p = obj; p; p = p.parent) {
    if (p === ancestor) return true;
  }
  return false;
}

// no-store, not just a cache-busting query string - these config files (player.json,
// weapons.json, world.json, the map's own JSON sidecar) are meant to be tuned and reloaded
// during play (see menu.js's loadWorld(), re-run every time Play is pressed), so a stale cached
// copy surviving a reload would silently make edits look like they did nothing.
export function fetchJson(url) {
  return fetch(url, { cache: "no-store" }).then((res) => {
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.json();
  });
}

// Appends a load-time-unique query string, forcing a fresh fetch regardless of cache headers -
// for URLs handed to GLTFLoader (menu.js's MAP_URL/OBJECTS_URL), which has no equivalent of
// fetchJson()'s { cache: "no-store" } option exposed. A genuinely different URL every call is
// the one cache-busting trick that can't be defeated by any server/proxy caching config, unlike
// a fetch option a misconfigured server could still ignore.
export function cacheBust(url) {
  return `${url}?t=${Date.now()}`;
}

// Frees GPU buffers/textures under root - three.js doesn't do this automatically when an
// object is just removed from the scene graph, so returning to the main menu (see menu.js)
// would otherwise leak VRAM a little more with every play/reset cycle.
export function disposeObject3D(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach((mat) => mat.dispose());
    }
  });
}
