import { supabase } from './supabaseClient.js';
import { CookieManager, getGameDateString } from './util.js'; // Updated imports

let currentRaceResult = null;
let currentPlayerBets = [];

const WATCHED_COOKIE_KEY = 'daily_derby_watched_date';

function getSession() {
  const raw = CookieManager.get('daily_derby_player_session');
  return raw ? JSON.parse(raw) : null;
}

/**
 * Initializes the Race Results Landing Module
 */
export async function initRaceResultsView() {
  const session = getSession();
  if (!session) return;

  const yesterdayStr = getGameDateString(-1);

  // Fetch Yesterday's Result & User's Bets
  const [resultData, betsData] = await Promise.all([
    fetchRaceResult(yesterdayStr),
    fetchPlayerBetsForDate(session.id, yesterdayStr)
  ]);

  const resultsContainer = document.getElementById('race-results-container');

  if (!resultData) {
    // If no race results exist in DB for yesterday yet, hide container or show placeholder
    if (resultsContainer) resultsContainer.classList.add('hidden');
    console.warn(`No race results found in DB for date: ${yesterdayStr}`);
    return;
  }

  currentRaceResult = resultData;
  currentPlayerBets = betsData || [];

  if (resultsContainer) resultsContainer.classList.remove('hidden');

  // Bind click handlers passing the correct date string
  bindReplayControls(yesterdayStr);

  // Check Cookie View State
  const lastWatchedDate = CookieManager.get(WATCHED_COOKIE_KEY);

  if (lastWatchedDate === yesterdayStr) {
    showStep('results-step-summary');
    renderSummaryScreen();
  } else {
    showStep('results-step-prompt');
  }
}

function bindReplayControls(raceDate) {
  const startBtn = document.getElementById('start-replay-btn');
  const replayBtn = document.getElementById('replay-sequence-btn');
  const copyBtn = document.getElementById('copy-summary-btn');

  if (startBtn) {
    // Fixed: Now correctly uses raceDate passed from outer scope
    startBtn.onclick = () => runSequence(raceDate);
  }
  if (replayBtn) {
    replayBtn.onclick = () => runSequence(raceDate);
  }
  if (copyBtn) {
    copyBtn.onclick = copySummaryToClipboard;
  }
}

/**
 * Core 6-Step Animation Sequence Runner
 */
async function runSequence(raceDate) {
  // Step 2: Race Track Animation
  showStep('results-step-animation');
  await playRaceAnimation();

  // Step 3: Winner Banner
  await playWinnerZoom(currentRaceResult.winner_name);

  // Step 4: Reveal Bets
  showStep('results-step-bets');
  await playBetsRevealAnimation(currentPlayerBets);

  // Set local cookie for 7 days
  CookieManager.set(WATCHED_COOKIE_KEY, raceDate, 7);

  // Step 5: Summary Screen
  showStep('results-step-summary');
  renderSummaryScreen();
}

function showStep(stepId) {
  const steps = document.querySelectorAll('.results-step');
  steps.forEach(s => s.classList.add('hidden'));

  const activeStep = document.getElementById(stepId);
  if (activeStep) activeStep.classList.remove('hidden');
}

/* --- Animation Steps --- */

function playRaceAnimation() {
  return new Promise((resolve) => {
    const trackStrip = document.getElementById('race-track-strip');
    const winnerBanner = document.getElementById('winner-banner');
    const winnerNameEl = document.getElementById('winner-horse-name');

    if (trackStrip) {
      trackStrip.innerHTML = `<div class="running-horses-animation" style="font-size:2rem; text-align:center; padding:1.5rem;">🐎 🏇 🐎 🐎 🏇</div>`;
    }

    // Show banner early with dynamic cycling effect
    if (winnerBanner) winnerBanner.classList.remove('hidden');

    // Pool of horse names to cycle through during suspense phase
    const sampleNames = [
      'Thunder Strike', 
      'Midnight Runner', 
      'Silver Bullet', 
      'Red Comet', 
      'Gilded Arrow', 
      'Shadow Fax', 
      'Iron Giant', 
      'Solar Flare'
    ];

    let cycleIndex = 0;

    // Cycle horse names rapidly every 90ms to create anticipation
    const nameCycleInterval = setInterval(() => {
      if (winnerNameEl) {
        winnerNameEl.textContent = sampleNames[cycleIndex % sampleNames.length];
        winnerNameEl.classList.add('cycling-text');
      }
      cycleIndex++;
    }, 90);

    // After 3.5 seconds, stop cycling and lock in the actual winner
    setTimeout(() => {
      clearInterval(nameCycleInterval);
      if (winnerNameEl) {
        winnerNameEl.classList.remove('cycling-text');
      }
      resolve();
    }, 3500);
  });
}

function playWinnerZoom(winnerName) {
  return new Promise((resolve) => {
    const winnerNameEl = document.getElementById('winner-horse-name');
    const winnerBanner = document.getElementById('winner-banner');

    // Lock in official winning horse name
    if (winnerNameEl) {
      winnerNameEl.textContent = winnerName;
      winnerNameEl.classList.add('winner-lock-in');
    }

    // Hold winner screen for 2.5 seconds before proceeding to bets reveal
    setTimeout(() => {
      if (winnerBanner) winnerBanner.classList.add('hidden');
      if (winnerNameEl) winnerNameEl.classList.remove('winner-lock-in');
      resolve();
    }, 2500);
  });
}

