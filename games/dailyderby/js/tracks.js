import { supabase } from './supabaseClient.js';
import { getGameDateString } from './util.js';

/**
 * Fetch the name of the track hosting today's race
 */
export async function loadTodayTrackName() {
  const today = getGameDateString(0);

  const { data, error } = await supabase
    .from('daily_rosters_daily_derby')
    .select('tracks_daily_derby ( name )')
    .eq('race_date', today)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching today\'s track:', error);
    return null;
  }

  return data?.tracks_daily_derby?.name || null;
}

/**
 * Render the track name into the next-race box
 */
export function renderTrackName(trackName, elementId = 'next-race-track-name') {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.textContent = trackName || 'Track TBD';
}
