export const SUPABASE_URL = 'https://ctyjgcimmpwlmtsedkbk.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_VbYYEdmoMrfSK_RAaFEIGA_hNJM_0Z_';

// ?league=0 shows the hidden test league
export const LEAGUE = Number(new URLSearchParams(location.search).get('league') ?? 1);
