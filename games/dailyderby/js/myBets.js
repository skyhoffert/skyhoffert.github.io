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