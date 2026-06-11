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

/**
 * Sincroniza un informe de GIE hacia Nexus.
 * Se llama después de crear o actualizar un informe.
 */
export async function sincronizarInformeEnNexus(informeId) {
    if (!NEXUS_ENABLED || !nexusClient || !supabaseClient) {
        console.warn('[Nexus] Cliente no configurado. Saltando sincronización de informe.');
        return { ok: false, error: 'Nexus no configurado' };
    }

    if (typeof mostrarToast === 'function') mostrarToast('Sincronizando informe con Nexus...', 'info');
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

        // 6. Guardar trazabilidad del sync en tabla desacoplada
        const ahora = new Date().toISOString();
        if (informe.numero) {
            const { error: syncErr } = await supabaseClient
                .from('sincronizaciones')
                .upsert({
                    tabla_origen: 'informes',
                    id_local: informe.id,
                    sistema_externo: 'nexus',
                    id_remoto: String(informe.numero),
                    synced_at: ahora
                }, { onConflict: 'tabla_origen,sistema_externo,id_remoto' });

            if (syncErr) {
                console.error('[Nexus] Error guardando sincronización:', syncErr);
            }
        }

        console.log('[Nexus] Informe sincronizado:', informe.id);
        return { ok: true, synced_at: ahora };
    } catch (err) {
        console.error('[Nexus] Error inesperado sincronizando informe:', err);
        return { ok: false, error: err.message };
    }
}

/**
 * Sincroniza informes desde Nexus hacia GIE.
 * Lee informes de Nexus y los inserta en GIE vinculando por DNI.
 */
export async function sincronizarInformesDesdeNexus() {
    if (!NEXUS_ENABLED || !nexusClient || !supabaseClient) {
        console.warn('[Nexus] Cliente no configurado. Saltando sincronización de informes.');
        return { ok: false, error: 'Nexus no configurado', sincronizados: 0 };
    }

    console.log('[Nexus] Iniciando sincronización de informes...');

    // 1. Leer informes de Nexus
    const { data: nexusInformes, error: errNexus } = await nexusClient
        .from('informes')
        .select('id_informe, dni_alumno, id_categoria, tipo_falta, titulo, instancia, resumen, descargo, estado, dni_creador, dni_revisor, fecha_creacion, fecha_revision, motivo_rechazo, fecha_reunion, dni_derivado, numero, observaciones')
        .order('fecha_creacion', { ascending: false })
        .limit(100);

    if (errNexus) {
        console.error('[Nexus] Error leyendo informes de Nexus:', errNexus);
        return { ok: false, error: errNexus.message, sincronizados: 0 };
    }

    if (!nexusInformes || nexusInformes.length === 0) {
        console.log('[Nexus] No hay informes para sincronizar.');
        return { ok: true, sincronizados: 0 };
    }

    // Mapeo de id_categoria Nexus → nombre
    const categoriaNombres = {
        1: 'Conducta',
        2: 'Disciplina',
        3: 'Asistencia',
        4: 'Académica',
        5: 'Otros'
    };

    // 2. Leer categorías de GIE
    const { data: gieCategorias } = await supabaseClient.from('categorias').select('id, nombre');
    const catPorNombre = new Map((gieCategorias || []).map(c => [c.nombre, c.id]));

    let insertados = 0;
    let actualizados = 0;

    for (const ni of nexusInformes) {
        if (!ni.dni_alumno) continue;

        // Buscar alumno en GIE por DNI
        const { data: alumnoGie } = await supabaseClient
            .from('alumnos')
            .select('id')
            .eq('dni', ni.dni_alumno)
            .single();

        if (!alumnoGie?.id) {
            console.warn('[Nexus] Alumno no encontrado en GIE para DNI:', ni.dni_alumno);
            continue;
        }

        // Buscar categoría
        const catNombre = categoriaNombres[ni.id_categoria] || 'Otros';
        const catId = catPorNombre.get(catNombre);

        // Buscar si el informe ya existe en GIE por número
        const { data: existente } = await supabaseClient
            .from('informes')
            .select('id')
            .eq('numero', ni.numero)
            .maybeSingle();

        if (existente?.id) {
            // Actualizar
            const { error: errUpd } = await supabaseClient
                .from('informes')
                .update({
                    titulo: ni.titulo,
                    resumen: ni.resumen,
                    estado: ni.estado,
                    instancia: ni.instancia,
                    tipo_falta: ni.tipo_falta,
                    descargo: ni.descargo,
                    fecha_revision: ni.fecha_revision,
                    motivo_rechazo: ni.motivo_rechazo,
                    fecha_reunion: ni.fecha_reunion,
                    observaciones: ni.observaciones,
                    categoria_id: catId
                })
                .eq('id', existente.id);
            if (!errUpd) actualizados++;
        } else {
            // Insertar
            const { error: errIns } = await supabaseClient
                .from('informes')
                .insert({
                    alumno_id: alumnoGie.id,
                    categoria_id: catId,
                    tipo_falta: ni.tipo_falta || 'Otra',
                    titulo: ni.titulo,
                    instancia: ni.instancia,
                    resumen: ni.resumen,
                    descargo: ni.descargo,
                    estado: ni.estado || 'pendiente',
                    fecha_creacion: ni.fecha_creacion,
                    fecha_revision: ni.fecha_revision,
                    motivo_rechazo: ni.motivo_rechazo,
                    fecha_reunion: ni.fecha_reunion,
                    observaciones: ni.observaciones,
                    numero: ni.numero
                });
            if (!errIns) insertados++;
        }
    }

    const total = insertados + actualizados;
    console.log(`[Nexus] Sincronización de informes completa: ${insertados} insertados, ${actualizados} actualizados.`);
    return { ok: true, insertados, actualizados, sincronizados: total };
}
