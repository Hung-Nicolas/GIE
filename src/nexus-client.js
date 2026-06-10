import { createClient } from '@supabase/supabase-js';

// Cliente para conectarse a la BD maestra Nexus
// Estas variables deben configurarse en el .env de GIE:
// VITE_NEXUS_URL=https://peeslwpcclhvvmneyefl.supabase.co
// VITE_NEXUS_ANON_KEY=sb_publishable_OerHfjmV_n4bIVUC3i88dw_yD9z0y1w

const NEXUS_URL = import.meta.env.VITE_NEXUS_URL || '';
const NEXUS_KEY = import.meta.env.VITE_NEXUS_ANON_KEY || '';

const URL_VALIDA = typeof NEXUS_URL === 'string' && /^https?:\/\//.test(NEXUS_URL);
const KEY_VALIDA = typeof NEXUS_KEY === 'string' && NEXUS_KEY.length > 20;

export const NEXUS_ENABLED = URL_VALIDA && KEY_VALIDA;
export let nexusClient = null;

if (NEXUS_ENABLED) {
    try {
        nexusClient = createClient(NEXUS_URL, NEXUS_KEY, {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            }
        });
        window.nexusClient = nexusClient;
    } catch (err) {
        console.error('[Nexus] Error inicializando cliente:', err);
    }
}
