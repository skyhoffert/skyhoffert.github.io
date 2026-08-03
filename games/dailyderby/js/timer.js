/**
 * Race Timer Module
 * Calculates time remaining until the next 08:00 UTC post time.
 */

let timerInterval = null;

/**
 * Gets the timestamp (in ms) for the next 08:00 UTC race
 */
function getNextPostTimeMs() {
  const now = new Date();

  // Create Date object set to today's 08:00:00 UTC
  const target = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    8, 0, 0, 0
  ));

  // If 08:00 UTC today has passed, move target to 08:00 UTC tomorrow
  if (now.getTime() >= target.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  return target.getTime();
}

/**
 * Formats time difference into HH:MM:SS
 */
function formatTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Starts the continuous timer loop
 */
export function startRaceTimer(displayElementId = 'countdown-timer') {
  const timerElement = document.getElementById(displayElementId);
  if (!timerElement) return;

  if (timerInterval) clearInterval(timerInterval);

  function updateTimer() {
    const targetMs = getNextPostTimeMs();
    const nowMs = Date.now();
    const remainingMs = targetMs - nowMs;

    timerElement.textContent = formatTime(remainingMs);
  }

  // Initial call and start interval loop
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

export function stopRaceTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}