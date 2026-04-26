-- ============================================================
-- MIGRACIÓN: Categorías para informes
-- Ejecutar en SQL Editor → New query → "Run without RLS"
-- ============================================================

-- 1. Crear tabla de categorías
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL DEFAULT '#3b82f6',
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Agregar columna categoria_id a informes (si no existe)
ALTER TABLE public.informes ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL;

-- 3. Habilitar RLS en categorías
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS para categorías
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

-- 5. Insertar categorías (usando UUIDs fijos para compatibilidad con seed.sql)
INSERT INTO public.categorias (id, nombre, color, activo) VALUES
('c1111111-1111-1111-1111-111111111111', 'Conducta', '#ef4444', TRUE),
('c2222222-2222-2222-2222-222222222222', 'Disciplina', '#f97316', TRUE),
('c3333333-3333-3333-3333-333333333333', 'Asistencia', '#3b82f6', TRUE),
('c4444444-4444-4444-4444-444444444444', 'Académica', '#10b981', TRUE),
('c5555555-5555-5555-5555-555555555555', 'Otros', '#94a3b8', TRUE)
ON CONFLICT (nombre) DO NOTHING;
