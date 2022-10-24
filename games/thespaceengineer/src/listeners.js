// listeners.js: Interaction listeners.

document.addEventListener("keydown", function(evt)
{
    if (G_keys.hasOwnProperty(evt.key) == false)
    {
        G_keys[evt.code] = {down: true, time_down:Date.now(), time_up:0};
        return;
    }

    G_keys[evt.code].down = true;
    G_keys[evt.code].time_down = Date.now();
}, false);

document.addEventListener("keyup", function(evt)
{
    G_keys[evt.code].down = false;
    G_keys[evt.code].time_up = Date.now();
}, false);
