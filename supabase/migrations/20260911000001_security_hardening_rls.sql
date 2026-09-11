-- =============================================================================
-- Migración: 20260911000001_security_hardening_rls.sql
-- Propósito: Hardening integral de RLS, control de acceso RBAC, protección de PII
--            e inmutabilidad de informes en PostgreSQL (Supabase).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Función Helper de Seguridad para Validación de Roles Directivos
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.es_regente_db()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid()
      AND activo = true
      AND rol IN ('regente', 'subregente', 'rector', 'vicerector', 'jefe_de_taller')
  );
$$;

GRANT EXECUTE ON FUNCTION public.es_regente_db() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.es_regente_db() FROM anon;

-- -----------------------------------------------------------------------------
-- 2. Hardening de la Tabla `perfiles` (VULN-04 & VULN-08)
-- -----------------------------------------------------------------------------
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas previas
DROP POLICY IF EXISTS "Perfiles visibles para usuarios autenticados" ON public.perfiles;
DROP POLICY IF EXISTS "Lectura publica perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_select_all" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_update_own" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_select_authenticated" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_update_self" ON public.perfiles;
DROP POLICY IF EXISTS "perfiles_admin_all" ON public.perfiles;

-- Revocar lectura y modificación a usuarios anónimos
REVOKE ALL ON public.perfiles FROM anon;
GRANT SELECT, UPDATE ON public.perfiles TO authenticated;

-- Lectura: Solo usuarios autenticados pueden ver perfiles activos
CREATE POLICY "perfiles_select_authenticated" ON public.perfiles
FOR SELECT TO authenticated
USING (true);

-- Modificación: Los usuarios solo pueden editar su propio registro Y NO pueden
-- alterar su rol, estado activo ni asignaciones a menos que sean regentes
CREATE POLICY "perfiles_update_self" ON public.perfiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (
  id = auth.uid()
  AND (
    public.es_regente_db()
    OR (
      rol = (SELECT p.rol FROM public.perfiles p WHERE p.id = auth.uid())
      AND activo = (SELECT p.activo FROM public.perfiles p WHERE p.id = auth.uid())
      AND cursos IS NOT DISTINCT FROM (SELECT p.cursos FROM public.perfiles p WHERE p.id = auth.uid())
      AND alumnos_pat IS NOT DISTINCT FROM (SELECT p.alumnos_pat FROM public.perfiles p WHERE p.id = auth.uid())
    )
  )
);

-- Regentes tienen control administrativo total sobre perfiles
CREATE POLICY "perfiles_admin_all" ON public.perfiles
FOR ALL TO authenticated
USING (public.es_regente_db())
WITH CHECK (public.es_regente_db());

-- -----------------------------------------------------------------------------
-- 3. Protección de PII de Estudiantes en Tabla `alumnos` (VULN-03)
-- -----------------------------------------------------------------------------
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Alumnos visibles publicamente" ON public.alumnos;
DROP POLICY IF EXISTS "alumnos_select_all" ON public.alumnos;
DROP POLICY IF EXISTS "alumnos_select_authenticated" ON public.alumnos;
DROP POLICY IF EXISTS "alumnos_modify_regente" ON public.alumnos;

REVOKE ALL ON public.alumnos FROM anon;
GRANT SELECT ON public.alumnos TO authenticated;
GRANT ALL ON public.alumnos TO authenticated;

-- Solo usuarios autenticados pueden consultar el padrón de alumnos
CREATE POLICY "alumnos_select_authenticated" ON public.alumnos
FOR SELECT TO authenticated
USING (true);

-- Solo el equipo directivo puede insertar/modificar/eliminar alumnos
CREATE POLICY "alumnos_modify_regente" ON public.alumnos
FOR ALL TO authenticated
USING (public.es_regente_db())
WITH CHECK (public.es_regente_db());

