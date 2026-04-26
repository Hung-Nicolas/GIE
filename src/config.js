import { createClient } from '@supabase/supabase-js';

let SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Corregir URL comúnmente mal copiada con /rest/v1/
SUPABASE_URL = SUPABASE_URL.replace(/\/rest\/v1\/?$/, '');

const URL_VALIDA = typeof SUPABASE_URL === 'string' && /^https?:\/\//.test(SUPABASE_URL) && !SUPABASE_URL.includes('__SUPABASE');
const KEY_VALIDA = typeof SUPABASE_KEY === 'string' && SUPABASE_KEY.length > 20 && !SUPABASE_KEY.includes('__SUPABASE');

export let USE_SUPABASE = URL_VALIDA && KEY_VALIDA;
export let supabaseClient = null;

if (USE_SUPABASE) {
    try {
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });
        window.supabaseClient = supabaseClient;
        // Cliente Supabase inicializado
    } catch (err) {
        // Error conectando a Supabase
        USE_SUPABASE = false;
    }
}
if (!USE_SUPABASE) {
    // Supabase no configurado. La autenticación requiere Supabase.
}
