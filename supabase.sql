-- ============================================================
-- GIE - Gestor de Informes Escolares
-- Schema para Supabase (PostgreSQL)
-- ============================================================

-- 1. TABLA ALUMNOS
-- Los alumnos ya existen en una base previa. Solo lectura desde la app.
CREATE TABLE IF NOT EXISTS public.alumnos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    curso TEXT NOT NULL,
    division TEXT NOT NULL,
    turno TEXT NOT NULL DEFAULT 'Mañana' CHECK (turno IN ('Mañana', 'Tarde', 'Noche')),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. TABLA PERFILES (usuarios del sistema)
-- Se vincula 1:1 con auth.users de Supabase
CREATE TABLE IF NOT EXISTS public.perfiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('regente', 'docente', 'preceptor', 'doe')),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. TABLA CATEGORÍAS
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA INFORMES
CREATE TABLE IF NOT EXISTS public.informes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alumno_id UUID REFERENCES public.alumnos(id) NOT NULL,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    tipo_falta TEXT NOT NULL,
    titulo TEXT NOT NULL,
    instancia TEXT NOT NULL,
    resumen TEXT NOT NULL,
    descargo TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    creado_por UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    revisado_por UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,
    fecha_creacion TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    fecha_revision TIMESTAMPTZ,
    motivo_rechazo TEXT,
    fecha_reunion DATE
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.informes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- Función helper para obtener el rol del usuario logueado
CREATE OR REPLACE FUNCTION public.perfil_rol()
RETURNS TEXT AS $$
DECLARE
    v_rol TEXT;
BEGIN
    SELECT rol INTO v_rol FROM public.perfiles WHERE id = auth.uid();
    RETURN v_rol;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------
-- ALUMNOS: todos los usuarios autenticados pueden leer
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "alumnos_select_all" ON public.alumnos;
CREATE POLICY "alumnos_select_all"
    ON public.alumnos FOR SELECT
    TO anon, authenticated
    USING (activo = TRUE);

-- -----------------------------------------------------------
-- ALUMNOS: todos los usuarios autenticados pueden insertar
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "alumnos_insert_authenticated" ON public.alumnos;
CREATE POLICY "alumnos_insert_authenticated"
    ON public.alumnos FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

-- -----------------------------------------------------------
-- PERFILES: todos pueden leer (necesario para joins),
--           cualquiera puede insertar (el trigger maneja el resto)
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "perfiles_select_all" ON public.perfiles;
CREATE POLICY "perfiles_select_all"
    ON public.perfiles FOR SELECT
    TO anon, authenticated
    USING (TRUE);

DROP POLICY IF EXISTS "perfiles_insert_trigger" ON public.perfiles;
CREATE POLICY "perfiles_insert_trigger"
    ON public.perfiles FOR INSERT
    TO authenticated
    WITH CHECK (TRUE);

DROP POLICY IF EXISTS "perfiles_update_regente" ON public.perfiles;
CREATE POLICY "perfiles_update_regente"
    ON public.perfiles FOR UPDATE
    TO authenticated
    USING (public.perfil_rol() = 'regente' OR id = auth.uid())
    WITH CHECK (public.perfil_rol() = 'regente' OR id = auth.uid());

-- -----------------------------------------------------------
-- CATEGORÍAS: todos pueden leer, solo regentes pueden modificar
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "categorias_select_all" ON public.categorias;
CREATE POLICY "categorias_select_all"
    ON public.categorias FOR SELECT
    TO anon, authenticated
    USING (activo = TRUE);

DROP POLICY IF EXISTS "categorias_insert_regente" ON public.categorias;
CREATE POLICY "categorias_insert_regente"
    ON public.categorias FOR INSERT
    TO authenticated
    WITH CHECK (public.perfil_rol() = 'regente');

DROP POLICY IF EXISTS "categorias_update_regente" ON public.categorias;
CREATE POLICY "categorias_update_regente"
    ON public.categorias FOR UPDATE
    TO authenticated
    USING (public.perfil_rol() = 'regente')
    WITH CHECK (public.perfil_rol() = 'regente');

-- -----------------------------------------------------------
-- INFORMES:
--  - Regentes ven todos
--  - Docentes/Preceptores ven solo los suyos
--  - Insertar solo propios
--  - Actualizar: regentes todo, docentes solo los propios pendientes
-- -----------------------------------------------------------
DROP POLICY IF EXISTS "informes_select" ON public.informes;
CREATE POLICY "informes_select"
    ON public.informes FOR SELECT
    TO anon, authenticated
    USING (
        public.perfil_rol() != 'doe'
        OR estado IN ('aprobado', 'rechazado')
    );

DROP POLICY IF EXISTS "informes_insert" ON public.informes;
CREATE POLICY "informes_insert"
    ON public.informes FOR INSERT
    TO authenticated
    WITH CHECK (creado_por = auth.uid() AND public.perfil_rol() != 'doe');

DROP POLICY IF EXISTS "informes_update" ON public.informes;
CREATE POLICY "informes_update"
    ON public.informes FOR UPDATE
    TO authenticated
    USING (
        public.perfil_rol() = 'regente'
        OR (creado_por = auth.uid() AND estado = 'pendiente' AND public.perfil_rol() != 'doe')
    );

