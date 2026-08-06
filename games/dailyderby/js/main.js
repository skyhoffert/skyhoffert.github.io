import { loginUser, logoutUser, verifyBackendSession } from './auth.js';
import { startRaceTimer, stopRaceTimer } from './timer.js';
import { loadTodayRoster, renderOddsGrid, renderPaddockGrid } from './horses.js';
import { loadTodayTrackName, renderTrackName } from './tracks.js';
import { initBetModal } from './betslip.js';
import { loadUserBets, initBetRemovalListeners, loadWalletHistory, loadAllTimeStats } from './myBets.js';
import { initRaceResultsView } from './raceReplay.js';
import { getTodayWalletBalance } from './wallet.js';
import { getGameDateString, getFormattedRaceDay } from './util.js';

// DOM References
const loadingView = document.getElementById('loading-view');
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('logout-btn');
const userDisplay = document.getElementById('user-display');

const TAB_STORAGE_KEY = 'daily_derby_active_tab_state';

// Tracks whether tab-specific data has already been fetched this session,
// so re-clicking tabs doesn't re-query every time.
let walletDataLoaded = false;
let betsDataLoaded = false;

// --- APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  // Bind navigation tabs on load
  initTabNavigation();
  initTabScrollBehavior();
  initBetModal();
  initBetRemovalListeners(); // Initialize cancel bet listener

  // Footer buttons jump to their respective tabs
  const footerHelpBtn = document.getElementById('footer-help-btn');
  if (footerHelpBtn) {
    footerHelpBtn.onclick = () => {
      const helpTab = document.querySelector('.nav-tab[data-target="howtoplay-section"]');
      if (helpTab) helpTab.click();
    };
  }

  const footerSupportBtn = document.getElementById('footer-support-btn');
  if (footerSupportBtn) {
    footerSupportBtn.onclick = () => {
      const supportTab = document.querySelector('.nav-tab[data-target="support-section"]');
      if (supportTab) supportTab.click();
    };
  }

  // Header profile icon jumps to the My Profile tab
  const profileIconBtn = document.getElementById('profile-icon-btn');
  if (profileIconBtn) {
    profileIconBtn.onclick = () => {
      const profileTab = document.querySelector('.nav-tab[data-target="profile-section"]');
      if (profileTab) profileTab.click();
    };
  }

  // Track tab's "coming soon" panel also plugs the Support the Dev tab
  const tracksSupportBtn = document.getElementById('tracks-support-btn');
  if (tracksSupportBtn) {
    tracksSupportBtn.onclick = () => {
      const supportTab = document.querySelector('.nav-tab[data-target="support-section"]');
      if (supportTab) supportTab.click();
    };
  }

  // Verify session cookie against backend on startup
  const user = await verifyBackendSession();
  if (user) {
    showDashboard(user);
  } else {
    showLogin();
  }
});

// --- NAV TAB SCROLL AFFORDANCE ---
// Lets desktop mouse users scroll the tab bar with a normal (vertical) wheel,
// and only shows the edge fade/arrow hints when the bar actually overflows.
const trackNavEl = document.querySelector('.track-nav');
const navScrollWrapperEl = document.querySelector('.nav-scroll-wrapper');

function updateNavOverflowState() {
  if (!trackNavEl || !navScrollWrapperEl) return;
  const hasOverflow = trackNavEl.scrollWidth > trackNavEl.clientWidth + 1;
  navScrollWrapperEl.classList.toggle('has-overflow', hasOverflow);
}

function initTabScrollBehavior() {
  if (!trackNavEl || !navScrollWrapperEl) return;

  trackNavEl.addEventListener('wheel', (e) => {
    if (e.deltaY === 0) return;
    if (trackNavEl.scrollWidth <= trackNavEl.clientWidth) return;
    e.preventDefault();
    trackNavEl.scrollBy({ left: e.deltaY, behavior: 'smooth' });
  }, { passive: false });

  // --- Click-and-drag scrolling for desktop mouse users ---
  let isDragging = false;
  let dragMoved = false;
  let startX = 0;
  let startScrollLeft = 0;

  trackNavEl.addEventListener('mousedown', (e) => {
    dragMoved = false;
    if (trackNavEl.scrollWidth <= trackNavEl.clientWidth) return;
    isDragging = true;
    startX = e.pageX;
    startScrollLeft = trackNavEl.scrollLeft;
    trackNavEl.classList.add('dragging');
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    // Mouse button was released outside the window/browser, so no mouseup fired
    if (e.buttons === 0) {
      isDragging = false;
      trackNavEl.classList.remove('dragging');
      return;
    }

    const delta = e.pageX - startX;
    if (Math.abs(delta) > 4) dragMoved = true;
    trackNavEl.scrollLeft = startScrollLeft - delta;
  });

  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    trackNavEl.classList.remove('dragging');
  });

  // Swallow the tab-switch click that would otherwise fire right after a drag
  trackNavEl.addEventListener('click', (e) => {
    if (dragMoved) {
      e.stopPropagation();
      e.preventDefault();
      dragMoved = false;
    }
  }, true);

  window.addEventListener('resize', updateNavOverflowState);
  updateNavOverflowState();
}

