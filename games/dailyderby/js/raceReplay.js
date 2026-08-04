import { supabase } from './supabaseClient.js';
import { CookieManager, getGameDateString } from './util.js'; // Updated imports

const GATE_RGB_COLORS = {
  1: [220, 38, 38],    // Red
  2: [255, 255, 255],  // White
  3: [37, 99, 235],    // Blue
  4: [245, 158, 11],   // Yellow
  5: [16, 185, 129],   // Green
  6: [75, 85, 99],     // Dark Gray
  7: [234, 88, 12],    // Orange
  8: [147, 51, 234],   // Purple
  9: [236, 72, 153],   // Pink
  10: [6, 182, 212]    // Teal
};

let currentRaceResult = null;
let currentPlayerBets = [];

const WATCHED_COOKIE_KEY = 'daily_derby_watched_date';

function getSession() {
  const raw = CookieManager.get('daily_derby_player_session');
  return raw ? JSON.parse(raw) : null;
}

/**
 * Loads the base horse image, targets red pixels, and replaces them.
 * Works perfectly on a same-origin Python http.server.
 */
function getColoredHorseImage(gateNumber) {
  return new Promise((resolve) => {
    const img = new Image();
    
    // 1. Bind the success listener FIRST
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const targetColor = GATE_RGB_COLORS[gateNumber] || [255, 255, 255]; 

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          if (r > 150 && g < 80 && b < 80) {
            const shade = r / 255; 
            data[i] = targetColor[0] * shade;
            data[i + 1] = targetColor[1] * shade;
            data[i + 2] = targetColor[2] * shade;
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
        
      } catch (err) {
        console.warn('Canvas pixel manipulation failed.', err);
        resolve(img.src);
      }
    };
    
    // 2. Bind the error listener SECOND
    img.onerror = () => {
      console.warn('Could not load gfx/horse_base.png. Check the file path.');
      resolve(''); 
    };

    // 3. Set the source LAST to safely trigger the load event
    img.src = 'gfx/horse_base.png'; 
  });
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
  // Step 2: Race Track Animation (Now passes the post position for color)
  showStep('results-step-animation');
  await playRaceAnimation(currentRaceResult.winner_post_position);

  // Step 3: Winner Banner (Flashes the actual name once the big horse stops)
  await playWinnerZoom(currentRaceResult.winner_name);

  // Step 4: Reveal Bets
  showStep('results-step-bets');
  await playBetsRevealAnimation(currentPlayerBets);

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

