-- Create a review room. Edit the set path (relative to blog/examreview/), then run in the Supabase SQL editor.
-- Returns the room code, host key, host URL (open on the projector laptop) and student join URL.

select * from er_create_room('sets/demo/demo.md');
