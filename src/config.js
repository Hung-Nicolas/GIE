import { createClient } from '@supabase/supabase-js';

// ============================================================
// GIE: base de datos propia + auth + RLS
// ============================================================
export const GIE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const GIE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const GIE_URL_VALIDA = typeof GIE_URL === 'string' && /^https?:\/\//.test(GIE_URL) && GIE_URL.length > 20;
const GIE_KEY_VALIDA = typeof GIE_KEY === 'string' && GIE_KEY.length > 20 && GIE_KEY.startsWith('eyJ');

export let USE_SUPABASE = GIE_URL_VALIDA && GIE_KEY_VALIDA;
export let supabaseClient = null;

if (USE_SUPABASE) {
    try {
        supabaseClient = createClient(GIE_URL, GIE_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false,
                storageKey: 'gie-auth-session',
                storage: window.localStorage
            }
        });
        // Exponer el cliente solo en desarrollo para debugging. Nunca en producción.
        if (import.meta.env.DEV) {
            window.supabaseClient = supabaseClient;
        }
    } catch (err) {
        console.error('[GIE] Error inicializando cliente Supabase:', err);
        USE_SUPABASE = false;
        supabaseClient = null;
    }
}
