import { supabase } from './supabaseClient.js';
import { refundToWallet } from './wallet.js';
import { CookieManager, getGameDateString } from './util.js'; // Updated imports

/**
 * Load user's placed bets from Supabase and render them
 */
export async function loadUserBets(containerId = 'bets-list-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rawSession = CookieManager.get('daily_derby_player_session');
  if (!rawSession) {
    container.innerHTML = '<div class="placeholder-box">Please sign in to view your bets.</div>';
    return;
  }

  const session = JSON.parse(rawSession);

  // Fetch today's bets joined with horse names
  const { data: bets, error } = await supabase
    .from('bets_daily_derby')
    .select(`
      id,
      wager_amount,
      odds_at_placement,
      potential_payout,
      status,
      created_at,
      horses_daily_derby ( name )
    `)
    .eq('player_id', session.id)
    .eq('race_date', getGameDateString(0)) // Strictly show today's bets
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bets:', error);
    container.innerHTML = '<div class="placeholder-box">Error loading wagers.</div>';
    return;
  }

  if (!bets || bets.length === 0) {
    container.innerHTML = '<div class="placeholder-box">No active wagers placed today.</div>';
    return;
  }

  container.innerHTML = bets.map(bet => `
    <div class="program-row" id="bet-row-${bet.id}">
      <div class="program-left">
        <span class="gate-badge" style="background:#10b981;">🎟️</span>
        <div class="horse-main-info">
          <span class="horse-program-name">${bet.horses_daily_derby?.name || 'Horse'}</span>
          <span class="horse-program-sub">Wager: $${Math.round(parseFloat(bet.wager_amount))} @ ${bet.odds_at_placement}</span>
        </div>
      </div>
      <div class="program-right">
        <div style="text-align: right;">
          <span class="program-odds">$${Math.round(parseFloat(bet.potential_payout))}</span>
          <div class="horse-program-sub">Est. Return</div>
        </div>
        ${bet.status === 'Pending' ? `
          <button class="btn secondary sm cancel-bet-btn" 
                  data-bet-id="${bet.id}" 
                  data-wager-amount="${bet.wager_amount}">
            Cancel
          </button>
        ` : ''}
      </div>
    </div>
  `).join('');
}

/**
 * Delegated click listener to delete bets with slide-out animation
 */
export function initBetRemovalListeners() {
  const container = document.getElementById('bets-list-container');
  if (!container) return;

  container.addEventListener('click', async (e) => {
    const cancelBtn = e.target.closest('.cancel-bet-btn');
    if (!cancelBtn || cancelBtn.disabled) return;

    e.preventDefault();
    const betId = cancelBtn.getAttribute('data-bet-id');
    if (!betId) return;

    // 1. Immediately disable button to prevent spam clicks
    cancelBtn.disabled = true;
    cancelBtn.style.pointerEvents = 'none';
    cancelBtn.textContent = '...';

    const betRow = document.getElementById(`bet-row-${betId}`);

    try {
      // 2. Perform backend deletion
      const { error } = await supabase
        .from('bets_daily_derby')
        .delete()
        .eq('id', betId);

      if (error) throw error;

      // 3. Trigger swipe-away animation on success
      if (betRow) {
        betRow.classList.add('swiping-out');

        // 4. Wait for CSS animation to finish before DOM removal
        setTimeout(async () => {
          betRow.remove();
          // Reload list to render placeholder box if 0 bets remain
          await loadUserBets();

          const wagerAmount = parseFloat(cancelBtn.getAttribute('data-wager-amount') || '0');
          if (wagerAmount > 0) {
            await refundToWallet(wagerAmount);
          }
        }, 300); // 300ms matches CSS transition duration
      } else {
        await loadUserBets();
      }

    } catch (err) {
      console.error('Failed to cancel bet:', err);
      
      // Re-enable button if network call fails
      cancelBtn.disabled = false;
      cancelBtn.style.pointerEvents = 'auto';
      cancelBtn.textContent = 'Cancel';
      
      if (betRow) betRow.classList.remove('swiping-out');
    }
  });
}