async function playRaceAnimation(postPosition) {
  return new Promise(async (resolve) => {
    const trackStrip = document.getElementById('race-track-strip');
    const winnerBanner = document.getElementById('winner-banner');
    const winnerNameEl = document.getElementById('winner-horse-name');

    // 1. Generate the winning horse image
    const winningHorseDataUrl = await getColoredHorseImage(postPosition);
    const finalHorseImg = new Image();
    if (winningHorseDataUrl) {
       await new Promise(r => {
           finalHorseImg.onload = r;
           finalHorseImg.onerror = r;
           finalHorseImg.src = winningHorseDataUrl;
       });
    }

    // 2. Generate all 10 running pack horses with fully random offsets & speeds
    const packHorses = [];
    const allGates = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffledGates = [...allGates].sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < shuffledGates.length; i++) {
      const gateNum = shuffledGates[i];
      const dataUrl = await getColoredHorseImage(gateNum);
      const img = new Image();
      if (dataUrl) {
        await new Promise(r => {
          img.onload = r;
          img.onerror = r;
          img.src = dataUrl;
        });
      }
      
      packHorses.push({
        img,
        gate: gateNum,
        startY: Math.random() * 80 + 0,         
        speedVariance: 0.85 + (Math.random() * 0.3), 
        startXOffset: Math.random() * 250       
      });
    }

    // 3. Set up the Canvas rendering context
    if (trackStrip) {
      trackStrip.innerHTML = ''; 
      
      const canvas = document.createElement('canvas');
      
      canvas.style.width = '100%';
      canvas.style.maxWidth = '100%';
      canvas.style.height = '210px'; // FIX: Explicitly match the internal buffer height
      canvas.style.display = 'block';
      canvas.style.boxSizing = 'border-box';
      canvas.style.border = '1px solid #374151';
      canvas.style.borderRadius = '8px';
      
      trackStrip.appendChild(canvas);

      const renderedWidth = canvas.clientWidth || trackStrip.clientWidth || 600;
      canvas.width = renderedWidth;
      canvas.height = 210; // Internal buffer height

      const actualWidth = renderedWidth;
      const ctx = canvas.getContext('2d');

      const gateColors = {
        1: '#dc2626', 2: '#ffffff', 3: '#2563eb', 4: '#f59e0b',
        5: '#10b981', 6: '#4b5563', 7: '#ea580c', 8: '#9333ea',
        9: '#ec4899', 10: '#06b6d4'
      };
      
      const gateBg = gateColors[postPosition] || '#374151';
      const gateTextColor = postPosition === 2 || postPosition === 4 ? '#000000' : '#ffffff';

      let startTime = null;
      let lastFrameTime = 0;
      const fps = 24;
      const frameInterval = 1000 / fps; // ~41.67ms per frame

      // 4. The main animation loop with TV broadcast straightaway view
      function render(timestamp) {
        if (!startTime) startTime = timestamp;
        
        const elapsed = timestamp - startTime;
        const deltaTime = timestamp - lastFrameTime;

        if (deltaTime >= frameInterval) {
          lastFrameTime = timestamp - (deltaTime % frameInterval);

          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // --- BACKGROUND: TV Broadcast Straightaway View (210px Height) ---
          const trackHeight = canvas.height * 0.72; // Dirt track takes up lower portion
          const turfHeight = canvas.height - trackHeight; // Grass takes the top

          // 1. Grass field background (top portion)
          ctx.fillStyle = '#16a34a'; 
          ctx.fillRect(0, 0, canvas.width, turfHeight);

          // 2. Dirt track straightaway
          ctx.fillStyle = '#78350f'; 
          ctx.fillRect(0, turfHeight, canvas.width, trackHeight);

          // 3. White running rail
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(0, turfHeight);
          ctx.lineTo(canvas.width, turfHeight);
          ctx.stroke();


          // --- PHASE 1: Scattered running pack ---
          if (elapsed < 5000) {
            const progress = elapsed / 5000;
            
            packHorses.forEach((horseObj) => {
              const totalDistance = canvas.width + 300 + horseObj.startXOffset;
              const x = -150 - horseObj.startXOffset + (progress * totalDistance * horseObj.speedVariance);
              
              // Map vertical position safely within the larger dirt track area
              const trackAreaHeight = trackHeight - 25;
              // Remap startY percentages to fit the new 210px track bounds nicely
              const y = turfHeight + 10 + ((horseObj.startY / 100) * trackAreaHeight);

              if (horseObj.img.complete && horseObj.img.naturalWidth > 0) {
                const maxAllowedWidth = actualWidth < 480 ? 45 : 65; // Slightly larger sprites
                const aspectRatio = horseObj.img.naturalWidth / horseObj.img.naturalHeight;
                const drawWidth = maxAllowedWidth;
                const drawHeight = maxAllowedWidth / aspectRatio;
                
                ctx.drawImage(horseObj.img, x, y, drawWidth, drawHeight);
              } else {
                ctx.font = '22px Arial';
                ctx.fillText('🏇', x, y + 25);
              }
            });
          }
          
          // --- PHASE 3: Final Winner slides in ---
          if (elapsed >= 6000) {
            const progress = Math.min((elapsed - 6000) / 2000, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            
            const startX = -200;
            const endX = canvas.width / 2;
            const currentX = startX + (endX - startX) * ease;
            
            const badgeX = currentX - (actualWidth < 480 ? 95 : 120);
            // Center vertically within the entire canvas frame
            const badgeY = (canvas.height / 2) - 36;
            
            ctx.fillStyle = gateBg;
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, 72, 72, 10);
            ctx.fill();
            
            ctx.fillStyle = gateTextColor;
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(postPosition, badgeX + 36, badgeY + 36);
            
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';

            const maxWinnerWidth = actualWidth < 480 ? 90 : 130;
            const winnerAspect = finalHorseImg.complete && finalHorseImg.naturalWidth > 0 
              ? finalHorseImg.naturalWidth / finalHorseImg.naturalHeight 
              : 1.3;
            const winnerWidth = maxWinnerWidth;
            const winnerHeight = maxWinnerWidth / winnerAspect;

            if (finalHorseImg.complete && finalHorseImg.naturalWidth > 0) {
              ctx.drawImage(finalHorseImg, badgeX + 85, (canvas.height / 2) - (winnerHeight / 2), winnerWidth, winnerHeight);
            } else {
              ctx.font = '70px Arial';
              ctx.fillText('🏇', badgeX + 85, canvas.height / 2 + 25);
            }
          }
        }

        if (elapsed < 8000) {
          requestAnimationFrame(render);
        }
      }

      requestAnimationFrame(render);
    }

    // 5. Run the DOM-based Winner Banner logic in parallel
    if (winnerBanner) winnerBanner.classList.remove('hidden');

    const sampleNames = [
      'Thunder Strike', 'Midnight Runner', 'Silver Bullet', 'Red Comet', 
      'Gilded Arrow', 'Shadow Fax', 'Iron Giant', 'Solar Flare'
    ];
    let cycleIndex = 0;

    const nameCycleInterval = setInterval(() => {
      if (winnerNameEl) {
        winnerNameEl.textContent = sampleNames[cycleIndex % sampleNames.length];
        winnerNameEl.classList.add('cycling-text');
      }
      cycleIndex++;
    }, 90);

    setTimeout(() => {
      clearInterval(nameCycleInterval);
      if (winnerNameEl) winnerNameEl.classList.remove('cycling-text');
      resolve(); 
    }, 8000);
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

  // NEW: Render the Full Official Results List
  const fullResultsList = document.getElementById('full-race-results-list');
  if (fullResultsList && currentRaceResult.full_roster) {
    fullResultsList.innerHTML = currentRaceResult.full_roster.map(r => {
      const pos = r.finish_position;
      // Add medals for top 3
      let medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `${pos}`;
      
      return `
        <div class="program-row" style="padding: 0.5rem 1rem;">
          <div class="program-left">
            <div class="gate-badge" style="background: #374151; font-size: ${pos <= 3 ? '1.2rem' : '1rem'};">${medal}</div>
            <div class="horse-main-info">
              <span class="horse-program-name">${r.horses_daily_derby?.name}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
}

function copySummaryToClipboard() {
  const raceDate = getGameDateString(-1);

  // Pull username from the session cookie instead of an undefined variable
  const rawSession = CookieManager.get('daily_derby_player_session');
  const session = rawSession ? JSON.parse(rawSession) : null;
  const username = session?.username || 'Player';

  if (!currentPlayerBets || currentPlayerBets.length === 0) {
    navigator.clipboard.writeText(`🏇 Daily Derby, Race Day ${raceDate} | ${username}\nNo bets placed.\nTotal: $0\n\nPlay Daily Derby today!`);
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

  const summaryText = `🏇 Daily Derby, Race Day ${raceDate} | ${username}
${boxTokens}
Total: ${formattedNet}

Play Daily Derby today!`;

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
    .from('daily_rosters_daily_derby')
    .select(`
      horse_id,
      finish_position,
      post_position,
      horses_daily_derby:horse_id ( name )
    `)
    .eq('race_date', dateStr)
    .order('finish_position', { ascending: true }); 

  if (error || !data || data.length === 0) return null;

  return {
    winning_horse_id: data[0].horse_id,
    winner_name: data[0].horses_daily_derby?.name || 'Winner',
    winner_post_position: data[0].post_position, // NEW: Grab the gate number
    full_roster: data 
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
