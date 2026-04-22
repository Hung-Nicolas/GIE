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
    rol TEXT NOT NULL CHECK (rol IN ('regente', 'docente', 'preceptor')),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. TABLA INFORMES
CREATE TABLE IF NOT EXISTS public.informes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alumno_id UUID REFERENCES public.alumnos(id) NOT NULL,
    tipo_falta TEXT NOT NULL,
    titulo TEXT NOT NULL,
    instancia TEXT NOT NULL CHECK (instancia IN ('leve', 'grave', 'muy_grave')),
    resumen TEXT NOT NULL,
    descargo TEXT,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    creado_por UUID REFERENCES public.perfiles(id),
    revisado_por UUID REFERENCES public.perfiles(id),
    fecha_creacion TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    fecha_revision TIMESTAMPTZ,
    motivo_rechazo TEXT
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.informes ENABLE ROW LEVEL SECURITY;

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
        public.perfil_rol() = 'regente'
        OR creado_por = auth.uid()
        OR auth.uid() IS NULL  -- Permitir lectura anónima para demo
    );

DROP POLICY IF EXISTS "informes_insert" ON public.informes;
CREATE POLICY "informes_insert"
    ON public.informes FOR INSERT
    TO authenticated
    WITH CHECK (creado_por = auth.uid());

DROP POLICY IF EXISTS "informes_update" ON public.informes;
CREATE POLICY "informes_update"
    ON public.informes FOR UPDATE
    TO authenticated
    USING (
        public.perfil_rol() = 'regente'
        OR (creado_por = auth.uid() AND estado = 'pendiente')
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
    );
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

-- Ampliar instancia para incluir 'otro'
ALTER TABLE public.informes DROP CONSTRAINT IF EXISTS informes_instancia_check;
ALTER TABLE public.informes ADD CONSTRAINT informes_instancia_check CHECK (instancia IN ('leve', 'grave', 'muy_grave', 'otro'));

-- Agregar columna observaciones
ALTER TABLE public.informes ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- ============================================================
-- DATOS DE DEMOSTRACIÓN (opcional - ejecutar después del deploy)
-- ============================================================

-- Desactivar RLS momentáneamente para insertar datos demo (solo en desarrollo)
-- ALTER TABLE public.alumnos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.perfiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.informes DISABLE ROW LEVEL SECURITY;

-- Insertar alumnos demo
INSERT INTO public.alumnos (nombre, apellido, curso, division) VALUES
('Lucas', 'Alvarez', '1°', 'A'),
('Sofía', 'Benítez', '1°', 'A'),
('Mateo', 'Castro', '1°', 'B'),
('Valentina', 'Díaz', '2°', 'A'),
('Thiago', 'Espósito', '2°', 'A'),
('Camila', 'Fernández', '2°', 'B'),
('Benjamín', 'García', '3°', 'A'),
('Isabella', 'Hernández', '3°', 'A'),
('Santiago', 'Ibáñez', '3°', 'B'),
('Martina', 'Jiménez', '4°', 'A'),
('Emiliano', 'Klein', '4°', 'A'),
('Julieta', 'Luna', '4°', 'B'),
('Máximo', 'Moreno', '5°', 'A'),
('Victoria', 'Navarro', '5°', 'A'),
('Bruno', 'Ortiz', '5°', 'B'),
('Catalina', 'Pérez', '6°', 'A'),
('Tomás', 'Quinteros', '6°', 'A'),
('Emma', 'Ramírez', '6°', 'B'),
('Facundo', 'Silva', '7°', 'A'),
('Agustina', 'Torres', '7°', 'A')
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
