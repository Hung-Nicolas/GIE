-- ============================================================
-- LIMPIEZA DE INFORMES DUPLICADOS
-- ============================================================
-- Por cada combinación (alumno_id, titulo, resumen),
-- conserva SOLO el informe con fecha_creacion más antigua.
-- ============================================================

-- PASO 1: Crear tabla temporal con los IDs a conservar
CREATE TEMP TABLE IF NOT EXISTS informes_keeper AS
SELECT DISTINCT ON (alumno_id, LOWER(TRIM(titulo)), LOWER(TRIM(resumen)))
    id AS keeper_id,
    alumno_id,
    LOWER(TRIM(titulo)) AS t,
    LOWER(TRIM(resumen)) AS r
FROM public.informes
ORDER BY alumno_id, LOWER(TRIM(titulo)), LOWER(TRIM(resumen)), fecha_creacion ASC;

-- PASO 2: Identificar duplicados
CREATE TEMP TABLE IF NOT EXISTS informes_dup AS
SELECT i.id AS dup_id
FROM public.informes i
LEFT JOIN informes_keeper k ON i.id = k.keeper_id
WHERE k.keeper_id IS NULL;

-- PASO 3: Eliminar duplicados
DELETE FROM public.informes
WHERE id IN (SELECT dup_id FROM informes_dup);

-- PASO 4: Limpiar temporales
DROP TABLE IF EXISTS informes_dup;
DROP TABLE IF EXISTS informes_keeper;

-- Verificación
SELECT COUNT(*) AS total_informes FROM public.informes;
