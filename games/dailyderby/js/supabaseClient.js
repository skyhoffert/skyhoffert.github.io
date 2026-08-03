// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://shxtfuxcgkzrchvkhvgl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0ZE23PdJLvJyq6gfT9ORUg_mxHJGPXz';

// Initialize Supabase client
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper: Cookie Utilities for Storing Auth Session Token
export const CookieManager = {
  set(name, value, days = 7) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict; Secure`;
  },
  get(name) {
    return document.cookie.split('; ').reduce((r, v) => {
      const parts = v.split('=');
      return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, '');
  },
  erase(name) {
    document.cookie = `${name}=; Max-Age=-99999999; path=/;`;
  }
};