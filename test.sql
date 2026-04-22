-- ============================================================
-- GIE - Tests de verificación para Supabase
-- Ejecutar en SQL Editor → New query
-- ============================================================

-- 1. VERIFICAR TABLAS
SELECT 'Tablas existentes' AS test;
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('alumnos', 'perfiles', 'informes')
ORDER BY tablename;

-- 2. CONTAR REGISTROS
SELECT 'Conteo de registros' AS test;
SELECT 'alumnos' AS tabla, COUNT(*) AS total FROM public.alumnos
UNION ALL
SELECT 'perfiles' AS tabla, COUNT(*) AS total FROM public.perfiles
UNION ALL
SELECT 'informes' AS tabla, COUNT(*) AS total FROM public.informes;

-- 3. VERIFICAR USUARIOS EN AUTH
SELECT 'Usuarios en auth.users' AS test;
SELECT id, email, email_confirmed_at, raw_user_meta_data
FROM auth.users
WHERE email LIKE '%@gie.com'
ORDER BY email;

-- 4. VERIFICAR PERFILES (datos que usa la app para login)
SELECT 'Perfiles públicos' AS test;
SELECT id, email, nombre, apellido, rol, activo
FROM public.perfiles
ORDER BY email;

-- 5. VERIFICAR ALUMNOS (datos que carga la app)
SELECT 'Primeros 5 alumnos' AS test;
SELECT id, nombre, apellido, curso, division, activo
FROM public.alumnos
ORDER BY apellido
LIMIT 5;

-- 6. VERIFICAR INFORMES (datos que carga la app)
SELECT 'Primeros 5 informes' AS test;
SELECT i.id, i.titulo, i.instancia, i.estado, i.creado_por, p.email AS creador_email
FROM public.informes i
LEFT JOIN public.perfiles p ON i.creado_por = p.id
ORDER BY i.fecha_creacion DESC
LIMIT 5;

-- 7. VERIFICAR TRIGGERS
SELECT 'Triggers en auth.users' AS test;
SELECT tgname AS trigger_name, tgrelid::regclass AS tabla
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass;

-- 8. VERIFICAR POLICIES RLS
SELECT 'Policies RLS' AS test;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 9. QUERY TIPO APP - Perfil por email (la que fallaba con 406)
SELECT 'Query: perfil por email' AS test;
SELECT id, email, nombre, apellido, rol, activo
FROM public.perfiles
WHERE email = 'docente@gie.com';

-- 10. QUERY TIPO APP - Alumnos activos
SELECT 'Query: alumnos activos' AS test;
SELECT id, nombre, apellido, curso, division
FROM public.alumnos
WHERE activo = TRUE
ORDER BY apellido
LIMIT 5;

-- 11. QUERY TIPO APP - Informes con joins (la que fallaba con 400)
SELECT 'Query: informes con joins' AS test;
SELECT 
    i.id, i.titulo, i.instancia, i.estado, i.resumen,
    a.nombre AS alumno_nombre, a.apellido AS alumno_apellido, a.curso, a.division,
    c.nombre AS creador_nombre, c.apellido AS creador_apellido
FROM public.informes i
LEFT JOIN public.alumnos a ON i.alumno_id = a.id
LEFT JOIN public.perfiles c ON i.creado_por = c.id
WHERE i.creado_por = '33333333-3333-3333-3333-333333333333'
ORDER BY i.fecha_creacion DESC
LIMIT 5;