function playBetsRevealAnimation(bets) {
  return new Promise(async (resolve) => {
    const container = document.getElementById('animated-bets-container');
    if (!container) return resolve();

    container.innerHTML = '';

    if (!bets || bets.length === 0) {
      container.innerHTML = '<div class="placeholder-box">No wagers were placed on yesterday\'s race.</div>';
      setTimeout(resolve, 1500);
      return;
    }

    for (let i = 0; i < bets.length; i++) {
      const bet = bets[i];
      const isWinner = bet.horse_id === currentRaceResult.winning_horse_id;
      
      const betCard = document.createElement('div');
      betCard.className = `bet-reveal-card ${isWinner ? 'cashout' : 'failed'} pop-in`;
      betCard.innerHTML = `
        <div class="bet-reveal-header">
          <span>${bet.horses_daily_derby?.name || 'Horse'}</span>
          <span class="badge ${isWinner ? 'badge-status' : ''}">${isWinner ? '✅ WON' : '❌ LOST'}</span>
        </div>
        <div class="bet-reveal-payout">
          ${isWinner ? '+$' + parseFloat(bet.potential_payout).toFixed(2) : '-$' + parseFloat(bet.wager_amount).toFixed(2)}
        </div>
      `;

      container.appendChild(betCard);
      await new Promise(r => setTimeout(r, 1200));
    }

    setTimeout(resolve, 1000);
  });
}

/**
 * Step 5/6: Render Summary Screen
 */
function renderSummaryScreen() {
  let totalWinnings = 0;
  const summaryBetsList = document.getElementById('summary-bets-list');
  
  if (summaryBetsList) {
    if (currentPlayerBets.length === 0) {
      summaryBetsList.innerHTML = '<div class="placeholder-box">No bets placed yesterday.</div>';
    } else {
      summaryBetsList.innerHTML = currentPlayerBets.map((b, index) => {
        const isWinner = b.horse_id === currentRaceResult.winning_horse_id;
        const payoutAmount = Math.round(parseFloat(b.potential_payout) || 0);
        if (isWinner) totalWinnings += payoutAmount;

        const horseName = b.horses_daily_derby?.name || `Wager #${index + 1}`;

        return `
          <div class="program-row summary-bet-row ${isWinner ? 'won' : 'lost'}">
            <div class="program-left">
              <div class="bet-status-box ${isWinner ? 'box-win' : 'box-loss'}">
                ${isWinner ? 'WIN' : 'LOSS'}
              </div>
              <div class="horse-main-info">
                <span class="horse-program-name">${horseName}</span>
                <span class="horse-program-sub">Wager: $${Math.round(parseFloat(b.wager_amount))} (${b.odds_at_placement || 'N/A'})</span>
              </div>
            </div>
            <div class="program-right">
              <div style="text-align: right;">
                <span class="program-odds ${isWinner ? 'amount-won' : 'amount-lost'}">
                  ${isWinner ? '+$' + payoutAmount : '$0'}
                </span>
                <div class="horse-program-sub">${isWinner ? 'Returned' : 'No Return'}</div>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  const totalEl = document.getElementById('summary-total-winnings');
  if (totalEl) totalEl.textContent = `$${totalWinnings}`;
}

/**
 * Single-line Shareable Clipboard Copy
 */
function copySummaryToClipboard() {
  if (!currentPlayerBets || currentPlayerBets.length === 0) {
    navigator.clipboard.writeText(`🏇 Daily Derby (${getGameDateString(-1)}):\nNo bets placed.`);
    return;
  }

  let totalWinnings = 0;
  let totalWagered = 0;

  // Format each bet into a status block with whole numbers and explicit +/-
  const boxTokens = currentPlayerBets.map(b => {
    const isWinner = b.horse_id === currentRaceResult.winning_horse_id;
    const wager = Math.round(parseFloat(b.wager_amount) || 0);
    const payout = Math.round(parseFloat(b.potential_payout) || 0);

    totalWagered += wager;

    if (isWinner) {
      totalWinnings += payout;
      return `🟩 (+$${payout})`;
    } else {
      return `🟥 (-$${wager})`;
    }
  }).join(' ');

  // Calculate Net Profit/Loss
  const netTotal = totalWinnings - totalWagered;
  const netSign = netTotal >= 0 ? '+' : '-';
  const formattedNet = `${netSign}$${Math.abs(netTotal)}`;

  const summaryText = `🏇 Daily Derby (${getGameDateString(-1)}):\n${boxTokens}\nTotal: ${formattedNet}\n\nPlay Daily Derby today!`;

  navigator.clipboard.writeText(summaryText).then(() => {
    const copyBtn = document.getElementById('copy-summary-btn');
    if (copyBtn) {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✅ Copied to Clipboard!';
      setTimeout(() => copyBtn.textContent = originalText, 2000);
    }
  });
}

/* --- API Fetch Helpers --- */

async function fetchRaceResult(dateStr) {
  const { data, error } = await supabase
    .from('daily_race_results_daily_derby')
    .select(`
      winning_horse_id,
      horses_daily_derby:winning_horse_id ( name )
    `)
    .eq('race_date', dateStr)
    .maybeSingle();

  if (error || !data) return null;
  return {
    winning_horse_id: data.winning_horse_id,
    winner_name: data.horses_daily_derby?.name || 'Winner'
  };
}

async function fetchPlayerBetsForDate(playerId, dateStr) {
  const { data, error } = await supabase
    .from('bets_daily_derby')
    .select(`
      id, 
      horse_id, 
      wager_amount, 
      odds_at_placement,
      potential_payout,
      horses_daily_derby:horse_id ( name )
    `)
    .eq('player_id', playerId)
    .eq('race_date', dateStr);

  if (error) {
    console.error('Error fetching recap bets:', error);
    return [];
  }

  return data || [];
}
