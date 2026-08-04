import { loginUser, logoutUser, verifyBackendSession } from './auth.js';
import { startRaceTimer, stopRaceTimer } from './timer.js';
import { loadTodayRoster, renderOddsGrid, renderPaddockGrid } from './horses.js';
import { initBetModal } from './betslip.js';
import { loadUserBets, initBetRemovalListeners } from './myBets.js';
import { initRaceResultsView } from './raceReplay.js';
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

// --- APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  // Bind navigation tabs on load
  initTabNavigation();
  initBetModal();
  initBetRemovalListeners(); // Initialize cancel bet listener

  // Verify session cookie against backend on startup
  const user = await verifyBackendSession();
  if (user) {
    showDashboard(user);
  } else {
    showLogin();
  }
});

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

// --- LOGOUT EVENT LISTENER ---
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await logoutUser();
    showLogin();
  });
}

// --- VIEW NAVIGATION HELPERS ---
async function showDashboard(user) {
  loadingView.className = 'view hidden';
  loginView.className = 'view hidden';
  dashboardView.className = 'view active';

  if (userDisplay) userDisplay.textContent = user.username || 'Player';

  const raceDateEl = document.getElementById('header-race-date');
  if (raceDateEl) {
    raceDateEl.textContent = `Race Day: ${getFormattedRaceDay()}`;
  }

  // 1. Initialize Results View first on landing
  await initRaceResultsView();

  // 2. Pre-load background data for other tabs
  startRaceTimer('countdown-timer');
  const roster = await loadTodayRoster();
  renderOddsGrid(roster, 'today-odds-list');
  renderPaddockGrid(roster, 'paddock-horse-list');
  await loadUserBets();
}

function showLogin() {
  loadingView.className = 'view hidden';
  dashboardView.className = 'view hidden';
  loginView.className = 'view active';

  if (loginForm) loginForm.reset();
  if (authError) authError.textContent = '';
}