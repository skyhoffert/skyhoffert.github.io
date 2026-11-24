# Exam Review — Plan

A reusable, Kahoot-style live review tool for final exam review sessions. The instructor projects a host screen; up to ~16 students join a lobby on their phones and answer question by question. After each question the projector shows stats and a leaderboard while the instructor talks through the solution on the whiteboard.

## Stack

- **Front end:** static HTML/JS in `blog/examreview/`, served from GitHub Pages.
- **Back end:** the existing slotsdle Supabase project (Postgres + Realtime), with every table and function prefixed `er_`. No Linux server. (The free tier's two-project limit was already used.)
- **Scale:** ≤16 concurrent students per session (well within the Supabase free tier).
- **Rendering:** Markdown + KaTeX for equations; SVG/PNG images for circuits and figures.

## Pages

| Page | Who | Purpose |
|---|---|---|
| `index.html` | Students | Join with room code + nickname, then answer questions on the phone. |
| `host.html?room=ABCD&key=…` | Instructor | Kahoot-style projector screen with on-screen buttons (no keyboard shortcuts). |
| `sim.html` | Instructor | Bot simulator: joins N fake students that answer randomly, for rehearsing. |

## Question sets

- One Markdown file per class/session: `sets/<class>/<name>.md`, with images in `sets/<class>/img/`.
- Set files (including answers) are public in the repo. That's acceptable: it's an ungraded review.
- Host and phones both fetch the same set file from GitHub Pages.
- Choices keep file order and are labeled A/B/C/D on both the projector and the phones.
- Text in a question block that isn't a recognized field is ignored (solutions are worked on the whiteboard).

### Format

```markdown
---
title: ECE 301 Final Review
default_timer: 60
---

## Q: Voltage divider
type: numeric
answer: 3.3
tolerance: 2%
units: V
timer: 90
topic: DC circuits

Find $V_{out}$ given $R_1 = 10\,k\Omega$, $R_2 = 20\,k\Omega$, $V_{in}=5\,V$.

![](img/divider.svg)

## Q: Which are passive components?
type: multi
- [x] Resistor
- [x] Capacitor
- [ ] Op-amp
- [x] Inductor

## Q: Gain of an ideal inverting amp with Rf=10k, Rin=1k?
type: single
- [ ] 10
- [x] -10
- [ ] 11
- [ ] -11

## Q: An ideal op-amp draws zero input current.
type: tf
answer: true
```

**Question types:**
- `single`: multiple choice, one correct (`- [x]`).
- `multi`: multiple choice, several correct. Graded all-or-nothing.
- `numeric`: `answer`, `tolerance` (relative `2%` or absolute `0.05`), optional `units`.
- `tf`: true/false via `answer: true|false`.

**Optional per-question fields:** `timer` (seconds; overrides `default_timer`; `0` = no timer), `topic`.

A demo set (`sets/demo/demo.md`) ships with every question type, an equation, and a custom SVG circuit. It doubles as format documentation.

## Rooms and host auth

- Rooms are created manually by pasting `create_room.sql` into the Supabase SQL editor. You edit one line with the set path.
- The script returns a 4-letter **room code**, a random **host key**, and a ready-to-click **host URL**.
- The host key is passed in the URL and saved in localStorage. Every host action goes through an RPC that checks the key.
- One room = one session. Next semester, run the script again.
- Optional `cleanup.sql` deletes old rooms.

## Students

- Join with room code + nickname. No accounts.
- A player ID in localStorage restores identity and score after a refresh or a locked phone.
- Late joiners can join any time, start at 0, and see the current question immediately.
- Nickname collisions are rejected at join.
- **Moderation:** a kick + ban button next to each player in the lobby and on the leaderboard. A ban adds that exact nickname (case-sensitive) to the room's banned list. The student may rejoin under a different name. No word filter, no device ban.

## Session flow (state machine)

```
Lobby → Open → Locked → Revealed → (Next) → Open → … → Final
```

- **Lobby:** big QR code (encodes URL + room code), the URL and room code in large text as a fallback, and nicknames appearing as people join.
- **Open:** the question shows on the projector **and** the phones (text, equations, figures). Students can change answers until lock. The projector shows a live "11/16 answered" count and "All in ✓" when everyone has answered (it does not auto-lock).
  - Timer: per-question/default countdown with **+15 s** and **Lock now** buttons. Auto-locks at 0. Questions with no timer stay open until manually locked.
- **Locked (pause screen):** "⏱ Time's up, 14/16 answered." No answer is shown. Waits for the host to click **Reveal**.
- **Revealed:**
  - Projector: correct answer highlighted, bar chart of picks per option (MC/TF) or the 5 most common wrong values (numeric), % correct, full leaderboard.
  - Phones: ✅/❌, the correct answer, the student's score and rank.
- **Navigation:** Next, Back, and jump-to-N. Revisiting a revealed question re-shows its results read-only. **Re-open** wipes that question's answers and re-runs it.
- **Final:** podium screen + **Download results** button.

## Scoring

- Pure correct count, 1 per question. No speed bonus (so students don't rush).
- `multi` is all-or-nothing.
- Ties share a rank.
- Grading happens on the host at lock, against the set file. Results are written via a host-key RPC. The leaderboard is a SQL view counting correct answers.

## Numeric input

- Accepts plain numbers, scientific notation, and SI prefixes: `4.7k`, `2.2u`, `330m`, `1e-3`.
- Units shown next to the input. A live parse preview (e.g. "= 4,700 Ω") lets students catch typos before lock.

## Sound

- Projector only, with a mute toggle on the host.
- A ding when a question appears and on reveal; ticks during the last ~5 s of the timer.
- No music.

## Look and feel

- Dark theme, big type readable from the back row.
- Kahoot-style colored answer tiles (red/blue/yellow/green) with letters.

## Results export

A single JSON file downloaded from the final screen:

```json
{
  "set": { "title": "...", "path": "sets/...", "room": "ABCD", "date": "..." },
  "questions": [
    { "index": 1, "title": "...", "type": "numeric", "topic": "...",
      "answered": 15, "correct": 11, "pct_correct": 73.3,
      "option_counts": { "A": 3, "B": 11 },
      "common_wrong": [ { "value": 6.6, "count": 2 } ] }
  ],
  "students": [
    { "nickname": "...", "total_correct": 12,
      "answers": [ { "index": 1, "answer": "3.3", "correct": true } ] }
  ]
}
```

## Realtime design

- The `room` row (`state`, `question_index`, `timer_ends_at`, …) is the single source of truth.
- Clients subscribe to changes on it; a reconnecting phone reads the row and catches up.
- Phones submit raw answers (upserts keyed by player + question). The host subscribes to answers for the live count.

### Tables (sketch)

- `er_rooms`: code, host_key, set_path, state, question_index, timer_ends_at, created_at
- `er_players`: id, room_code, nickname, joined_at, kicked
- `er_bans`: room_code, nickname
- `er_room_keys`: code, host_key (kept apart so `er_rooms` can be publicly readable for Realtime)
- `er_answers`: room_code, player_id, question_index, answer (json), correct (nullable), answered_at
- Scores/ranks are computed inside the RPCs (`er_scores`). The current question's results stay hidden from phones until reveal.

Writes go through RPCs (join, submit_answer, and host-key-checked host actions). RLS restricts direct table writes.
The host polls `er_host_state` every second (live answer count). Phones subscribe to `er_rooms` via Realtime, with a 4-second polling fallback.

## Build order

1. Supabase schema SQL + `create_room.sql` (+ `cleanup.sql`). Run in the new Supabase project.
2. Set parser + demo set with an SVG circuit.
3. `host.html`.
4. `index.html` (student).
5. `sim.html` (bot simulator) to rehearse end to end.
