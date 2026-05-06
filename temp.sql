-- ============================================
-- SCRIPT TEMPORAL: Migración v1.5.3 (rol PAT + alumnos_pat)
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- 1. Actualizar CHECK de rol para incluir 'pat'
ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;
ALTER TABLE public.perfiles ADD CONSTRAINT perfiles_rol_check CHECK (rol IN ('regente', 'docente', 'preceptor', 'doe', 'pat'));

-- 2. Asegurar columna alumnos_pat en perfiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'perfiles' AND column_name = 'alumnos_pat'
    ) THEN
        ALTER TABLE public.perfiles ADD COLUMN alumnos_pat UUID[] DEFAULT '{}'::UUID[];
    END IF;
END
$$;

-- 3. Asegurar columna cursos en perfiles (si no existe de migraciones previas)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'perfiles' AND column_name = 'cursos'
    ) THEN
        ALTER TABLE public.perfiles ADD COLUMN cursos TEXT[] DEFAULT '{}'::TEXT[];
    END IF;
END
$$;

-- 4. Eliminar funciones viejas
DROP FUNCTION IF EXISTS public.listar_usuarios_completos();
DROP FUNCTION IF EXISTS public.sincronizar_perfil(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.sincronizar_perfil(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT[]);
DROP FUNCTION IF EXISTS public.sincronizar_perfil(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT[], UUID[]);

-- 5. Recrear listar_usuarios_completos con cursos y alumnos_pat
CREATE OR REPLACE FUNCTION public.listar_usuarios_completos()
RETURNS TABLE(
    id UUID,
    email TEXT,
    created_at TIMESTAMPTZ,
    nombre TEXT,
    apellido TEXT,
    rol TEXT,
    activo BOOLEAN,
    cursos TEXT[],
    alumnos_pat UUID[],
    tiene_perfil BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.email,
    u.created_at,
    COALESCE(p.nombre, 'Sin')::TEXT as nombre,
    COALESCE(p.apellido, 'Nombre')::TEXT as apellido,
    COALESCE(p.rol, 'docente')::TEXT as rol,
    COALESCE(p.activo, true)::BOOLEAN as activo,
    COALESCE(p.cursos, '{}'::TEXT[]) as cursos,
    COALESCE(p.alumnos_pat, '{}'::UUID[]) as alumnos_pat,
    (p.id IS NOT NULL)::BOOLEAN as tiene_perfil
  FROM auth.users u
  LEFT JOIN public.perfiles p ON u.id = p.id
  ORDER BY u.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.listar_usuarios_completos() TO authenticated;

-- 6. Recrear sincronizar_perfil con cursos y alumnos_pat
CREATE OR REPLACE FUNCTION public.sincronizar_perfil(
    p_id UUID,
    p_email TEXT,
    p_nombre TEXT DEFAULT 'Sin',
    p_apellido TEXT DEFAULT 'Nombre',
    p_rol TEXT DEFAULT 'docente',
    p_activo BOOLEAN DEFAULT true,
    p_cursos TEXT[] DEFAULT '{}'::TEXT[],
    p_alumnos_pat UUID[] DEFAULT '{}'::UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre, apellido, rol, activo, cursos, alumnos_pat)
    VALUES (p_id, p_email, p_nombre, p_apellido, p_rol, p_activo, p_cursos, p_alumnos_pat)
    ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        apellido = EXCLUDED.apellido,
        email = EXCLUDED.email,
        rol = EXCLUDED.rol,
        activo = EXCLUDED.activo,
        cursos = EXCLUDED.cursos,
        alumnos_pat = EXCLUDED.alumnos_pat;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sincronizar_perfil(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT[], UUID[]) TO authenticated;

-- 7. Actualizar trigger para inicializar cursos y alumnos_pat vacíos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre, apellido, rol, activo, cursos, alumnos_pat)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nombre', 'Sin'),
        COALESCE(new.raw_user_meta_data->>'apellido', 'Nombre'),
        COALESCE(new.raw_user_meta_data->>'rol', 'docente'),
        TRUE,
        '{}'::TEXT[],
        '{}'::UUID[]
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Normalizar perfiles existentes
UPDATE public.perfiles SET cursos = '{}'::TEXT[] WHERE cursos IS NULL;
UPDATE public.perfiles SET alumnos_pat = '{}'::UUID[] WHERE alumnos_pat IS NULL;
