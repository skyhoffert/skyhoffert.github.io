// util.js

/**
 * Returns the "Game Date" (YYYY-MM-DD) based on an 08:00 UTC rollover.
 * @param {number} dayOffset - Use 0 for today, -1 for yesterday, etc.
 */
export function getGameDateString(dayOffset = 0) {
  const d = new Date();
  // Subtract 8 hours (28,800,000 ms) to align with 08:00 UTC
  d.setTime(d.getTime() - 28800000);
  
  if (dayOffset !== 0) {
    d.setUTCDate(d.getUTCDate() + dayOffset);
  }
  
  return d.toISOString().split('T')[0];
}

/**
 * Formats a "Game Date" string (YYYY-MM-DD, as returned by getGameDateString)
 * into a display string (e.g., "Aug 3, 2026")
 */
export function formatGameDateString(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${day}, ${year}`;
}

/**
 * Returns a formatted "Race Day" string (e.g., "Aug 3, 2026") for today's game date
 */
export function getFormattedRaceDay() {
  return formatGameDateString(getGameDateString(0));
}

/**
 * Computes the total payout (wager + profit) for a given wager and
 * fractional odds string (e.g. "5/2"). Falls back to returning the
 * wager unchanged if odds are missing or malformed.
 */
export function calculatePayout(wagerAmount, odds) {
  const wager = parseFloat(wagerAmount) || 0;
  const oddsParts = (odds || '').split('/');

  if (oddsParts.length === 2) {
    const multiplier = parseFloat(oddsParts[0]) / parseFloat(oddsParts[1]);
    return Math.round(wager + (wager * multiplier));
  }

  return Math.round(wager);
}

/**
 * Cookie Utilities for Storing Auth Session Token
 */
export const CookieManager = {
  set(name, value, days = 7) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict; Secure`;
  },
  get(name) {
    return document.cookie.split('; ').reduce((r, v) => {
      const parts = v.split('=');
      return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, '');
  },
  erase(name) {
    document.cookie = `${name}=; Max-Age=-99999999; path=/;`;
  }
};