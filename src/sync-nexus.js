import { USE_SUPABASE as NEXUS_ENABLED, nexusClient, supabaseClient } from './config.js';

/**
 * Sincroniza alumnos desde Nexus hacia GIE.
 * - Lee alumnos activos de Nexus
 * - Upsert en GIE por DNI (inserta si no existe, actualiza si existe)
 * - Mantiene el UUID interno de GIE para no romper FKs
 * - Marca origen='nexus' para distinguir de alumnos manuales
 */
// Frecuencia mínima entre sincronizaciones (5 minutos)
const MIN_SYNC_INTERVAL_MS = 5 * 60 * 1000;
let _lastAlumnosSync = 0;

export async function sincronizarAlumnosDesdeNexus(forzar = false) {
    if (!NEXUS_ENABLED || !nexusClient || !supabaseClient) {
        console.warn('[Nexus] Cliente no configurado. Saltando sincronización.');
        return { ok: false, error: 'Nexus no configurado', sincronizados: 0 };
    }

    // Evitar sincronizaciones muy frecuentes (a menos que sea forzado)
    const ahora = Date.now();
    if (!forzar && (ahora - _lastAlumnosSync) < MIN_SYNC_INTERVAL_MS) {
        console.log('[Nexus] Sincronización reciente. Saltando.');
        return { ok: true, sincronizados: 0 };
    }

    if (typeof mostrarToast === 'function') mostrarToast('Sincronizando alumnos con Nexus...', 'info');
    console.log('[Nexus] Iniciando sincronización de alumnos...');

    // 1. Leer alumnos de Nexus (incluyendo curso relacionado para mapeo)
    const { data: nexusAlumnos, error: errorNexus } = await nexusClient
        .from('alumnos')
        .select('dni, nombre, apellido, email, especialidad, division, turno, email_padre, telefono, cursos(anio, division, turno, especialidad)')
        .order('apellido');

    if (errorNexus) {
        console.error('[Nexus] Error leyendo alumnos de Nexus:', errorNexus);
        return { ok: false, error: errorNexus.message, sincronizados: 0 };
    }

    if (!nexusAlumnos || nexusAlumnos.length === 0) {
        console.log('[Nexus] No hay alumnos para sincronizar.');
        _lastAlumnosSync = ahora;
        return { ok: true, sincronizados: 0 };
    }

    // 2. Leer alumnos actuales de GIE para hacer match por DNI y por nombre+apellido
    const { data: gieAlumnos, error: errorGie } = await supabaseClient
        .from('alumnos')
        .select('id, dni, nombre, apellido, curso, division, turno, origen');

    if (errorGie) {
        console.error('[Nexus] Error leyendo alumnos de GIE:', errorGie);
        return { ok: false, error: errorGie.message, sincronizados: 0 };
    }

    // Mapear por DNI (prioridad) y por nombre+apellido (fallback)
    const giePorDni = new Map((gieAlumnos || []).filter(a => a.dni).map(a => [String(a.dni), a]));
    const giePorNombre = new Map((gieAlumnos || []).map(a => [`${a.nombre}|${a.apellido}`, a]));
    let insertados = 0;
    let actualizados = 0;
    const syncTime = new Date().toISOString();

    // 3. Procesar cada alumno de Nexus
    const batchSize = 100;
    for (let i = 0; i < nexusAlumnos.length; i += batchSize) {
        const batch = nexusAlumnos.slice(i, i + batchSize);
        const upserts = [];

        for (const na of batch) {
            if (!na.dni) continue;

            // Mapear campos de Nexus → GIE
            const cursoNexus = na.cursos?.anio
                ? `${na.cursos.anio}°`
                : na.division || '';
            const divisionNexus = na.cursos?.division || na.division || '';
            const turnoNexus = na.cursos?.turno || na.turno || 'Mañana';

            const claveDni = na.dni ? String(na.dni) : null;
            const claveNombre = `${na.nombre}|${na.apellido}`;
            const existente = claveDni ? giePorDni.get(claveDni) : giePorNombre.get(claveNombre);

            if (existente) {
                // Actualizar alumno existente (manteniendo su UUID)
                upserts.push({
                    id: existente.id,
                    nombre: na.nombre,
                    apellido: na.apellido,
                    curso: cursoNexus,
                    division: divisionNexus,
                    turno: turnoNexus,
                    dni: na.dni,
                    origen: 'nexus'
                });
            } else {
                // Crear nuevo alumno en GIE (sin ID para que genere UUID)
                upserts.push({
                    nombre: na.nombre,
                    apellido: na.apellido,
                    curso: cursoNexus,
                    division: divisionNexus,
                    turno: turnoNexus,
                    dni: na.dni,
                    origen: 'nexus'
                });
            }
        }

        // Ejecutar upsert batch (inserta nuevos, actualiza existentes por ID)
        if (upserts.length > 0) {
            const nuevos = upserts.filter(u => !u.id).length;
            const existentes = upserts.filter(u => !!u.id).length;
            const { error: errUpsert } = await supabaseClient
                .from('alumnos')
                .upsert(upserts, { onConflict: 'id', ignoreDuplicates: false });

            if (errUpsert) {
                console.error('[Nexus] Error en batch upsert:', errUpsert);
            } else {
                insertados += nuevos;
                actualizados += existentes;
            }
        }
    }

    // 4. Opcional: desactivar alumnos de GIE que ya no están activos en Nexus
    const nexusDnIs = new Set(nexusAlumnos.map(a => a.dni).filter(Boolean));
    const paraDesactivar = (gieAlumnos || []).filter(
        a => a.origen === 'nexus' && a.dni && !nexusDnIs.has(a.dni)
    );

    if (paraDesactivar.length > 0) {
        const idsDesactivar = paraDesactivar.map(a => a.id);
        const { error: errDes } = await supabaseClient
            .from('alumnos')
            .delete()
            .in('id', idsDesactivar);
        if (errDes) {
            console.error('[Nexus] Error desactivando alumnos:', errDes);
        } else {
            console.log('[Nexus] Alumnos desactivados:', idsDesactivar.length);
        }
    }

    _lastAlumnosSync = ahora;
    const total = insertados + actualizados;
    console.log(`[Nexus] Sincronización completa: ${insertados} insertados, ${actualizados} actualizados.`);
    return { ok: true, insertados, actualizados, sincronizados: total };
}

