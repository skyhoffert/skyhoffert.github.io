// supabaseClient.js
const SUPABASE_URL = 'https://shxtfuxcgkzrchvkhvgl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_0ZE23PdJLvJyq6gfT9ORUg_mxHJGPXz';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
