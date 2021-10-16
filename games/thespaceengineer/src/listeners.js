// listeners.js: Interaction listeners.

document.addEventListener("keydown", function(evt) {
    global_objs["stage"].Key(evt.key, true);
}, false);

document.addEventListener("keyup", function(evt) {
    global_objs["stage"].Key(evt.key, false);
}, false);