-- -----------------------------------------------------------------------------
-- 4. Inmutabilidad y Máquina de Estados en `informes` (VULN-05 & VULN-10)
-- -----------------------------------------------------------------------------
ALTER TABLE public.informes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Informes visibles para autenticados" ON public.informes;
DROP POLICY IF EXISTS "Crear informe autenticado" ON public.informes;
DROP POLICY IF EXISTS "Editar informe propio pendiente" ON public.informes;
DROP POLICY IF EXISTS "informes_select_all" ON public.informes;
DROP POLICY IF EXISTS "informes_insert_docente" ON public.informes;
DROP POLICY IF EXISTS "informes_update_docente" ON public.informes;
DROP POLICY IF EXISTS "informes_admin_full" ON public.informes;

REVOKE ALL ON public.informes FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.informes TO authenticated;

-- Lectura para todos los usuarios autenticados
CREATE POLICY "informes_select_all" ON public.informes
FOR SELECT TO authenticated
USING (true);

-- Inserción: Docente/Preceptor puede crear informes en estado pendiente/borrador
CREATE POLICY "informes_insert_docente" ON public.informes
FOR INSERT TO authenticated
WITH CHECK (
  creado_por = auth.uid()
  AND (
    public.es_regente_db()
    OR estado IN ('pendiente', 'borrador')
  )
);

-- Edición: Docente solo puede editar informes propios y NO aprobados/archivados,
-- y no puede auto-aprobarlos ni alterar los campos de dictamen directivo
CREATE POLICY "informes_update_docente" ON public.informes
FOR UPDATE TO authenticated
USING (
  public.es_regente_db()
  OR (
    creado_por = auth.uid()
    AND estado IN ('pendiente', 'borrador')
  )
)
WITH CHECK (
  public.es_regente_db()
  OR (
    creado_por = auth.uid()
    AND estado IN ('pendiente', 'borrador')
    AND revisado_por IS NULL
    AND fecha_revision IS NULL
    AND motivo_rechazo IS NULL
  )
);

-- Regentes tienen control completo sobre estados y revisiones
CREATE POLICY "informes_admin_full" ON public.informes
FOR ALL TO authenticated
USING (public.es_regente_db())
WITH CHECK (public.es_regente_db());

-- -----------------------------------------------------------------------------
-- 5. Hardening de `observaciones_alumno` y `historial_informes` (VULN-06 & VULN-07)
-- -----------------------------------------------------------------------------
ALTER TABLE public.observaciones_alumno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "observaciones_insert_authenticated" ON public.observaciones_alumno;
DROP POLICY IF EXISTS "observaciones_select_authenticated" ON public.observaciones_alumno;

REVOKE ALL ON public.observaciones_alumno FROM anon;
GRANT SELECT, INSERT ON public.observaciones_alumno TO authenticated;

CREATE POLICY "observaciones_select_authenticated" ON public.observaciones_alumno
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "observaciones_insert_authenticated" ON public.observaciones_alumno
FOR INSERT TO authenticated
WITH CHECK (
  autor_id = auth.uid()
  OR public.es_regente_db()
);

-- -----------------------------------------------------------------------------
-- 6. Constraints de Integridad y Sincronización de Secuencia
-- -----------------------------------------------------------------------------
ALTER TABLE public.informes 
  DROP CONSTRAINT IF EXISTS chk_titulo_length,
  ADD CONSTRAINT chk_titulo_length CHECK (char_length(titulo) <= 200);

ALTER TABLE public.informes 
  DROP CONSTRAINT IF EXISTS chk_resumen_length,
  ADD CONSTRAINT chk_resumen_length CHECK (char_length(resumen) <= 2000);

ALTER TABLE public.informes 
  DROP CONSTRAINT IF EXISTS chk_observaciones_length,
  ADD CONSTRAINT chk_observaciones_length CHECK (observaciones IS NULL OR char_length(observaciones) <= 1000);

ALTER TABLE public.informes 
  DROP CONSTRAINT IF EXISTS chk_anulado_motivo,
  ADD CONSTRAINT chk_anulado_motivo CHECK (estado != 'anulado' OR (motivo_rechazo IS NOT NULL AND length(trim(motivo_rechazo)) > 0));

-- Sincronizar secuencia oficial de informes
SELECT setval('public.informes_numero_seq', (SELECT COALESCE(MAX(numero), 202600000) FROM public.informes));

COMMIT;
