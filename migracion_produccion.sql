-- ============================================================
-- MIGRACIÓN A PRODUCCIÓN — GIE
-- Ejecutar en SQL Editor de Supabase (como postgres o sin RLS)
-- ============================================================

-- -----------------------------------------------------------
-- 1. ENDURECER RLS: tabla INFORMES
--    Docentes/Preceptores solo ven sus propios informes.
--    Regentes ven todos.
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "informes_select" ON public.informes;
CREATE POLICY "informes_select"
    ON public.informes FOR SELECT
    TO authenticated
    USING (
        public.perfil_rol() = 'regente'
        OR creado_por = auth.uid()
    );

-- -----------------------------------------------------------
-- 2. ENDURECER RLS: tabla PERFILES
--    Solo regentes ven emails y datos completos de todos.
--    Docentes/Preceptores solo ven perfiles activos (sin email).
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "perfiles_select_all" ON public.perfiles;
CREATE POLICY "perfiles_select_all"
    ON public.perfiles FOR SELECT
    TO authenticated
    USING (
        public.perfil_rol() = 'regente'
        OR activo = TRUE
    );

-- -----------------------------------------------------------
-- 3. ENDURECER RLS: tabla ALUMNOS (INSERT)
--    Solo regentes y preceptores pueden crear alumnos.
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "alumnos_insert_authenticated" ON public.alumnos;
CREATE POLICY "alumnos_insert_authenticated"
    ON public.alumnos FOR INSERT
    TO authenticated
    WITH CHECK (
        public.perfil_rol() IN ('regente', 'preceptor')
    );

-- -----------------------------------------------------------
-- 4. QUITAR PERMISOS ANON DE FUNCIONES RPC
-- -----------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.actualizar_password_usuario(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.obtener_espacio_bd() FROM anon;

-- -----------------------------------------------------------
-- 5. MODIFICAR TRIGGER: self-registro → rol 'pendiente'
--    Si alguien se registra por signUp público, queda inactivo
--    y con rol 'pendiente' hasta que un regente lo active.
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre, apellido, rol, activo)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nombre', 'Sin'),
        COALESCE(new.raw_user_meta_data->>'apellido', 'Nombre'),
        COALESCE(new.raw_user_meta_data->>'rol', 'pendiente'),
        FALSE
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------
-- 6. TABLA DE AUDITORÍA
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tabla TEXT NOT NULL,
    accion TEXT NOT NULL,
    registro_id UUID,
    usuario_id UUID REFERENCES auth.users,
    datos_previos JSONB,
    datos_nuevos JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_regente" ON public.audit_log;
CREATE POLICY "audit_select_regente"
    ON public.audit_log FOR SELECT
    TO authenticated
    USING (public.perfil_rol() = 'regente');

-- -----------------------------------------------------------
-- 7. FUNCIÓN RPC: LOGUEAR CAMBIOS EN INFORMES
--    Llamar desde el frontend después de cambiar estado.
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_informe(
    p_registro_id UUID,
    p_accion TEXT,
    p_datos_previos JSONB DEFAULT NULL,
    p_datos_nuevos JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.audit_log (tabla, accion, registro_id, usuario_id, datos_previos, datos_nuevos)
    VALUES ('informes', p_accion, p_registro_id, auth.uid(), p_datos_previos, p_datos_nuevos);
END;
$$;

GRANT EXECUTE ON FUNCTION public.audit_informe(UUID, TEXT, JSONB, JSONB) TO authenticated;

-- -----------------------------------------------------------
-- 8. INDICES ÚTILES PARA AUDITORÍA
-- -----------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_audit_usuario ON public.audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_tabla_accion ON public.audit_log(tabla, accion);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON public.audit_log(created_at DESC);

-- ============================================================
-- INSTRUCCIONES MANUALES POST-MIGRACIÓN
-- ============================================================
--
-- 1. En Supabase Dashboard → Authentication → Providers → Email:
--    - Activar "Confirm email" (obliga a verificación antes de usar).
--    - O deshabilitar sign-up público si tu plan de Supabase lo permite.
--
-- 2. En Supabase Dashboard → Project Settings → Data API:
--    - Regenerar SERVICE_ROLE_KEY (la vieja queda invalidada).
--    - Nunca compartir la nueva key.
--
-- 3. Verificar que ningún usuario con rol 'pendiente' tenga acceso:
--    SELECT id, email, rol, activo FROM public.perfiles WHERE rol = 'pendiente' OR activo = FALSE;
--
-- 4. Activar manualmente a los usuarios reales creados por el regente:
--    UPDATE public.perfiles SET activo = TRUE, rol = 'docente' WHERE email = 'docente@escuela.edu';
--
-- ============================================================
