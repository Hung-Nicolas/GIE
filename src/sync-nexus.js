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
        return { ok: true, sincronizados: 0 };
    }

    // 2. Leer alumnos actuales de GIE para hacer match por nombre+apellido
    const { data: gieAlumnos, error: errorGie } = await supabaseClient
        .from('alumnos')
        .select('id, dni, nombre, apellido, curso, division, turno, origen');

    if (errorGie) {
        console.error('[Nexus] Error leyendo alumnos de GIE:', errorGie);
        return { ok: false, error: errorGie.message, sincronizados: 0 };
    }

    // Mapear por nombre+apellido (la constraint única de GIE)
    const giePorNombre = new Map((gieAlumnos || []).map(a => [`${a.nombre}|${a.apellido}`, a]));
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
            const cursoNexus = na.cursos?.anio
                ? `${na.cursos.anio}°`
                : na.division || '';
            const divisionNexus = na.cursos?.division || na.division || '';
            const turnoNexus = na.cursos?.turno || na.turno || 'Mañana';

            const clave = `${na.nombre}|${na.apellido}`;
            const existente = giePorNombre.get(clave);

            if (existente) {
                // Actualizar alumno existente (manteniendo su UUID, agregando DNI si no lo tiene)
                updates.push({
                    id: existente.id,
                    nombre: na.nombre,
                    apellido: na.apellido,
                    curso: cursoNexus,
                    division: divisionNexus,
                    turno: turnoNexus,
                    dni: na.dni,
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
                    nexus_synced_at: ahora,
                    origen: 'nexus'
                });
            }
        }

        // Ejecutar inserts de alumnos nuevos
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

        // Ejecutar updates de alumnos existentes
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
            .delete()
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

/**
 * Sincroniza un informe de GIE hacia Nexus.
 * Se llama después de crear o actualizar un informe.
 */
export async function sincronizarInformeEnNexus(informeId) {
    if (!NEXUS_ENABLED || !nexusClient) {
        console.warn('[Nexus] Cliente no configurado. Saltando sincronización de informe.');
        return { ok: false, error: 'Nexus no configurado' };
    }

    try {
        // 1. Leer informe completo desde GIE
        const { data: informe, error: errInf } = await supabaseClient
            .from('informes')
            .select('*')
            .eq('id', informeId)
            .single();

        if (errInf || !informe) {
            console.error('[Nexus] No se pudo leer el informe:', errInf);
            return { ok: false, error: 'Informe no encontrado' };
        }

        // 2. Obtener DNI del alumno desde GIE
        const { data: alumno, error: errAlumno } = await supabaseClient
            .from('alumnos')
            .select('dni')
            .eq('id', informe.alumno_id)
            .single();

        if (errAlumno || !alumno?.dni) {
            console.error('[Nexus] No se pudo obtener DNI del alumno:', errAlumno);
            return { ok: false, error: 'DNI no disponible' };
        }

        // 3. Obtener nombre de la categoría desde GIE
        let categoriaNombre = 'Otros';
        if (informe.categoria_id) {
            const { data: cat, error: errCat } = await supabaseClient
                .from('categorias')
                .select('nombre')
                .eq('id', informe.categoria_id)
                .single();
            if (!errCat && cat?.nombre) {
                categoriaNombre = cat.nombre;
            }
        }

        // 4. Preparar parámetros para la RPC de Nexus
        const params = {
            p_gie_id: informe.id,
            p_dni_alumno: alumno.dni,
            p_categoria_nombre: categoriaNombre,
            p_tipo_falta: informe.tipo_falta || 'Otra',
            p_titulo: informe.titulo,
            p_instancia: informe.instancia,
            p_resumen: informe.resumen,
            p_descargo: informe.descargo || null,
            p_estado: informe.estado,
            p_motivo_rechazo: informe.motivo_rechazo || null,
            p_fecha_reunion: informe.fecha_reunion || null,
            p_observaciones: informe.observaciones || null,
            p_fecha_creacion: informe.fecha_creacion,
            p_fecha_revision: informe.fecha_revision || null,
            p_numero: informe.numero || null,
            p_gie_creado_por: informe.creado_por || null
        };

        // 5. Llamar a la función RPC de Nexus
        const { error: rpcError } = await nexusClient.rpc('sync_informe_gie', params);

        if (rpcError) {
            console.error('[Nexus] Error sincronizando informe en Nexus:', rpcError);
            return { ok: false, error: rpcError.message };
        }

        // 6. Marcar como sincronizado en GIE
        const ahora = new Date().toISOString();
        const { error: updError } = await supabaseClient
            .from('informes')
            .update({ nexus_synced_at: ahora })
            .eq('id', informe.id);

        if (updError) {
            console.error('[Nexus] Error actualizando nexus_synced_at:', updError);
        }

        console.log('[Nexus] Informe sincronizado:', informe.id);
        return { ok: true, nexus_synced_at: ahora };
    } catch (err) {
        console.error('[Nexus] Error inesperado sincronizando informe:', err);
        return { ok: false, error: err.message };
    }
}
