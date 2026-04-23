-- ============================================================
-- LIMPIEZA DE ALUMNOS DUPLICADOS
-- ============================================================
-- Este script:
-- 1. Por cada combinación (nombre, apellido, curso, division), 
--    conserva SOLO el alumno con el created_at más antiguo
-- 2. Reasigna los informes de los alumnos duplicados al original
-- 3. Elimina los alumnos duplicados
-- 4. Agrega restricción UNIQUE para prevenir futuros duplicados
-- ============================================================

-- PASO 1: Crear tabla temporal con los IDs a conservar (el más antiguo por combinación)
CREATE TEMP TABLE IF NOT EXISTS alumnos_keeper AS
SELECT DISTINCT ON (LOWER(TRIM(nombre)), LOWER(TRIM(apellido)), curso, division)
    id AS keeper_id,
    LOWER(TRIM(nombre)) AS n,
    LOWER(TRIM(apellido)) AS a,
    curso,
    division
FROM public.alumnos
ORDER BY LOWER(TRIM(nombre)), LOWER(TRIM(apellido)), curso, division, created_at ASC;

-- PASO 2: Crear tabla temporal con los IDs duplicados (todos excepto el keeper)
CREATE TEMP TABLE IF NOT EXISTS alumnos_dup AS
SELECT a.id AS dup_id, k.keeper_id
FROM public.alumnos a
JOIN alumnos_keeper k
    ON LOWER(TRIM(a.nombre)) = k.n
    AND LOWER(TRIM(a.apellido)) = k.a
    AND a.curso = k.curso
    AND a.division = k.division
WHERE a.id != k.keeper_id;

-- PASO 3: Reasignar informes de alumnos duplicados al alumno original
UPDATE public.informes i
SET alumno_id = d.keeper_id
FROM alumnos_dup d
WHERE i.alumno_id = d.dup_id;

-- PASO 4: Eliminar alumnos duplicados
DELETE FROM public.alumnos
WHERE id IN (SELECT dup_id FROM alumnos_dup);

-- PASO 5: Limpiar tablas temporales
DROP TABLE IF EXISTS alumnos_dup;
DROP TABLE IF EXISTS alumnos_keeper;

-- PASO 6: Agregar restricción UNIQUE para prevenir futuros duplicados
-- Primero limpiar espacios en nombres/apellidos existentes
UPDATE public.alumnos
SET nombre = TRIM(nombre),
    apellido = TRIM(apellido);

-- Crear índice único case-insensitive
CREATE UNIQUE INDEX IF NOT EXISTS idx_alumnos_unico
ON public.alumnos (LOWER(nombre), LOWER(apellido), curso, division);

-- ============================================================
-- VERIFICACIÓN (opcional, ejecutar después para confirmar)
-- ============================================================
-- SELECT COUNT(*) AS total_alumnos FROM public.alumnos;
-- SELECT nombre, apellido, curso, division, COUNT(*) 
-- FROM public.alumnos 
-- GROUP BY nombre, apellido, curso, division 
-- HAVING COUNT(*) > 1;
