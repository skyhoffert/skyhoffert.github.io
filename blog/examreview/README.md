# Exam Review

Kahoot-style live review: projector host screen + students on phones. Design notes in [PLAN.md](PLAN.md).

Backend: the **slotsdle** Supabase project (all objects prefixed `er_`). Config in [js/config.js](js/config.js).

## One-time setup

Run [sql/01_schema.sql](sql/01_schema.sql) in the Supabase SQL editor. Re-run it after any change to that file.

## Running a session

1. Write a set: `sets/<class>/<name>.md` (+ `sets/<class>/img/*.svg`). Copy [sets/demo/demo.md](sets/demo/demo.md); its header is the format cheat sheet. Commit and push.
2. Edit the path in [sql/create_room.sql](sql/create_room.sql) and run it in Supabase. It returns the room code and the **host URL**.
3. Open the host URL on the projector laptop. The key is moved out of the address bar into localStorage, so after the first visit `host.html?room=CODE` is enough on that browser.
4. Students scan the QR code or go to `skyhoffert.github.io/blog/examreview` and enter the code.
5. Start → (question open → lock / timer → Reveal → Next) … → Finish → **Download results**.

Check the lobby for **Question set warnings** before starting.

## Rehearsing

Open `sim.html?room=CODE` in another tab and join some bots, then drive the host screen. Kick bots from the leaderboard or lobby when done (or just make a fresh room for class).

## Housekeeping

[sql/cleanup.sql](sql/cleanup.sql) deletes rooms older than 30 days.