-- 4. TABLA PLANTILLAS (plantillas de informes predefinidas)
CREATE TABLE IF NOT EXISTS public.plantillas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    instancia TEXT NOT NULL CHECK (instancia IN ('leve', 'grave', 'muy_grave', 'otro')),
    resumen TEXT NOT NULL,
    creado_por UUID REFERENCES public.perfiles(id),
    usos INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- RLS para plantillas
ALTER TABLE public.plantillas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plantillas_select_all" ON public.plantillas;
CREATE POLICY "plantillas_select_all" ON public.plantillas FOR SELECT USING (true);

DROP POLICY IF EXISTS "plantillas_insert_regente" ON public.plantillas;
CREATE POLICY "plantillas_insert_regente" ON public.plantillas FOR INSERT WITH CHECK (public.perfil_rol() = 'regente');

DROP POLICY IF EXISTS "plantillas_update_regente" ON public.plantillas;
CREATE POLICY "plantillas_update_regente" ON public.plantillas FOR UPDATE USING (public.perfil_rol() = 'regente');

DROP POLICY IF EXISTS "plantillas_delete_regente" ON public.plantillas;
CREATE POLICY "plantillas_delete_regente" ON public.plantillas FOR DELETE USING (public.perfil_rol() = 'regente');

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger para crear perfil automáticamente cuando un usuario
-- se registra en auth.users (vía signUp o Admin API)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre, apellido, rol, activo)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'nombre', 'Sin'),
        COALESCE(new.raw_user_meta_data->>'apellido', 'Nombre'),
        COALESCE(new.raw_user_meta_data->>'rol', 'docente'),
        TRUE
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Solo crear el trigger si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_new_user();
    END IF;
END
$$;

-- ============================================================
-- MIGRACIONES (actualizaciones de schema)
-- ============================================================

-- Restringir instancia a valores válidos (leve, grave, muy_grave)
ALTER TABLE public.informes DROP CONSTRAINT IF EXISTS informes_instancia_check;
UPDATE public.informes SET instancia = 'leve' WHERE instancia NOT IN ('leve', 'grave', 'muy_grave');
ALTER TABLE public.informes ADD CONSTRAINT informes_instancia_check CHECK (instancia IN ('leve', 'grave', 'muy_grave'));

-- Agregar columna observaciones
ALTER TABLE public.informes ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Migración: actualizar CHECK de rol para permitir 'doe'
ALTER TABLE public.perfiles DROP CONSTRAINT IF EXISTS perfiles_rol_check;
ALTER TABLE public.perfiles ADD CONSTRAINT perfiles_rol_check CHECK (rol IN ('regente', 'docente', 'preceptor', 'doe'));

-- ============================================================
-- DATOS DE DEMOSTRACIÓN (opcional - ejecutar después del deploy)
-- ============================================================

-- Desactivar RLS momentáneamente para insertar datos demo (solo en desarrollo)
-- ALTER TABLE public.alumnos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.perfiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.informes DISABLE ROW LEVEL SECURITY;

-- Insertar alumnos demo
INSERT INTO public.alumnos (nombre, apellido, curso, division) VALUES
('Lucas', 'Alvarez', '1°', '1'),
('Sofía', 'Benítez', '1°', '1'),
('Mateo', 'Castro', '1°', '2'),
('Valentina', 'Díaz', '2°', '1'),
('Thiago', 'Espósito', '2°', '1'),
('Camila', 'Fernández', '2°', '2'),
('Benjamín', 'García', '3°', '1'),
('Isabella', 'Hernández', '3°', '1'),
('Santiago', 'Ibáñez', '3°', '2'),
('Martina', 'Jiménez', '4°', '1'),
('Emiliano', 'Klein', '4°', '1'),
('Julieta', 'Luna', '4°', '2'),
('Máximo', 'Moreno', '5°', '1'),
('Victoria', 'Navarro', '5°', '1'),
('Bruno', 'Ortiz', '5°', '2'),
('Catalina', 'Pérez', '6°', '1'),
('Tomás', 'Quinteros', '6°', '1'),
('Emma', 'Ramírez', '6°', '2'),
('Facundo', 'Silva', '7°', '1'),
('Agustina', 'Torres', '7°', '1')
ON CONFLICT DO NOTHING;

-- Nota: los usuarios de demo deben crearse vía Auth de Supabase.
-- Ve al Dashboard de Supabase → Authentication → Users → Add user
-- o usa la API de admin. Los perfiles se crearán automáticamente
-- gracias al trigger handle_new_user().

-- ============================================================
-- FUNCIONES RPC (para operaciones que requieren privilegios elevados)
-- ============================================================

-- Función para que el regente cambie la contraseña de cualquier usuario
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

    -- Actualizar la contraseña en auth.users
    UPDATE auth.users SET encrypted_password = crypt(new_password, gen_salt('bf')) WHERE id = user_id;
END;
$$;

