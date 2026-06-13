import { USE_SUPABASE, supabaseClient, GIE_URL, GIE_KEY } from './config.js';

const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;
let _lastAlumnosSync = 0;

/**
 * Solicita la sincronización de alumnos desde Nexus hacia GIE
 * a través de la Edge Function sync-alumnos-nexus.
 * No requiere la anon key de Nexus en el frontend.
 */
export async function sincronizarAlumnosDesdeEdge(forzar = false) {
    if (!USE_SUPABASE || !supabaseClient) {
        console.warn('[GIE] Cliente no configurado. Saltando sincronización.');
        return { ok: false, error: 'Cliente no configurado', sincronizados: 0 };
    }

    const ahora = Date.now();
    if (!forzar && (ahora - _lastAlumnosSync) < MIN_SYNC_INTERVAL_MS) {
        console.log('[GIE] Sincronización reciente. Saltando.');
        return { ok: true, sincronizados: 0 };
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.access_token) {
        return { ok: false, error: 'Sin sesión activa', sincronizados: 0 };
    }

    if (typeof window !== 'undefined' && typeof window.mostrarToast === 'function') {
        window.mostrarToast('Sincronizando alumnos...', 'info');
    }
    console.log('[GIE] Solicitando sincronización de alumnos desde Nexus...');

    try {
        const res = await fetch(`${GIE_URL}/functions/v1/sync-alumnos-nexus`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GIE_KEY}`,
                'x-gie-auth': session.access_token
            },
            body: JSON.stringify({ forzar })
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.error) {
            throw new Error(json.error || `HTTP ${res.status}`);
        }

        _lastAlumnosSync = ahora;
        console.log('[GIE] Sincronización de alumnos completada:', json);
        return { ok: true, ...json };
    } catch (err) {
        console.error('[GIE] Error sincronizando alumnos:', err);
        return { ok: false, error: err.message, sincronizados: 0 };
    }
}
