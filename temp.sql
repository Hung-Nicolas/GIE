-- ============================================
-- SCRIPT TEMPORAL: Agregar columna cursos y recrear funciones RPC
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- 1. ASEGURAR que la columna cursos exista en public.perfiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'perfiles'
          AND column_name = 'cursos'
    ) THEN
        ALTER TABLE public.perfiles ADD COLUMN cursos TEXT[] DEFAULT '{}'::TEXT[];
        RAISE NOTICE 'Columna cursos agregada a public.perfiles';
    ELSE
        RAISE NOTICE 'Columna cursos ya existe en public.perfiles';
    END IF;
END
$$;

-- Verificar que la columna exista antes de continuar
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'perfiles'
          AND column_name = 'cursos'
    ) INTO col_exists;

    IF NOT col_exists THEN
        RAISE EXCEPTION 'La columna cursos NO existe en public.perfiles. Abortando.';
    END IF;
END
$$;

-- 2. Eliminar funciones viejas (necesario porque cambió el tipo de retorno / firma)
DROP FUNCTION IF EXISTS public.listar_usuarios_completos();
DROP FUNCTION IF EXISTS public.sincronizar_perfil(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.sincronizar_perfil(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT[]);

-- 3. Recrear listar_usuarios_completos con cursos
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
    (p.id IS NOT NULL)::BOOLEAN as tiene_perfil
  FROM auth.users u
  LEFT JOIN public.perfiles p ON u.id = p.id
  ORDER BY u.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.listar_usuarios_completos() TO authenticated;

-- 4. Recrear sincronizar_perfil con cursos
CREATE OR REPLACE FUNCTION public.sincronizar_perfil(
    p_id UUID,
    p_email TEXT,
    p_nombre TEXT DEFAULT 'Sin',
    p_apellido TEXT DEFAULT 'Nombre',
    p_rol TEXT DEFAULT 'docente',
    p_activo BOOLEAN DEFAULT true,
    p_cursos TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre, apellido, rol, activo, cursos)
    VALUES (p_id, p_email, p_nombre, p_apellido, p_rol, p_activo, p_cursos)
    ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        apellido = EXCLUDED.apellido,
        email = EXCLUDED.email,
        rol = EXCLUDED.rol,
        activo = EXCLUDED.activo,
        cursos = EXCLUDED.cursos;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sincronizar_perfil(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT[]) TO authenticated;

-- 5. Actualizar trigger para inicializar cursos vacío
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre, apellido, rol, activo, cursos)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nombre', 'Sin'),
        COALESCE(new.raw_user_meta_data->>'apellido', 'Nombre'),
        COALESCE(new.raw_user_meta_data->>'rol', 'docente'),
        TRUE,
        '{}'::TEXT[]
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Actualizar perfiles existentes: poner cursos vacíos donde sea NULL
UPDATE public.perfiles SET cursos = '{}'::TEXT[] WHERE cursos IS NULL;

-- 7. Datos demo actualizados (opcional - comentar si no se usan usuarios demo)
INSERT INTO public.perfiles (id, email, nombre, apellido, rol, activo, cursos)
VALUES
  ('c87ec2e0-2cd2-4c57-8a6c-0ddae8816866', 'doe@gmail.com', 'test', 'DOE', 'doe', true, '{}'),
  ('25ccc48e-bf45-48e3-94a0-c615e9f5ceee', 'preceptor@gie.com', 'test', 'preceptor', 'preceptor', true, '{}'),
  ('e297e8e7-ecbc-4062-af24-0d7423f22109', 'docente@gie.com', 'test', 'docente', 'docente', true, ARRAY['1°2','4°4']),
  ('c0b4da58-162c-447c-8910-cfadd840c868', 'regente@gie.com', 'test', 'regente', 'regente', true, '{}'),
  ('b2a0c71b-bdd4-4b1d-a3e3-a9974fefb6c0', 'admin@gie.com', 'Sistema', 'Admin', 'regente', true, '{}')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nombre = EXCLUDED.nombre,
  apellido = EXCLUDED.apellido,
  rol = EXCLUDED.rol,
  activo = EXCLUDED.activo,
  cursos = EXCLUDED.cursos;
