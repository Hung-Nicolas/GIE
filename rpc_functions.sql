-- ============================================================
-- Funciones RPC para GIE (ejecutar en SQL Editor → "Run without RLS")
-- ============================================================

-- 1. Función para que el regente cambie la contraseña de cualquier usuario
-- NOTA: Usamos replace('$2b$','$2a$') porque Supabase/GoTrue solo acepta hashes $2a$
DROP FUNCTION IF EXISTS public.actualizar_password_usuario(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.actualizar_password_usuario(user_id UUID, new_password TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_rol TEXT;
BEGIN
    -- Verificar que el usuario llamante sea regente
    SELECT rol INTO caller_rol FROM public.perfiles WHERE id = auth.uid();
    IF caller_rol IS NULL OR caller_rol != 'regente' THEN
        RAISE EXCEPTION 'Solo el regente puede cambiar contraseñas';
    END IF;

    -- Actualizar la contraseña en auth.users (forzar formato $2a$)
    UPDATE auth.users 
    SET encrypted_password = replace(crypt(new_password, gen_salt('bf')), '$2b$', '$2a$') 
    WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.actualizar_password_usuario(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_password_usuario(UUID, TEXT) TO anon;

-- 2. Función para listar usuarios completos (auth.users + perfiles)
DROP FUNCTION IF EXISTS public.listar_usuarios_completos();
CREATE OR REPLACE FUNCTION public.listar_usuarios_completos()
RETURNS TABLE (
    id UUID,
    email TEXT,
    nombre TEXT,
    apellido TEXT,
    rol TEXT,
    activo BOOLEAN,
    creado_en TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email::TEXT,
        p.nombre,
        p.apellido,
        p.rol,
        p.activo,
        u.created_at
    FROM auth.users u
    LEFT JOIN public.perfiles p ON u.id = p.id
    ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.listar_usuarios_completos() TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_usuarios_completos() TO anon;

-- 3. Función para sincronizar perfil (upsert manual)
DROP FUNCTION IF EXISTS public.sincronizar_perfil(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN);
CREATE OR REPLACE FUNCTION public.sincronizar_perfil(
    p_id UUID,
    p_email TEXT DEFAULT NULL,
    p_nombre TEXT DEFAULT NULL,
    p_apellido TEXT DEFAULT NULL,
    p_rol TEXT DEFAULT NULL,
    p_activo BOOLEAN DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.perfiles (id, nombre, apellido, rol, activo)
    VALUES (p_id, COALESCE(p_nombre, ''), COALESCE(p_apellido, ''), COALESCE(p_rol, 'docente'), COALESCE(p_activo, true))
    ON CONFLICT (id) DO UPDATE SET
        nombre = COALESCE(EXCLUDED.nombre, public.perfiles.nombre),
        apellido = COALESCE(EXCLUDED.apellido, public.perfiles.apellido),
        rol = COALESCE(EXCLUDED.rol, public.perfiles.rol),
        activo = COALESCE(EXCLUDED.activo, public.perfiles.activo);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sincronizar_perfil(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sincronizar_perfil(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO anon;

-- 4. Función para eliminar usuario completo (auth.users + perfiles por CASCADE)
DROP FUNCTION IF EXISTS public.eliminar_usuario_completo(UUID);
CREATE OR REPLACE FUNCTION public.eliminar_usuario_completo(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_rol TEXT;
    target_rol TEXT;
BEGIN
    -- Verificar que el llamante sea regente
    SELECT rol INTO caller_rol FROM public.perfiles WHERE id = auth.uid();
    IF caller_rol IS NULL OR caller_rol != 'regente' THEN
        RAISE EXCEPTION 'Solo el regente puede eliminar usuarios';
    END IF;

    -- Verificar que no se esté eliminando a otro regente
    SELECT rol INTO target_rol FROM public.perfiles WHERE id = user_id;
    IF target_rol = 'regente' THEN
        RAISE EXCEPTION 'No se puede eliminar a otro regente';
    END IF;

    -- Eliminar de auth.users (perfiles se borra por CASCADE)
    DELETE FROM auth.users WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eliminar_usuario_completo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.eliminar_usuario_completo(UUID) TO anon;
