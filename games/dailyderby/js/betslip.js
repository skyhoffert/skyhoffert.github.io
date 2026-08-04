import { supabase } from './supabaseClient.js';
import { loadUserBets } from './myBets.js';
import { getTodayWalletBalance, deductFromWallet } from './wallet.js';
import { CookieManager, getGameDateString } from './util.js'; // Updated imports

let selectedBetData = null;
let currentWager = 5; // Default increment
let availableWallet = 30;
let isSubmitting = false;

export function initBetModal() {
  const modalOverlay = document.getElementById('bet-modal-overlay');
  const closeBtn = document.getElementById('close-bet-modal');
  const betForm = document.getElementById('bet-form');
  const btnDecrease = document.getElementById('btn-decrease-wager');
  const btnIncrease = document.getElementById('btn-increase-wager');

  // Delegated listener for "Bet" buttons
  document.addEventListener('click', (e) => {
    const betBtn = e.target.closest('.bet-btn');
    if (betBtn) {
      e.preventDefault();
      if (isSubmitting || betBtn.disabled) return;

      openBetModal(
        betBtn.getAttribute('data-horse-id'),
        betBtn.getAttribute('data-horse-name'),
        betBtn.getAttribute('data-odds')
      );
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', closeBetModal);

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay && !isSubmitting) closeBetModal();
    });
  }

  // Stepper Controls
  if (btnDecrease) {
    btnDecrease.addEventListener('click', () => {
      if (currentWager > 5) {
        currentWager -= 5;
        updateWagerDisplay();
      }
    });
  }

  if (btnIncrease) {
    btnIncrease.addEventListener('click', () => {
      if (currentWager + 5 <= availableWallet) {
        currentWager += 5;
        updateWagerDisplay();
      }
    });
  }

  // Form Submit
  if (betForm) {
    betForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      if (currentWager > availableWallet) {
        showModalStatus('Wager exceeds available wallet balance.', true);
        return;
      }

      isSubmitting = true;
      toggleAllBetButtons(true); // Disable all "Bet" buttons on page

      const submitBtn = document.getElementById('bet-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
      }

      try {
        // 1. Deduct from wallet
        await deductFromWallet(currentWager);

        // 2. Insert bet into backend
        await placeWagerInBackend(currentWager);

        showModalStatus('Wager placed successfully!', false);
        await loadUserBets();

        // Leave submitBtn disabled while waiting to close
        setTimeout(() => {
          closeBetModal();
        }, 1000);

      } catch (err) {
        showModalStatus(err.message || 'Failed to place wager.', true);
        
        // Re-enable on error so player can try again
        isSubmitting = false;
        toggleAllBetButtons(false);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Confirm Wager';
        }
      }
    });
  }
}

async function openBetModal(horseId, horseName, odds) {
  selectedBetData = { horseId, horseName, odds };
  availableWallet = await getTodayWalletBalance();

  const nameEl = document.getElementById('modal-horse-name');
  const oddsEl = document.getElementById('modal-horse-odds');

  if (nameEl) nameEl.textContent = horseName;
  if (oddsEl) oddsEl.textContent = odds;

  // Clear previous status message ("Wager placed successfully!", etc.)
  showModalStatus('', false);

  // Reset wager to $5 or max available if less than $5
  currentWager = availableWallet >= 5 ? 5 : 0;
  updateWagerDisplay();

  const modalOverlay = document.getElementById('bet-modal-overlay');
  if (modalOverlay) modalOverlay.classList.remove('hidden');
}

function closeBetModal() {
  const modalOverlay = document.getElementById('bet-modal-overlay');
  if (modalOverlay) modalOverlay.classList.add('hidden');
  
  selectedBetData = null;
  isSubmitting = false;

  // Reset submit button state for next time modal opens
  const submitBtn = document.getElementById('bet-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm Wager';
  }

  toggleAllBetButtons(false); // Re-enable "Bet" buttons on page
}

function toggleAllBetButtons(disabled) {
  const betButtons = document.querySelectorAll('.bet-btn');
  betButtons.forEach(btn => {
    btn.disabled = disabled;
    if (disabled) {
      btn.style.pointerEvents = 'none';
      btn.style.opacity = '0.5';
    } else {
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '1';
    }
  });
}

function updateWagerDisplay() {
  const display = document.getElementById('wager-display');
  const btnDecrease = document.getElementById('btn-decrease-wager');
  const btnIncrease = document.getElementById('btn-increase-wager');

  if (display) display.textContent = `$${currentWager}`;

  // Disable increase/decrease buttons at boundaries
  if (btnDecrease) btnDecrease.disabled = currentWager <= 5;
  if (btnIncrease) btnIncrease.disabled = (currentWager + 5 > availableWallet) || availableWallet < 5;

  updatePayoutCalculation();
}

function updatePayoutCalculation() {
  if (!selectedBetData) return;
  const payoutElement = document.getElementById('modal-payout');
  const oddsParts = selectedBetData.odds.split('/');
  
  if (oddsParts.length === 2) {
    const multiplier = parseFloat(oddsParts[0]) / parseFloat(oddsParts[1]);
    const profit = currentWager * multiplier;
    payoutElement.textContent = `$${Math.round(currentWager + profit)}`;
  } else {
    payoutElement.textContent = `$${currentWager}`;
  }
}

function showModalStatus(msg, isError) {
  const el = document.getElementById('modal-status-msg');
  if (el) {
    el.style.color = isError ? '#ef4444' : '#10b981';
    el.textContent = msg;
  }
}

async function placeWagerInBackend(wagerAmount) {
  const session = JSON.parse(CookieManager.get('daily_derby_player_session'));
  const oddsParts = selectedBetData.odds.split('/');
  const multiplier = oddsParts.length === 2 ? (parseFloat(oddsParts[0]) / parseFloat(oddsParts[1])) : 1;
  const potentialPayout = Math.round(wagerAmount + (wagerAmount * multiplier));

  const { error } = await supabase
    .from('bets_daily_derby')
    .insert([{
      player_id: session.id,
      horse_id: selectedBetData.horseId,
      race_date: getGameDateString(0), // Uses new utility
      wager_amount: wagerAmount,
      odds_at_placement: selectedBetData.odds,
      potential_payout: potentialPayout,
      status: 'Pending'
    }]);

  if (error) throw error;
}
