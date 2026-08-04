import { supabase } from './supabaseClient.js';
import { getGameDateString } from './util.js'; // New import

/**
 * Fetch today's race roster with horse statistics & last race date
 */
export async function loadTodayRoster() {
  const { data, error } = await supabase
    .from('daily_rosters_daily_derby')
    .select(`
      post_position,
      morning_line_odds,
      condition_status,
      wildcard_trait,
      horses_daily_derby (
        id, name, base_speed, stamina, grit, bio, last_raced_date
      )
    `)
    .eq('race_date', getGameDateString(0))
    .order('post_position', { ascending: true });

  if (error) {
    console.error('Error fetching roster:', error);
    return [];
  }

  return data;
}

/**
 * Helper to format last race display
 */
function formatLastRace(dateString) {
  if (!dateString) return 'No recent race';

  const lastRace = new Date(dateString);
  const today = new Date();
  
  // Calculate difference in days
  const diffTime = Math.abs(today - lastRace);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Last raced: Today';
  if (diffDays === 1) return 'Last raced: Yesterday';
  if (diffDays <= 7) return `Last raced: ${diffDays} days ago`;
  
  return 'No recent race';
}

/**
 * Render traditional race program lineup on "Daily Race" tab
 */
export function renderOddsGrid(rosterData, containerId = 'today-odds-list') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!rosterData || rosterData.length === 0) {
    container.innerHTML = '<div class="placeholder-box">No race scheduled for today.</div>';
    return;
  }

  container.innerHTML = rosterData.map(item => {
    const horse = item.horses_daily_derby;
    const lastRaceText = formatLastRace(horse.last_raced_date);

    return `
      <div class="program-row">
        <div class="program-left">
          <span class="gate-badge gate-${item.post_position}">${item.post_position}</span>
          <div class="horse-main-info">
            <span class="horse-program-name">${horse.name}</span>
            <span class="horse-program-sub">${lastRaceText}</span>
          </div>
        </div>
        <div class="program-right">
          <span class="program-odds">${item.morning_line_odds}</span>
          <button class="btn primary sm bet-btn" 
                  data-horse-id="${horse.id}" 
                  data-horse-name="${horse.name}" 
                  data-odds="${item.morning_line_odds}">
            Bet
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render full-width detailed stats rows on "Horse Paddock" tab
 */
export function renderPaddockGrid(rosterData, containerId = 'paddock-horse-list') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = rosterData.map(item => {
    const h = item.horses_daily_derby;
    return `
      <div class="horse-row">
        <div class="horse-row-header">
          <div class="horse-identity">
            <span class="post-number">Gate #${item.post_position}</span>
            <h4 class="horse-name">${h.name}</h4>
          </div>
          <div class="program-right">
            <span class="horse-odds">${item.morning_line_odds}</span>
            <button class="btn primary sm bet-btn" 
                    data-horse-id="${h.id}" 
                    data-horse-name="${h.name}" 
                    data-odds="${item.morning_line_odds}">
              Bet
            </button>
          </div>
        </div>
        
        <p class="horse-bio">${h.bio}</p>

        <div class="horse-row-details">
          <span class="badge badge-status">Status: ${item.condition_status}</span>
          <span class="badge badge-wildcard">Wildcard: ${item.wildcard_trait}</span>
        </div>

        <div class="stats-inline-grid">
          <div class="stat-group">
            <div class="stat-label"><span>Speed</span><span>${h.base_speed}</span></div>
            <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${h.base_speed}%;"></div></div>
          </div>
          <div class="stat-group">
            <div class="stat-label"><span>Stamina</span><span>${h.stamina}</span></div>
            <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${h.stamina}%; background: #3b82f6;"></div></div>
          </div>
          <div class="stat-group">
            <div class="stat-label"><span>Grit</span><span>${h.grit}</span></div>
            <div class="stat-bar-bg"><div class="stat-bar-fill" style="width: ${h.grit}%; background: #f59e0b;"></div></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}