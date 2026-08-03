import { loginUser, logoutUser, verifyBackendSession } from './auth.js';

// DOM References
const loadingView = document.getElementById('loading-view');
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('logout-btn');
const userDisplay = document.getElementById('user-display');

// --- APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  // Bind navigation tabs on load
  initTabNavigation();
  
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
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = tab.getAttribute('data-target');
      if (!targetId) return;

      // Reset active tabs & hide all contents
      navTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => {
        c.classList.remove('active');
        c.classList.add('hidden');
      });

      // Activate clicked tab & show matching content section
      tab.classList.add('active');
      const targetSection = document.getElementById(targetId);
      if (targetSection) {
        targetSection.classList.remove('hidden');
        targetSection.classList.add('active');
      }
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
function showDashboard(user) {
  loadingView.className = 'view hidden';
  loginView.className = 'view hidden';
  dashboardView.className = 'view active';

  if (userDisplay) {
    userDisplay.textContent = user.username || 'Player';
  }
}

function showLogin() {
  loadingView.className = 'view hidden';
  dashboardView.className = 'view hidden';
  loginView.className = 'view active';

  if (loginForm) loginForm.reset();
  if (authError) authError.textContent = '';
}