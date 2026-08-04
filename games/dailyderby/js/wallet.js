import { supabase } from './supabaseClient.js';
import { CookieManager } from './util.js';

/**
 * Gets or initializes today's $30 wallet balance for the logged-in player
 */
export async function getTodayWalletBalance() {
  const session = getSession();
  if (!session) return 0;

  const { data, error } = await supabase.rpc('get_or_create_daily_wallet', {
    p_player_id: session.id
  });

  if (error) {
    console.error('Error fetching wallet balance:', error);
    return 0;
  }

  updateWalletUI(data);
  return parseFloat(data);
}

/**
 * Deducts wager amount from wallet
 */
export async function deductFromWallet(amount) {
  const session = getSession();
  if (!session) throw new Error('User not authenticated.');

  const currentBalance = await getTodayWalletBalance();
  if (amount > currentBalance) {
    throw new Error('Insufficient wallet funds.');
  }

  const newBalance = currentBalance - amount;

  const { error } = await supabase
    .from('wallets_daily_derby')
    .update({ balance: newBalance })
    .eq('player_id', session.id)
    .eq('wallet_date', new Date().toISOString().split('T')[0]);

  if (error) throw error;

  updateWalletUI(newBalance);
  return newBalance;
}

/**
 * Refunds wager amount when a bet is canceled
 */
export async function refundToWallet(amount) {
  const session = getSession();
  if (!session) return;

  const currentBalance = await getTodayWalletBalance();
  const newBalance = Math.min(30.00, currentBalance + amount); // Cap at daily max

  await supabase
    .from('wallets_daily_derby')
    .update({ balance: newBalance })
    .eq('player_id', session.id)
    .eq('wallet_date', new Date().toISOString().split('T')[0]);

  updateWalletUI(newBalance);
}

/**
 * Updates wallet UI indicators across tabs
 */
export function updateWalletUI(balance) {
  const formatted = `$${parseFloat(balance).toFixed(2)}`;
  
  const modalBalance = document.getElementById('modal-wallet-balance');
  const mainWalletTab = document.getElementById('user-wallet-display');
  
  if (modalBalance) modalBalance.textContent = formatted;
  if (mainWalletTab) mainWalletTab.textContent = formatted;
}

function getSession() {
  const raw = CookieManager.get('daily_derby_player_session');
  return raw ? JSON.parse(raw) : null;
}