// --- TAB SWITCHING LOGIC ---
function initTabNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');

  // New Helper: Hides all sections linked to the tabs
  function hideAllSections() {
    tabs.forEach(t => {
      t.classList.remove('active');
      const targetId = t.getAttribute('data-target');
      const section = document.getElementById(targetId);
      if (section) {
        section.classList.add('hidden');
      }
    });
  }

    // Loads tab-specific data the first time a given tab is opened
  function maybeLoadTabData(targetId) {
    if (targetId === 'wallet-section' && !walletDataLoaded) {
      walletDataLoaded = true;
      loadAllTimeStats();
      loadWalletHistory();
    }
    if (targetId === 'bets-section' && !betsDataLoaded) {
      betsDataLoaded = true;
      loadUserBets();
    }
  }

  // 1. Check for previously saved tab state from TODAY
  const storedStateRaw = localStorage.getItem(TAB_STORAGE_KEY);
  if (storedStateRaw) {
    try {
      const storedState = JSON.parse(storedStateRaw);
      
      // ONLY restore if the interaction happened today
      if (storedState.date === getGameDateString(0) && storedState.tabId) {
        const targetTab = document.querySelector(`.nav-tab[data-target="${storedState.tabId}"]`);
        const targetSection = document.getElementById(storedState.tabId);

        if (targetTab && targetSection) {
          hideAllSections(); // Clear default visible sections

          // Activate saved tab/section
          targetTab.classList.add('active');
          targetSection.classList.remove('hidden');

          // If the restored tab is wallet or bets, load its data now
          maybeLoadTabData(storedState.tabId);

          // Add a small delay, then smoothly slide the tab into the center
          setTimeout(() => {
            targetTab.scrollIntoView({ 
              behavior: 'smooth', 
              inline: 'center', 
              block: 'nearest' 
            });
          }, 300); // 300ms gives the page a moment to render before sliding
        }
      }
    } catch (e) {
      console.warn('Could not parse saved tab state', e);
    }
  }

  // 2. Setup click listeners to change tabs AND save state
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const targetId = e.currentTarget.getAttribute('data-target');
      const targetSection = document.getElementById(targetId);

      if (!targetSection) return;

      hideAllSections(); // Clear previously active sections

      e.currentTarget.classList.add('active');
      targetSection.classList.remove('hidden');

      // Lazy-load tab data on first visit to wallet/bets tabs
      maybeLoadTabData(targetId);

      // Smoothly center the clicked tab
      e.currentTarget.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });

      // SAVE STATE: Record the tab ID and today's date
      const stateToSave = {
        date: getGameDateString(0),
        tabId: targetId
      };
      localStorage.setItem(TAB_STORAGE_KEY, JSON.stringify(stateToSave));
    });
  });
}

// --- LOGIN EVENT LISTENER ---
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (authError) authError.textContent = '';

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!username || !password) {
      if (authError) authError.textContent = 'Please enter both username and password.';
      return;
    }

    try {
      const user = await loginUser(username, password);
      showDashboard(user);
    } catch (err) {
      if (authError) authError.textContent = err.message || 'Login failed.';
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await logoutUser();
    walletDataLoaded = false;
    betsDataLoaded = false; // Reset so next login re-fetches fresh data
    showLogin();
  });
}

// --- VIEW NAVIGATION HELPERS ---
async function showDashboard(user) {
  loadingView.className = 'view hidden';
  loginView.className = 'view hidden';
  dashboardView.className = 'view active';

  // Nav bar is only measurable once the dashboard is actually visible
  updateNavOverflowState();

  if (userDisplay) userDisplay.textContent = user.username || 'Player';

  const profileUsernameEl = document.getElementById('profile-username');
  if (profileUsernameEl) profileUsernameEl.textContent = user.username || 'Player';

  const raceDateEl = document.getElementById('header-race-date');
  if (raceDateEl) {
    raceDateEl.textContent = `Race Day: ${getFormattedRaceDay()}`;
  }

  // Populates the header wallet balance (updateWalletUI runs inside)
  getTodayWalletBalance();

  // 1. Initialize Results View first on landing
  await initRaceResultsView();

  // 2. Pre-load background data for other tabs (bets/wallet data loads lazily on tab click)
  startRaceTimer('countdown-timer');
  loadTodayTrackName().then(trackName => {
    renderTrackName(trackName, 'next-race-track-name');
    renderTrackName(trackName, 'track-info-name');
  });
  const roster = await loadTodayRoster();
  renderOddsGrid(roster, 'today-odds-list');
  renderPaddockGrid(roster, 'paddock-horse-list');
}

function showLogin() {
  loadingView.className = 'view hidden';
  dashboardView.className = 'view hidden';
  loginView.className = 'view active';

  if (loginForm) loginForm.reset();
  if (authError) authError.textContent = '';
}
