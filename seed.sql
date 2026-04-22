-- ============================================================
-- GIE - Seed de datos para Supabase
-- Ejecutar en SQL Editor → New query
-- ============================================================

-- Limpiar datos previos para evitar duplicados
TRUNCATE public.informes RESTART IDENTITY CASCADE;
TRUNCATE public.alumnos RESTART IDENTITY CASCADE;

-- Borrar usuarios demo previos (si existen)
DELETE FROM auth.users WHERE email IN ('asd123@gie.com', 'regente@gie.com', 'docente@gie.com', 'preceptor@gie.com');

-- 1. ALUMNOS (con IDs fijos)
INSERT INTO public.alumnos (id, nombre, apellido, curso, division) VALUES
('a1111111-1111-1111-1111-111111111111', 'Lucas', 'Alvarez', '1°', 'A'),
('a2222222-2222-2222-2222-222222222222', 'Sofía', 'Benítez', '1°', 'A'),
('a3333333-3333-3333-3333-333333333333', 'Mateo', 'Castro', '1°', 'B'),
('a4444444-4444-4444-4444-444444444444', 'Valentina', 'Díaz', '2°', 'A'),
('a5555555-5555-5555-5555-555555555555', 'Thiago', 'Espósito', '2°', 'A'),
('a6666666-6666-6666-6666-666666666666', 'Camila', 'Fernández', '2°', 'B'),
('a7777777-7777-7777-7777-777777777777', 'Benjamín', 'García', '3°', 'A'),
('a8888888-8888-8888-8888-888888888888', 'Isabella', 'Hernández', '3°', 'A'),
('a9999999-9999-9999-9999-999999999999', 'Santiago', 'Ibáñez', '3°', 'B'),
('a1010101-0101-0101-0101-010101010101', 'Martina', 'Jiménez', '4°', 'A'),
('a1111112-1111-1111-1111-111111111112', 'Emiliano', 'Klein', '4°', 'A'),
('a1212121-2121-2121-2121-212121212121', 'Julieta', 'Luna', '4°', 'B'),
('a1313131-3131-3131-3131-313131313131', 'Máximo', 'Moreno', '5°', 'A'),
('a1414141-4141-4141-4141-414141414141', 'Victoria', 'Navarro', '5°', 'A'),
('a1515151-5151-5151-5151-515151515151', 'Bruno', 'Ortiz', '5°', 'B'),
('a1616161-6161-6161-6161-616161616161', 'Catalina', 'Pérez', '6°', 'A'),
('a1717171-7171-7171-7171-717171717171', 'Tomás', 'Quinteros', '6°', 'A'),
('a1818181-8181-8181-8181-818181818181', 'Emma', 'Ramírez', '6°', 'B'),
('a1919191-9191-9191-9191-919191919191', 'Facundo', 'Silva', '7°', 'A'),
('a2020202-0202-0202-0202-020202020202', 'Agustina', 'Torres', '7°', 'A');

