-- ============================================================
-- Corregir UUIDs de usuarios en informes e historial
-- (cuando los usuarios fueron recreados manualmente con nuevos UUIDs)
-- Ejecutar en SQL Editor → "Run without RLS"
-- ============================================================

WITH mapeo AS (
    SELECT '11111111-1111-1111-1111-111111111111'::uuid AS viejo, u.id AS nuevo
    FROM auth.users u WHERE u.email = 'doe@gmail.com'
    UNION ALL
    SELECT '22222222-2222-2222-2222-222222222222'::uuid, u.id
    FROM auth.users u WHERE u.email = 'preceptor@gie.com'
    UNION ALL
    SELECT '33333333-3333-3333-3333-333333333333'::uuid, u.id
    FROM auth.users u WHERE u.email = 'docente@gie.com'
    UNION ALL
    SELECT '44444444-4444-4444-4444-444444444444'::uuid, u.id
    FROM auth.users u WHERE u.email = 'regente@gie.com'
    UNION ALL
    SELECT '55555555-5555-5555-5555-555555555555'::uuid, u.id
    FROM auth.users u WHERE u.email = 'admin@gie.com'
)
-- Actualizar creado_por en informes
UPDATE public.informes i
SET creado_por = m.nuevo
FROM mapeo m
WHERE i.creado_por = m.viejo;

WITH mapeo AS (
    SELECT '11111111-1111-1111-1111-111111111111'::uuid AS viejo, u.id AS nuevo
    FROM auth.users u WHERE u.email = 'doe@gmail.com'
    UNION ALL
    SELECT '22222222-2222-2222-2222-222222222222'::uuid, u.id
    FROM auth.users u WHERE u.email = 'preceptor@gie.com'
    UNION ALL
    SELECT '33333333-3333-3333-3333-333333333333'::uuid, u.id
    FROM auth.users u WHERE u.email = 'docente@gie.com'
    UNION ALL
    SELECT '44444444-4444-4444-4444-444444444444'::uuid, u.id
    FROM auth.users u WHERE u.email = 'regente@gie.com'
    UNION ALL
    SELECT '55555555-5555-5555-5555-555555555555'::uuid, u.id
    FROM auth.users u WHERE u.email = 'admin@gie.com'
)
-- Actualizar revisado_por en informes
UPDATE public.informes i
SET revisado_por = m.nuevo
FROM mapeo m
WHERE i.revisado_por = m.viejo;

WITH mapeo AS (
    SELECT '11111111-1111-1111-1111-111111111111'::uuid AS viejo, u.id AS nuevo
    FROM auth.users u WHERE u.email = 'doe@gmail.com'
    UNION ALL
    SELECT '22222222-2222-2222-2222-222222222222'::uuid, u.id
    FROM auth.users u WHERE u.email = 'preceptor@gie.com'
    UNION ALL
    SELECT '33333333-3333-3333-3333-333333333333'::uuid, u.id
    FROM auth.users u WHERE u.email = 'docente@gie.com'
    UNION ALL
    SELECT '44444444-4444-4444-4444-444444444444'::uuid, u.id
    FROM auth.users u WHERE u.email = 'regente@gie.com'
    UNION ALL
    SELECT '55555555-5555-5555-5555-555555555555'::uuid, u.id
    FROM auth.users u WHERE u.email = 'admin@gie.com'
)
-- Actualizar usuario_id en historial
UPDATE public.historial_informes h
SET usuario_id = m.nuevo
FROM mapeo m
WHERE h.usuario_id = m.viejo;
