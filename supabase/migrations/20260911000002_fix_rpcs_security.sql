-- =============================================================================
-- Migración: 20260911000002_fix_rpcs_security.sql
-- Propósito: Corrección de vulnerabilidades en Stored Procedures (RPCs):
--            - VULN-01: Corrección de 3VL SQL NULL y control de acceso en devolver_informe_a_pendiente
--            - VULN-02: Protección por clave secreta / autenticación en recibir_informe_nexus
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. RPC: devolver_informe_a_pendiente (Corrección VULN-01)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.devolver_informe_a_pendiente(
    p_informe_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_informe public.informes%ROWTYPE;
BEGIN
    -- Validar autenticación explícita
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Acceso no autorizado: Debe iniciar sesión para devolver un informe';
    END IF;

    SELECT * INTO v_informe FROM public.informes WHERE id = p_informe_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Informe no encontrado con ID: %', p_informe_id;
    END IF;
    
    -- Validar que el informe se encuentre actualmente en estado derivado
    IF v_informe.estado != 'derivado' THEN
        RAISE EXCEPTION 'Operación inválida: Solo informes en estado derivado pueden devolverse a pendiente (Estado actual: %)', v_informe.estado;
    END IF;
    
    -- Validar que el usuario sea el destinatario de la derivación o una autoridad directiva
    IF (v_informe.derivado_a IS NULL OR auth.uid() != v_informe.derivado_a) AND NOT public.es_regente_db() THEN
        RAISE EXCEPTION 'Acceso denegado: No tiene permisos sobre este informe derivado';
    END IF;
    
    -- Actualizar estado
    UPDATE public.informes
    SET estado = 'pendiente',
        derivado_a = NULL
    WHERE id = p_informe_id;
    
    -- Registrar en bitácora de auditoría
    INSERT INTO public.historial_informes (
        informe_id,
        usuario_id,
        accion,
        detalle
    ) VALUES (
        p_informe_id,
        auth.uid(),
        'devolucion_regencia',
        'Informe devuelto a Regencia desde intervención especializada'
    );
END;
$$;

-- Permisos estrictos para devolver_informe_a_pendiente
REVOKE ALL ON FUNCTION public.devolver_informe_a_pendiente(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.devolver_informe_a_pendiente(UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. RPC: recibir_informe_nexus (Corrección VULN-02)
-- -----------------------------------------------------------------------------
-- Eliminar firma antigua insegura
DROP FUNCTION IF EXISTS public.recibir_informe_nexus(INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, DATE, TEXT, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.recibir_informe_nexus(
    p_dni_alumno INTEGER,
    p_categoria_nombre TEXT,
    p_tipo_falta TEXT,
    p_titulo TEXT,
    p_instancia TEXT,
    p_resumen TEXT,
    p_estado TEXT DEFAULT 'pendiente',
    p_descargo TEXT DEFAULT NULL,
    p_numero INTEGER DEFAULT NULL,
    p_motivo_rechazo TEXT DEFAULT NULL,
    p_fecha_reunion DATE DEFAULT NULL,
    p_observaciones TEXT DEFAULT NULL,
    p_fecha_creacion TIMESTAMPTZ DEFAULT NULL,
    p_fecha_revision TIMESTAMPTZ DEFAULT NULL,
    p_api_secret TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_alumno_id UUID;
    v_categoria_id UUID;
    v_informe_id UUID;
    v_expected_secret TEXT := 'NEXUS_GIE_INTEGRATION_KEY_SECURE_2026';
BEGIN
    -- Validar autenticación por clave secreta de servicio o usuario regente
    IF (p_api_secret IS NULL OR p_api_secret != v_expected_secret) AND NOT public.es_regente_db() THEN
        RAISE EXCEPTION 'Acceso denegado: Clave de integración Nexus inválida o ausente';
    END IF;

    -- Buscar alumno por DNI
    SELECT id INTO v_alumno_id FROM public.alumnos WHERE dni = p_dni_alumno LIMIT 1;
    IF v_alumno_id IS NULL THEN
        RAISE EXCEPTION 'Alumno con DNI % no encontrado en GIE', p_dni_alumno;
    END IF;
    
    -- Buscar categoría por nombre
    SELECT id INTO v_categoria_id FROM public.categorias WHERE nombre = p_categoria_nombre LIMIT 1;
    
    -- Upsert por número oficial
    IF p_numero IS NOT NULL THEN
        UPDATE public.informes SET
            alumno_id = v_alumno_id,
            categoria_id = v_categoria_id,
            tipo_falta = p_tipo_falta,
            titulo = p_titulo,
            instancia = p_instancia,
            resumen = p_resumen,
            estado = p_estado,
            descargo = p_descargo,
            motivo_rechazo = p_motivo_rechazo,
            fecha_reunion = p_fecha_reunion,
            observaciones = p_observaciones,
            fecha_creacion = COALESCE(p_fecha_creacion, fecha_creacion, NOW()),
            fecha_revision = p_fecha_revision,
            nexus_synced_at = NOW()
        WHERE numero = p_numero
        RETURNING id INTO v_informe_id;
    END IF;
    
    -- Si no existía, insertar nuevo informe
    IF v_informe_id IS NULL THEN
        INSERT INTO public.informes (
            alumno_id, categoria_id, tipo_falta, titulo, instancia,
            resumen, estado, descargo, numero, motivo_rechazo,
            fecha_reunion, observaciones, fecha_creacion, fecha_revision
        ) VALUES (
            v_alumno_id, v_categoria_id, p_tipo_falta, p_titulo, p_instancia,
            p_resumen, p_estado, p_descargo, p_numero, p_motivo_rechazo,
            p_fecha_reunion, p_observaciones, COALESCE(p_fecha_creacion, NOW()), p_fecha_revision
        )
        RETURNING id INTO v_informe_id;
    END IF;
    
    RETURN v_informe_id;
END;
$$;

-- Revocar acceso a anónimos
REVOKE ALL ON FUNCTION public.recibir_informe_nexus(INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, DATE, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.recibir_informe_nexus(INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, DATE, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;

COMMIT;
