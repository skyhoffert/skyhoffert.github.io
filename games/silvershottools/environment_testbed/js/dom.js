// DOM elements referenced by more than one module. Feature-specific elements (inventory,
// settings, ...) are looked up inside the module that owns that feature instead.

export const viewport = document.getElementById("viewport");
export const canvas = document.getElementById("scene");
export const overlay = document.getElementById("overlay");
export const statsEl = document.getElementById("stats");
export const interactPromptEl = document.getElementById("interactPrompt");
