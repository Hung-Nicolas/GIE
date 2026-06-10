-- ============================================================
-- GIE - RPC para recibir informes creados/actualizados desde Nexus
-- Ejecutar en SQL Editor de GIE
-- ============================================================

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
    p_fecha_revision TIMESTAMPTZ DEFAULT NULL
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
BEGIN
    -- Buscar alumno por DNI (sincronizado desde Nexus)
    SELECT id INTO v_alumno_id FROM public.alumnos WHERE dni = p_dni_alumno LIMIT 1;
    IF v_alumno_id IS NULL THEN
        RAISE EXCEPTION 'Alumno con DNI % no encontrado en GIE', p_dni_alumno;
    END IF;
    
    -- Buscar categoría por nombre
    SELECT id INTO v_categoria_id FROM public.categorias WHERE nombre = p_categoria_nombre LIMIT 1;
    
    -- Upsert por numero (si existe, actualiza; si no, inserta)
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
    
    -- Si no se actualizó (no existía), insertar
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

GRANT EXECUTE ON FUNCTION public.recibir_informe_nexus(INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, DATE, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO anon;
GRANT EXECUTE ON FUNCTION public.recibir_informe_nexus(INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, TEXT, DATE, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
