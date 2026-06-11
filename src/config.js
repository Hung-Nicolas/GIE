import { createClient } from '@supabase/supabase-js';

// ============================================================
// GIE: base de datos propia + RLS (informes, alumnos, perfiles, etc.)
// ============================================================
export const GIE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const GIE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const GIE_URL_VALIDA = typeof GIE_URL === 'string' && /^https?:\/\//.test(GIE_URL) && GIE_URL.length > 20;
const GIE_KEY_VALIDA = typeof GIE_KEY === 'string' && GIE_KEY.length > 20 && GIE_KEY.startsWith('eyJ');

// ============================================================
// NEXUS: autenticación + datos maestros (personal, alumnos, informes)
// ============================================================
export const NEXUS_URL = import.meta.env.VITE_NEXUS_URL || '';
export const NEXUS_KEY = import.meta.env.VITE_NEXUS_ANON_KEY || '';

const NEXUS_URL_VALIDA = typeof NEXUS_URL === 'string' && /^https?:\/\//.test(NEXUS_URL) && NEXUS_URL.length > 20;
const NEXUS_KEY_VALIDA = typeof NEXUS_KEY === 'string' && NEXUS_KEY.length > 20 && NEXUS_KEY.startsWith('eyJ');

export let USE_SUPABASE = GIE_URL_VALIDA && GIE_KEY_VALIDA && NEXUS_URL_VALIDA && NEXUS_KEY_VALIDA;
export let supabaseClient = null;
export let nexusClient = null;

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
        window.supabaseClient = supabaseClient;

        nexusClient = createClient(NEXUS_URL, NEXUS_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false,
                storageKey: 'nexus-auth-session',
                storage: window.localStorage
            }
        });
        window.nexusClient = nexusClient;
    } catch (err) {
        console.error('[GIE] Error inicializando clientes Supabase:', err);
        USE_SUPABASE = false;
        supabaseClient = null;
        nexusClient = null;
    }
}

// ============================================================
// GIE: Proxy para operaciones que requieren service_role
// (plantillas, historial, observaciones, etc.)
// Valida el JWT de Nexus contra la Edge Function y ejecuta la query en BD de GIE.
// ============================================================
export async function gieProxy({ operacion, tabla, datos, where }) {
    if (!nexusClient) {
        return { success: false, error: 'Nexus no conectado' };
    }
    const { data: { session } } = await nexusClient.auth.getSession();
    const nexusJwt = session?.access_token;
    if (!nexusJwt) {
        return { success: false, error: 'Sin sesión de Nexus' };
    }

    try {
        const res = await fetch(`${GIE_URL}/functions/v1/gie-proxy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GIE_KEY}`,
                'x-nexus-auth': nexusJwt
            },
            body: JSON.stringify({ operacion, tabla, datos, where })
        });
        return await res.json();
    } catch (err) {
        return { success: false, error: err.message };
    }
}
