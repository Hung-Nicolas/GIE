import { NEXUS_ENABLED, nexusClient } from './nexus-client.js';
import { supabaseClient } from './config.js';

/**
 * Sincroniza alumnos desde Nexus hacia GIE.
 * - Lee alumnos activos de Nexus
 * - Upsert en GIE por DNI (inserta si no existe, actualiza si existe)
 * - Mantiene el UUID interno de GIE para no romper FKs
 * - Marca origen='nexus' para distinguir de alumnos manuales
 */
export async function sincronizarAlumnosDesdeNexus() {
    if (!NEXUS_ENABLED || !nexusClient) {
        console.warn('[Nexus] Cliente no configurado. Saltando sincronización.');
        return { ok: false, error: 'Nexus no configurado', sincronizados: 0 };
    }

    console.log('[Nexus] Iniciando sincronización de alumnos...');

    // 1. Leer alumnos activos de Nexus (incluyendo curso relacionado para mapeo)
    const { data: nexusAlumnos, error: errorNexus } = await nexusClient
        .from('alumnos')
        .select('dni, nombre, apellido, email, especialidad, division, turno, email_padre, telefono, activo, cursos(anio, division, turno, especialidad)')
        .eq('activo', true)
        .order('apellido');

    if (errorNexus) {
        console.error('[Nexus] Error leyendo alumnos de Nexus:', errorNexus);
        return { ok: false, error: errorNexus.message, sincronizados: 0 };
    }

    if (!nexusAlumnos || nexusAlumnos.length === 0) {
        console.log('[Nexus] No hay alumnos para sincronizar.');
        return { ok: true, sincronizados: 0 };
    }

    // 2. Leer alumnos actuales de GIE con su DNI para hacer match
    const { data: gieAlumnos, error: errorGie } = await supabaseClient
        .from('alumnos')
        .select('id, dni, nombre, apellido, curso, division, turno, origen');

    if (errorGie) {
        console.error('[Nexus] Error leyendo alumnos de GIE:', errorGie);
        return { ok: false, error: errorGie.message, sincronizados: 0 };
    }

    const giePorDni = new Map((gieAlumnos || []).map(a => [a.dni, a]));
    let insertados = 0;
    let actualizados = 0;
    const ahora = new Date().toISOString();

    // 3. Procesar cada alumno de Nexus
    const batchSize = 50;
    for (let i = 0; i < nexusAlumnos.length; i += batchSize) {
        const batch = nexusAlumnos.slice(i, i + batchSize);
        const upserts = [];
        const updates = [];

        for (const na of batch) {
            if (!na.dni) continue;

            // Mapear campos de Nexus → GIE
            // Nexus: cursos(anio, division) o campos directos en alumno
            const cursoNexus = na.cursos?.anio
                ? `${na.cursos.anio}°`
                : na.division || '';
            const divisionNexus = na.cursos?.division || na.division || '';
            const turnoNexus = na.cursos?.turno || na.turno || 'Mañana';

            const existente = giePorDni.get(na.dni);

            if (existente) {
                // Actualizar alumno existente (manteniendo su UUID)
                updates.push({
                    id: existente.id,
                    nombre: na.nombre,
                    apellido: na.apellido,
                    curso: cursoNexus,
                    division: divisionNexus,
                    turno: turnoNexus,
                    activo: na.activo !== false,
                    nexus_synced_at: ahora,
                    origen: 'nexus'
                });
            } else {
                // Crear nuevo alumno en GIE
                upserts.push({
                    nombre: na.nombre,
                    apellido: na.apellido,
                    curso: cursoNexus,
                    division: divisionNexus,
                    turno: turnoNexus,
                    dni: na.dni,
                    activo: na.activo !== false,
                    nexus_synced_at: ahora,
                    origen: 'nexus'
                });
            }
        }

        // Ejecutar inserts
        if (upserts.length > 0) {
            const { error: errInsert } = await supabaseClient
                .from('alumnos')
                .insert(upserts);
            if (errInsert) {
                console.error('[Nexus] Error insertando alumnos:', errInsert);
            } else {
                insertados += upserts.length;
            }
        }

        // Ejecutar updates (uno por uno para no complicar con upsert sin PK conocida)
        for (const upd of updates) {
            const { error: errUpdate } = await supabaseClient
                .from('alumnos')
                .update(upd)
                .eq('id', upd.id);
            if (errUpdate) {
                console.error('[Nexus] Error actualizando alumno', upd.id, errUpdate);
            } else {
                actualizados++;
            }
        }
    }

    // 4. Opcional: desactivar alumnos de GIE que ya no están activos en Nexus
    // (solo si tienen origen='nexus' para no afectar manuales)
    const nexusDnIs = new Set(nexusAlumnos.map(a => a.dni).filter(Boolean));
    const paraDesactivar = (gieAlumnos || []).filter(
        a => a.origen === 'nexus' && a.dni && !nexusDnIs.has(a.dni)
    );

    if (paraDesactivar.length > 0) {
        const idsDesactivar = paraDesactivar.map(a => a.id);
        const { error: errDes } = await supabaseClient
            .from('alumnos')
            .update({ activo: false })
            .in('id', idsDesactivar);
        if (errDes) {
            console.error('[Nexus] Error desactivando alumnos:', errDes);
        } else {
            console.log('[Nexus] Alumnos desactivados:', idsDesactivar.length);
        }
    }

    const total = insertados + actualizados;
    console.log(`[Nexus] Sincronización completa: ${insertados} insertados, ${actualizados} actualizados.`);
    return { ok: true, insertados, actualizados, sincronizados: total };
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

    const resultado = await sincronizarAlumnosDesdeNexus();

    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Sincronizar con Nexus';
    }

    return resultado;
}
