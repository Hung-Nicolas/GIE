-- ============================================================
-- Borrar SOLO los usuarios demo (limpia referencias primero)
-- Ejecutar en SQL Editor → "Run without RLS"
-- ============================================================

-- 1. Limpiar referencias en historial (para que no falle la FK)
UPDATE public.historial_informes 
SET usuario_id = NULL 
WHERE usuario_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);

-- 2. Limpiar referencias en informes
UPDATE public.informes 
SET creado_por = NULL, revisado_por = NULL 
WHERE creado_por IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
) OR revisado_por IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);

-- 3. Borrar usuarios demo (perfiles se borran por CASCADE)
DELETE FROM auth.users WHERE email IN (
  'doe@gmail.com',
  'preceptor@gie.com',
  'docente@gie.com',
  'regente@gie.com',
  'admin@gie.com'
);