/**
 * Formats a YYYY-MM-DD game date string into "Aug 3, 2026"
 */
function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[dateObj.getUTCMonth()]} ${dateObj.getUTCDate()}, ${dateObj.getUTCFullYear()}`;
}

/**
 * Load and render the player's settled bets from the past 3 race days,
 * grouped by day with a per-day net profit total.
 */
export async function loadWalletHistory(containerId = 'wallet-history-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rawSession = CookieManager.get('daily_derby_player_session');
  if (!rawSession) {
    container.innerHTML = '<div class="placeholder-box">Please sign in to view your wagering history.</div>';
    return;
  }
  const session = JSON.parse(rawSession);

  // Past 3 settled race days (today's bets are still Pending, so we skip offset 0)
  const dates = [-1, -2, -3].map(offset => getGameDateString(offset));

  const { data: bets, error } = await supabase
    .from('bets_daily_derby')
    .select(`
      id,
      race_date,
      wager_amount,
      odds_at_placement,
      potential_payout,
      status,
      horses_daily_derby ( name )
    `)
    .eq('player_id', session.id)
    .in('race_date', dates)
    .order('race_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching wallet history:', error);
    container.innerHTML = '<div class="placeholder-box">Error loading wagering history.</div>';
    return;
  }

  if (!bets || bets.length === 0) {
    container.innerHTML = '<div class="placeholder-box">No wagers placed in the past 3 days.</div>';
    return;
  }

  // Group bets by race_date
  const grouped = {};
  bets.forEach(bet => {
    if (!grouped[bet.race_date]) grouped[bet.race_date] = [];
    grouped[bet.race_date].push(bet);
  });

  container.innerHTML = dates
    .filter(date => grouped[date] && grouped[date].length > 0)
    .map(date => {
      const dayBets = grouped[date];
      let netProfit = 0;

      const betRows = dayBets.map(bet => {
        const isWon = bet.status === 'Won';
        const isLost = bet.status === 'Lost';
        const wager = Math.round(parseFloat(bet.wager_amount) || 0);
        const payout = Math.round(parseFloat(bet.potential_payout) || 0);

        if (isWon) netProfit += (payout - wager);
        else if (isLost) netProfit -= wager;

        const horseName = bet.horses_daily_derby?.name || 'Horse';
        const statusLabel = isWon ? 'WIN' : isLost ? 'LOSS' : bet.status.toUpperCase();
        const statusClass = isWon ? 'box-win' : isLost ? 'box-loss' : '';
        const rowClass = isWon ? 'won' : isLost ? 'lost' : '';
        const amountText = isWon ? `+$${payout - wager}` : isLost ? `-$${wager}` : 'Pending';
        const amountClass = isWon ? 'amount-won' : isLost ? 'amount-lost' : '';

        return `
          <div class="program-row summary-bet-row ${rowClass}">
            <div class="program-left">
              <div class="bet-status-box ${statusClass}">${statusLabel}</div>
              <div class="horse-main-info">
                <span class="horse-program-name">${horseName}</span>
                <span class="horse-program-sub">Wager: $${wager} @ ${bet.odds_at_placement}</span>
              </div>
            </div>
            <div class="program-right">
              <span class="program-odds ${amountClass}">${amountText}</span>
            </div>
          </div>
        `;
      }).join('');

      const netSign = netProfit >= 0 ? '+' : '-';
      const netColorClass = netProfit >= 0 ? 'amount-won' : 'amount-lost';

      return `
        <div class="wallet-day-group" style="margin-bottom: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <h4 style="color: #9ca3af; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em;">
              ${formatDisplayDate(date)}
            </h4>
            <span class="${netColorClass}" style="font-weight: 800; font-size: 1.05rem;">
              Net: ${netSign}$${Math.abs(netProfit)}
            </span>
          </div>
          ${betRows}
        </div>
      `;
    }).join('');
}

let allTimeStatsCache = null;

/**
 * Loads every settled bet for the player (all-time) and renders
 * a career summary with win/loss record and net profit, plus a copy button.
 */
export async function loadAllTimeStats(containerId = 'alltime-stats-container') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const rawSession = CookieManager.get('daily_derby_player_session');
  if (!rawSession) {
    container.innerHTML = '<div class="placeholder-box">Please sign in to view your record.</div>';
    return;
  }
  const session = JSON.parse(rawSession);

  const { data: bets, error } = await supabase
    .from('bets_daily_derby')
    .select('wager_amount, potential_payout, status')
    .eq('player_id', session.id)
    .in('status', ['Won', 'Lost']);

  if (error) {
    console.error('Error fetching all-time stats:', error);
    container.innerHTML = '<div class="placeholder-box">Error loading your record.</div>';
    return;
  }

  if (!bets || bets.length === 0) {
    container.innerHTML = '<div class="placeholder-box">No settled wagers yet. Place a bet to start your record!</div>';
    allTimeStatsCache = null;
    return;
  }

  let wins = 0;
  let losses = 0;
  let netProfit = 0;

  bets.forEach(bet => {
    const wager = Math.round(parseFloat(bet.wager_amount) || 0);
    const payout = Math.round(parseFloat(bet.potential_payout) || 0);

    if (bet.status === 'Won') {
      wins++;
      netProfit += (payout - wager);
    } else {
      losses++;
      netProfit -= wager;
    }
  });

  const totalBets = wins + losses;
  const winRate = totalBets > 0 ? Math.round((wins / totalBets) * 100) : 0;
  const netSign = netProfit >= 0 ? '+' : '-';
  const netColorClass = netProfit >= 0 ? 'amount-won' : 'amount-lost';

  // Cache for the copy button
  allTimeStatsCache = { wins, losses, winRate, netProfit, username: session.username || 'Player' };

  container.innerHTML = `
    <div class="cash-summary-box" style="margin: 0.75rem 0;">
      <span>All-Time Net Profit/Loss</span>
      <h1 class="${netColorClass}" style="color: inherit;">${netSign}$${Math.abs(netProfit)}</h1>
    </div>
    <div style="display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 1rem;">
      <div style="text-align: center; flex: 1;">
        <div style="font-size: 1.4rem; font-weight: 800; color: #10b981;">${wins}</div>
        <div class="horse-program-sub">Wins</div>
      </div>
      <div style="text-align: center; flex: 1;">
        <div style="font-size: 1.4rem; font-weight: 800; color: #ef4444;">${losses}</div>
        <div class="horse-program-sub">Losses</div>
      </div>
      <div style="text-align: center; flex: 1;">
        <div style="font-size: 1.4rem; font-weight: 800; color: #f3f4f6;">${winRate}%</div>
        <div class="horse-program-sub">Win Rate</div>
      </div>
    </div>
    <button id="copy-alltime-btn" class="btn primary">📋 Copy My Record</button>
  `;

  const copyBtn = document.getElementById('copy-alltime-btn');
  if (copyBtn) copyBtn.onclick = copyAllTimeSummary;
}

/**
 * Copies a shareable blurb of the player's all-time record to clipboard
 */
function copyAllTimeSummary() {
  if (!allTimeStatsCache) return;

  const { wins, losses, winRate, netProfit, username } = allTimeStatsCache;
  const netSign = netProfit >= 0 ? '+' : '-';
  const formattedNet = `${netSign}$${Math.abs(netProfit)}`;

  const summaryText = `🏇 Daily Derby, All-Time Record | ${username}
${wins}W - ${losses}L (${winRate}% Win Rate)
Career Total: ${formattedNet}

Play Daily Derby today!`;

  navigator.clipboard.writeText(summaryText).then(() => {
    const copyBtn = document.getElementById('copy-alltime-btn');
    if (copyBtn) {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✅ Copied to Clipboard!';
      setTimeout(() => copyBtn.textContent = originalText, 2000);
    }
  });
}
