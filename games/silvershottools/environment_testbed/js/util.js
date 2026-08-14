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

export function fetchJson(url) {
  return fetch(url).then((res) => {
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.json();
  });
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