-- Dar permisos para que usuarios autenticados (y anon por el flujo demo) puedan llamarla
GRANT EXECUTE ON FUNCTION public.actualizar_password_usuario(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actualizar_password_usuario(UUID, TEXT) TO anon;

-- ============================================================
-- MIGRACIONES: actualizar constraints para permitir eliminación de usuarios
-- ============================================================

-- Permitir que al eliminar un perfil/usuario, los informes queden sin referencia
ALTER TABLE public.informes DROP CONSTRAINT IF EXISTS informes_creado_por_fkey;
ALTER TABLE public.informes ADD CONSTRAINT informes_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.perfiles(id) ON DELETE SET NULL;

ALTER TABLE public.informes DROP CONSTRAINT IF EXISTS informes_revisado_por_fkey;
ALTER TABLE public.informes ADD CONSTRAINT informes_revisado_por_fkey FOREIGN KEY (revisado_por) REFERENCES public.perfiles(id) ON DELETE SET NULL;

-- ============================================================
-- FUNCIONES RPC PARA GESTIÓN DE USUARIOS
-- ============================================================

-- Listar todos los usuarios de auth.users con sus perfiles (LEFT JOIN)
CREATE OR REPLACE FUNCTION public.listar_usuarios_completos()
RETURNS TABLE(
    id UUID,
    email TEXT,
    created_at TIMESTAMPTZ,
    nombre TEXT,
    apellido TEXT,
    rol TEXT,
    activo BOOLEAN,
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
    (p.id IS NOT NULL)::BOOLEAN as tiene_perfil
  FROM auth.users u
  LEFT JOIN public.perfiles p ON u.id = p.id
  ORDER BY u.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.listar_usuarios_completos() TO authenticated;

-- Sincronizar perfil para un usuario que no lo tiene
CREATE OR REPLACE FUNCTION public.sincronizar_perfil(
    p_id UUID,
    p_email TEXT,
    p_nombre TEXT DEFAULT 'Sin',
    p_apellido TEXT DEFAULT 'Nombre',
    p_rol TEXT DEFAULT 'docente',
    p_activo BOOLEAN DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.perfiles (id, email, nombre, apellido, rol, activo)
    VALUES (p_id, p_email, p_nombre, p_apellido, p_rol, p_activo)
    ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        apellido = EXCLUDED.apellido,
        email = EXCLUDED.email,
        rol = EXCLUDED.rol,
        activo = EXCLUDED.activo;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sincronizar_perfil(UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;

-- Eliminar usuario completamente (auth.users + perfiles via CASCADE)
CREATE OR REPLACE FUNCTION public.eliminar_usuario_completo(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_rol TEXT;
    target_rol TEXT;
    target_email TEXT;
BEGIN
    -- Verificar que el llamante sea regente
    SELECT rol INTO caller_rol FROM public.perfiles WHERE id = auth.uid();
    IF caller_rol IS NULL OR caller_rol != 'regente' THEN
        RAISE EXCEPTION 'Solo el regente puede eliminar usuarios';
    END IF;

    -- No permitir eliminar el propio usuario
    IF user_id = auth.uid() THEN
        RAISE EXCEPTION 'No podés eliminar tu propio usuario';
    END IF;

    -- No permitir eliminar al administrador principal
    SELECT email INTO target_email FROM public.perfiles WHERE id = user_id;
    IF target_email = 'admin@gie.com' THEN
        RAISE EXCEPTION 'No se puede eliminar al usuario administrador';
    END IF;

    -- Limpiar referencias en informes
    UPDATE public.informes SET creado_por = NULL WHERE creado_por = user_id;
    UPDATE public.informes SET revisado_por = NULL WHERE revisado_por = user_id;

    -- Eliminar de auth.users (perfiles se elimina por ON DELETE CASCADE)
    DELETE FROM auth.users WHERE id = user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eliminar_usuario_completo(UUID) TO authenticated;

-- ============================================================
-- FUNCIONES RPC AUXILIARES
-- ============================================================

-- Obtener espacio usado por la base de datos actual
CREATE OR REPLACE FUNCTION public.obtener_espacio_bd()
RETURNS TABLE(usado_bytes BIGINT, usado_texto TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pg_database_size(current_database())::BIGINT as usado_bytes,
    pg_size_pretty(pg_database_size(current_database()))::TEXT as usado_texto;
$$;

GRANT EXECUTE ON FUNCTION public.obtener_espacio_bd() TO authenticated;
GRANT EXECUTE ON FUNCTION public.obtener_espacio_bd() TO anon;

-- ============================================================
-- CONFIGURACIÓN RECOMENDADA EN SUPABASE DASHBOARD
-- ============================================================
--
-- 1. Authentication → Providers → Email →
--    Desactivar "Confirm email" (para que el regente cree usuarios
--    sin necesidad de verificación de email).
--
-- 2. Database → Replication → Realtime →
--    Agregar la tabla "informes" a la publicación "supabase_realtime"
--    para que los cambios se reflejen en tiempo real en la app.
--
-- 3. Storage (opcional): si más adelante querés adjuntar archivos
--    a los informes, crear un bucket "adjuntos" con políticas RLS.
--
-- ============================================================
