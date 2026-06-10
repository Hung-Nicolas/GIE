-- ============================================================
-- GIE - RPC para recibir informes creados desde Nexus
-- Ejecutar en SQL Editor de GIE
-- ============================================================

CREATE OR REPLACE FUNCTION public.recibir_informe_nexus(
    p_dni_alumno INTEGER,
    p_categoria_nombre TEXT,
    p_tipo_falta TEXT,
    p_titulo TEXT,
    p_instancia TEXT,
    p_resumen TEXT,
    p_estado TEXT DEFAULT 'pendiente'
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
    
    -- Insertar informe
    INSERT INTO public.informes (
        alumno_id, categoria_id, tipo_falta, titulo, instancia, 
        resumen, estado, fecha_creacion
    ) VALUES (
        v_alumno_id, v_categoria_id, p_tipo_falta, p_titulo, p_instancia,
        p_resumen, p_estado, NOW()
    )
    RETURNING id INTO v_informe_id;
    
    RETURN v_informe_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recibir_informe_nexus(INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.recibir_informe_nexus(INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
