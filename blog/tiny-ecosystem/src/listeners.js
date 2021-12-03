// listeners.js: Interaction listeners.

document.addEventListener("keydown", function(evt) {
    if (G_keys.hasOwnProperty(evt.key) == false) {
        G_keys[evt.code] = {down: true, time_down: 0, time_up: 0};
    }

    G_keys[evt.code].down = true;
    G_keys[evt.code].time_down = Date.now();
    G_stage.KeyDown(evt.code);
}, false);

document.addEventListener("keyup", function(evt) {
    if (G_keys.hasOwnProperty(evt.key) == false) {
        G_keys[evt.code] = {down: false, time_down: 0, time_up: 0};
    }
    
    G_keys[evt.code].down = false;
    G_keys[evt.code].time_up = Date.now();
    G_stage.KeyUp(evt.code);
}, false);