/**
 * Mapea roles de Nexus a roles válidos de GIE.
 */
function mapearRolNexusAGIE(rolNexus) {
    const map = {
        regente: 'regente',
        subregente: 'regente',
        rector: 'regente',
        vicerector: 'regente',
        jefe_de_taller: 'regente',
        docente: 'docente',
        preceptor: 'preceptor',
        doe: 'doe',
        pat: 'pat'
    };
    return map[rolNexus] || 'docente';
}

/**
 * Sincroniza personal de Nexus hacia perfiles de GIE.
 * Solo actualiza perfiles existentes (no crea usuarios en auth.users).
 * Los nuevos usuarios se crean automáticamente al iniciar sesión.
 */
export async function sincronizarPersonalDesdeNexus(forzar = false) {
    if (!NEXUS_ENABLED || !nexusClient || !supabaseClient) {
        console.warn('[Nexus] Cliente no configurado. Saltando sincronización de personal.');
        return { ok: false, error: 'Nexus no configurado' };
    }

    console.log('[Nexus] Iniciando sincronización de personal...');

    const { data: nexusPersonal, error: errorNexus } = await nexusClient
        .from('perfiles')
        .select('nombre, apellido, email, rol')
        .order('apellido');

    if (errorNexus) {
        console.error('[Nexus] Error leyendo personal de Nexus:', errorNexus);
        return { ok: false, error: errorNexus.message };
    }

    if (!nexusPersonal || nexusPersonal.length === 0) {
        console.log('[Nexus] No hay personal para sincronizar.');
        return { ok: true, sincronizados: 0 };
    }

    const emails = nexusPersonal.map(p => p.email).filter(Boolean);
    const { data: giePerfiles, error: errorGie } = await supabaseClient
        .from('perfiles')
        .select('id, email, nombre, apellido, rol')
        .in('email', emails);

    if (errorGie) {
        console.error('[Nexus] Error leyendo perfiles de GIE:', errorGie);
        return { ok: false, error: errorGie.message };
    }

    const perfilPorEmail = new Map((giePerfiles || []).map(p => [p.email, p]));

    let actualizados = 0;
    let sinUsuario = 0;

    for (const np of nexusPersonal) {
        if (!np.email) continue;
        const perfil = perfilPorEmail.get(np.email);
        if (!perfil) {
            sinUsuario++;
            continue;
        }

        const rolGIE = mapearRolNexusAGIE(np.rol);
        if (perfil.nombre === np.nombre && perfil.apellido === np.apellido && perfil.rol === rolGIE) {
            continue;
        }

        const { error: updError } = await supabaseClient
            .from('perfiles')
            .update({
                nombre: np.nombre,
                apellido: np.apellido,
                rol: rolGIE
            })
            .eq('id', perfil.id);

        if (updError) {
            console.warn('[Nexus] Error actualizando perfil:', np.email, updError);
        } else {
            actualizados++;
        }
    }

    console.log(`[Nexus] Sincronización de personal completa: ${actualizados} actualizados, ${sinUsuario} sin usuario en GIE.`);
    return { ok: true, actualizados, sinUsuario };
}

/**
 * Fuerza la sincronización manual (puede llamarse desde consola o un botón de admin)
 */
export async function forzarSincronizacionNexus() {
    const btn = document.getElementById('btnSyncNexus');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sincronizando...';
    }

    const resAlumnos = await sincronizarAlumnosDesdeNexus(true);
    const resPersonal = await sincronizarPersonalDesdeNexus(true);

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Sincronizar con Nexus';
    }

    return { alumnos: resAlumnos, personal: resPersonal };
}


