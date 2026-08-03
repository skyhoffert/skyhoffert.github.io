import { supabase, CookieManager } from './supabaseClient.js';

const SESSION_COOKIE_NAME = 'daily_derby_player_session';

/**
 * Authenticate against Daily Derby database RPC
 */
export async function loginUser(username, password) {
  try {
    const { data, error } = await supabase.rpc('authenticate_player_daily_derby', {
      p_username: username,
      p_password: password
    });

    if (error) {
      console.error('Supabase RPC Error:', error);
      throw new Error(`Database Error: ${error.message || error.details || 'Unknown RPC error'}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Invalid username or password.');
    }

    const player = data[0]; // { player_id, username }

    const sessionData = {
      id: player.player_id,
      username: player.username,
      loginAt: Date.now()
    };

    CookieManager.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), 7);
    return sessionData;

  } catch (err) {
    console.error('Login Failed:', err);
    throw err;
  }
}

export async function logoutUser() {
  CookieManager.erase(SESSION_COOKIE_NAME);
  return true;
}

export async function verifyBackendSession() {
  const rawSession = CookieManager.get(SESSION_COOKIE_NAME);
  if (!rawSession) return null;

  try {
    const session = JSON.parse(rawSession);

    const { data: player, error } = await supabase
      .from('players_daily_derby')
      .select('id, username')
      .eq('id', session.id)
      .maybeSingle();

    if (error) {
      console.error('Session verification error:', error);
      CookieManager.erase(SESSION_COOKIE_NAME);
      return null;
    }

    if (!player) {
      CookieManager.erase(SESSION_COOKIE_NAME);
      return null;
    }

    return player;
  } catch (err) {
    console.error('Invalid session cookie format:', err);
    CookieManager.erase(SESSION_COOKIE_NAME);
    return null;
  }
}