-- 2. USUARIOS EN auth.users (con contraseñas hasheadas)
-- Nota: requiere la extensión pgcrypto (habilitada por defecto en Supabase)
-- Las contraseñas son: asd123, regente123, docente123, preceptor123

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at)
VALUES
('11111111-1111-1111-1111-111111111111', 'asd123@gie.com', crypt('asd123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Admin","apellido":"Sistema","rol":"regente"}', now()),
('22222222-2222-2222-2222-222222222222', 'regente@gie.com', crypt('regente123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Carlos","apellido":"González","rol":"regente"}', now()),
('33333333-3333-3333-3333-333333333333', 'docente@gie.com', crypt('docente123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"María","apellido":"López","rol":"docente"}', now()),
('44444444-4444-4444-4444-444444444444', 'preceptor@gie.com', crypt('preceptor123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nombre":"Juan","apellido":"Martínez","rol":"preceptor"}', now());

-- Insertar perfiles manualmente (por si el trigger no se dispara desde SQL Editor)
INSERT INTO public.perfiles (id, email, nombre, apellido, rol, activo) VALUES
('11111111-1111-1111-1111-111111111111', 'asd123@gie.com', 'Admin', 'Sistema', 'regente', true),
('22222222-2222-2222-2222-222222222222', 'regente@gie.com', 'Carlos', 'González', 'regente', true),
('33333333-3333-3333-3333-333333333333', 'docente@gie.com', 'María', 'López', 'docente', true),
('44444444-4444-4444-4444-444444444444', 'preceptor@gie.com', 'Juan', 'Martínez', 'preceptor', true)
ON CONFLICT (id) DO NOTHING;

-- 3. INFORMES
INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo) VALUES
('a1111111-1111-1111-1111-111111111111', 'Disciplina', 'Interrupción reiterada de clase', 'leve', 'El alumno interrumpió la clase en múltiples ocasiones pese a las advertencias del docente.', 'Me disculpo, no fue mi intención.', null, 'aprobado', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2026-04-10T09:30:00Z', '2026-04-11T14:20:00Z', null),
('a4444444-4444-4444-4444-444444444444', 'Conducta', 'Falta de respeto hacia un compañero', 'grave', 'Durante el recreo, el alumno utilizó un lenguaje inapropiado hacia un compañero generando un incidente.', null, null, 'pendiente', '33333333-3333-3333-3333-333333333333', null, '2026-04-15T11:00:00Z', null, null),
('a7777777-7777-7777-7777-777777777777', 'Asistencia', 'Llegadas tarde consecutivas', 'leve', 'El alumno acumula 5 llegadas tarde en el mes sin justificación.', 'Tuve problemas de transporte.', null, 'pendiente', '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', '2026-04-12T08:15:00Z', '2026-04-16T10:00:00Z', null),
('a1010101-0101-0101-0101-010101010101', 'Académica', 'Plagio en trabajo práctico', 'grave', 'Se detectó que el trabajo práctico presentado fue copiado de internet sin citar fuentes.', null, null, 'rechazado', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2026-04-08T13:45:00Z', '2026-04-09T09:00:00Z', 'Falta adjuntar las fuentes consultadas para reconsiderar.'),
('a1313131-3131-3131-3131-313131313131', 'Disciplina', 'Uso de celular durante evaluación', 'muy_grave', 'El alumno fue sorprendido utilizando su teléfono celular durante una evaluación escrita.', 'Solo lo saqué para ver la hora.', null, 'pendiente', '44444444-4444-4444-4444-444444444444', null, '2026-04-18T10:30:00Z', null, null),
('a1616161-6161-6161-6161-616161616161', 'Conducta', 'Grafitti en baño', 'grave', 'Se identificó al alumno realizando dibujos en las paredes del baño de varones.', null, null, 'aprobado', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2026-04-05T15:00:00Z', '2026-04-06T08:30:00Z', null),
('a2222222-2222-2222-2222-222222222222', 'Otra', 'Olvido de materiales reiterado', 'leve', 'La alumna olvidó los materiales necesarios para la clase de educación física por tercera vez.', 'Lo siento, se me olvidó.', null, 'aprobado', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2026-04-14T07:50:00Z', '2026-04-14T12:00:00Z', null),
('a1919191-9191-9191-9191-919191919191', 'Disciplina', 'Agresión verbal a docente', 'muy_grave', 'El alumno dirigió insultos al docente al ser llamado la atención por su conducta.', null, null, 'pendiente', '44444444-4444-4444-4444-444444444444', null, '2026-04-19T11:20:00Z', null, null),
('a5555555-5555-5555-5555-555555555555', 'Asistencia', 'Ausencia injustificada', 'leve', 'El alumno faltó 3 días consecutivos sin presentar justificación.', 'Estuve enfermo pero no fui al médico.', null, 'pendiente', '33333333-3333-3333-3333-333333333333', null, '2026-04-17T09:00:00Z', null, null),
('a8888888-8888-8888-8888-888888888888', 'Académica', 'No entrega de tarea grupal', 'leve', 'La alumna no cumplió con su parte del trabajo grupal asignado.', 'Tuve problemas personales.', null, 'pendiente', '33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '2026-04-13T14:00:00Z', '2026-04-15T10:30:00Z', null);
