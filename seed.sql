-- ============================================================
-- GIE - Seed de datos demo (actualizado)
-- Ejecutar en SQL Editor → New query → "Run without RLS"
-- ============================================================
-- NOTA: Los usuarios deben crearse desde la app (signUp API).
--       Este script solo crea alumnos e informes.
-- ============================================================

-- Limpiar datos previos
TRUNCATE public.informes RESTART IDENTITY CASCADE;
TRUNCATE public.alumnos RESTART IDENTITY CASCADE;

-- 1. ALUMNOS (14 estudiantes, grados 1° a 6°)
INSERT INTO public.alumnos (id, nombre, apellido, curso, division) VALUES
('a1111111-1111-1111-1111-111111111111', 'Lucas',    'Alvarez',    '1°', '1'),
('a2222222-2222-2222-2222-222222222222', 'Sofía',    'Benítez',    '1°', '1'),
('a3333333-3333-3333-3333-333333333333', 'Mateo',    'Castro',     '1°', '2'),
('a4444444-4444-4444-4444-444444444444', 'Valentina','Díaz',       '2°', '1'),
('a5555555-5555-5555-5555-555555555555', 'Thiago',   'Espósito',   '2°', '1'),
('a6666666-6666-6666-6666-666666666666', 'Camila',   'Fernández',  '2°', '2'),
('a7777777-7777-7777-7777-777777777777', 'Benjamín', 'García',     '3°', '1'),
('a8888888-8888-8888-8888-888888888888', 'Isabella', 'Hernández',  '3°', '1'),
('a9999999-9999-9999-9999-999999999999', 'Santiago', 'Ibáñez',     '3°', '2'),
('a1010101-0101-0101-0101-010101010101', 'Martina',  'Jiménez',    '4°', '1'),
('a1111112-1111-1111-1111-111111111112', 'Emiliano', 'Klein',      '4°', '1'),
('a1212121-2121-2121-2121-212121212121', 'Julieta',  'Luna',       '4°', '2'),
('a1313131-3131-3131-3131-313131313131', 'Máximo',   'Moreno',     '5°', '1'),
('a1414141-4141-4141-4141-414141414141', 'Victoria', 'Navarro',    '5°', '1'),
('a1515151-5151-5151-5151-515151515151', 'Bruno',    'Ortiz',      '5°', '2'),
('a1616161-6161-6161-6161-616161616161', 'Catalina', 'Pérez',      '6°', '1'),
('a1717171-7171-7171-7171-717171717171', 'Tomás',    'Quinteros',  '6°', '1'),
('a1818181-8181-8181-8181-818181818181', 'Emma',     'Ramírez',    '6°', '2');

-- 2. INFORMES (variedades: pendientes, aprobados, rechazados, en reunión)
-- Usamos NULL en creado_por/revisado_por porque los UUIDs de usuarios no existen aún.
-- Al crear usuarios desde la app, podés actualizar estos campos si querés.

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo, observaciones, fecha_reunion) VALUES

-- === APROBADOS (algunos con reunión futura = "En reunión") ===
('a1515151-5151-5151-5151-515151515151', 'Otra',       'Interrupción reiterada de clase',           'leve',      'El alumno interrumpió la clase en múltiples ocasiones pese a las advertencias del docente. Se solicitó que mantenga silencio y respete los turnos de palabra, pero persistió en la conducta disruptiva.', 'aprobado', NULL, NULL, '2026-04-12 09:00:00+00', '2026-04-13 11:00:00+00', NULL, 'Se contactó a los padres por teléfono.', '2026-04-30'),
('a1515151-5151-5151-5151-515151515151', 'Otra',       'Interrupción reiterada de clase',           'leve',      'El alumno interrumpió la clase en múltiples ocasiones pese a las advertencias del docente. Se solicitó que mantenga silencio y respete los turnos de palabra, pero persistió en la conducta disruptiva.', 'aprobado', NULL, NULL, '2026-03-14 09:00:00+00', '2026-03-15 11:00:00+00', NULL, 'Reincidencia. Se programó entrevista.', NULL),
('a1515151-5151-5151-5151-515151515151', 'Otra',       'Uso de auriculares durante clase',          'leve',      'El alumno utilizaba auriculares durante la explicación del docente, ignorando las advertencias.', 'aprobado', NULL, NULL, '2026-03-10 10:00:00+00', '2026-03-11 09:00:00+00', NULL, 'Primera vez que ocurre.', NULL),
('a1515151-5151-5151-5151-515151515151', 'Conducta',   'Discusión verbal con compañero',            'grave',     'Discusión verbal elevada con un compañero que interrumpió las clases aledañas.', 'aprobado', NULL, NULL, '2026-03-20 09:15:00+00', '2026-03-21 10:00:00+00', NULL, 'Ambos alumnos fueron llamados a coordinación.', NULL),
('a1515151-5151-5151-5151-515151515151', 'Conducta',   'Discusión verbal con compañero',            'grave',     'Discusión verbal elevada con un compañero que interrumpió las clases aledañas.', 'aprobado', NULL, NULL, '2026-04-08 13:30:00+00', '2026-04-10 09:00:00+00', NULL, 'Reincidencia del mismo comportamiento.', '2026-05-05'),
('a1515151-5151-5151-5151-515151515151', 'Disciplina', 'Encendido de fuego en patio',               'muy_grave', 'El alumno encendió una hoja de papel en el patio durante el recreo, poniendo en riesgo la seguridad.', 'aprobado', NULL, NULL, '2026-04-14 12:30:00+00', '2026-04-15 10:00:00+00', NULL, 'Se aplicó sanción de suspensión de 2 días.', NULL),
('a1616161-6161-6161-6161-616161616161', 'Disciplina', 'Fuga del aula sin permiso',                 'grave',     'El alumno abandonó el aula durante la clase sin solicitar permiso al docente.', 'aprobado', NULL, NULL, '2026-04-05 15:00:00+00', '2026-04-06 08:30:00+00', NULL, 'Volvió a los 15 minutos.', '2026-04-28'),
('a1818181-8181-8181-8181-818181818181', 'Asistencia', 'Retiro anticipado sin autorización',        'leve',      'El alumno abandonó el establecimiento antes del horario sin la autorización correspondiente.', 'aprobado', NULL, NULL, '2026-04-16 11:00:00+00', '2026-04-18 09:00:00+00', NULL, 'Justificó posteriormente con nota médica.', NULL),
('a7777777-7777-7777-7777-777777777777', 'Asistencia', 'Llegadas tarde consecutivas',               'leve',      'El alumno acumula 5 llegadas tarde en el mes sin justificación.', 'aprobado', NULL, NULL, '2026-04-12 08:15:00+00', '2026-04-16 10:00:00+00', NULL, 'Padres notificados por mail.', NULL),
('a3333333-3333-3333-3333-333333333333', 'Otra',       'Olvido de materiales reiterado',            'leve',      'La alumna olvidó los materiales necesarios para la clase de educación física por tercera vez.', 'aprobado', NULL, NULL, '2026-04-14 07:50:00+00', '2026-04-14 12:00:00+00', NULL, 'Se le prestó material del depósito.', NULL),
('a4444444-4444-4444-4444-444444444444', 'Conducta',   'Falta de respeto hacia un compañero',       'grave',     'Durante el recreo, el alumno utilizó un lenguaje inapropiado hacia un compañero generando un incidente.', 'aprobado', NULL, NULL, '2026-04-15 11:00:00+00', '2026-04-15 14:00:00+00', NULL, 'Se medió conversación entre ambas partes.', NULL),

-- === PENDIENTES ===
('a1515151-5151-5151-5151-515151515151', 'Disciplina', 'Uso de auriculares durante clase',          'leve',      'Utilizaba auriculares durante la explicación del docente, ignorando las advertencias.', 'pendiente', NULL, NULL, '2026-04-23 10:00:00+00', NULL, NULL, NULL, NULL),
('a1515151-5151-5151-5151-515151515151', 'Conducta',   'Falta de respeto hacia compañero',          'grave',     'Utilizó lenguaje inapropiado hacia un compañero durante el recreo.', 'pendiente', NULL, NULL, '2026-04-20 12:00:00+00', NULL, NULL, NULL, NULL),
('a5555555-5555-5555-5555-555555555555', 'Asistencia', 'Ausencia injustificada',                    'leve',      'El alumno faltó 3 días consecutivos sin presentar justificación.', 'pendiente', NULL, NULL, '2026-04-17 09:00:00+00', NULL, NULL, NULL, NULL),
('a1313131-3131-3131-3131-313131313131', 'Disciplina', 'Uso de celular durante evaluación',         'muy_grave', 'El alumno fue sorprendido utilizando su teléfono celular durante una evaluación escrita.', 'pendiente', NULL, NULL, '2026-04-18 10:30:00+00', NULL, NULL, NULL, NULL),
('a1717171-7171-7171-7171-717171717171', 'Asistencia', 'Llegadas tarde reiteradas',                 'leve',      'Acumula 7 llegadas tarde en el mes.', 'pendiente', NULL, NULL, '2026-04-12 08:00:00+00', NULL, NULL, NULL, NULL),
('a8888888-8888-8888-8888-888888888888', 'Conducta',   'Falta de respeto hacia docente',            'grave',     'Respondió de manera irrespetuosa al docente cuando se le llamó la atención.', 'pendiente', NULL, NULL, '2026-04-22 10:00:00+00', NULL, NULL, NULL, NULL),
('a6666666-6666-6666-6666-666666666666', 'Disciplina', 'Alteración del orden en clase',             'leve',      'Generó disturbios y alteró el orden durante la clase.', 'pendiente', NULL, NULL, '2026-04-19 08:00:00+00', NULL, NULL, NULL, NULL),
('a1111111-1111-1111-1111-111111111111', 'Disciplina', 'Uso de celular durante clase',              'leve',      'Utilizaba el celular durante el desarrollo de la clase.', 'pendiente', NULL, NULL, '2026-04-22 10:00:00+00', NULL, NULL, NULL, NULL),

-- === RECHAZADOS ===
('a1010101-0101-0101-0101-010101010101', 'Académica',  'Plagio en trabajo práctico',                'grave',     'Se detectó que el trabajo práctico presentado fue copiado de internet sin citar fuentes.', 'rechazado', NULL, NULL, '2026-04-08 13:45:00+00', '2026-04-09 09:00:00+00', 'Falta adjuntar las fuentes consultadas para reconsiderar.', NULL, NULL),
('a1414141-4141-4141-4141-414141414141', 'Académica',  'Fraude en trabajo grupal',                  'muy_grave', 'Se detectó que la alumna no participó en el trabajo grupal pero figuraba como autora del mismo.', 'rechazado', NULL, NULL, '2026-04-11 10:00:00+00', '2026-04-13 16:00:00+00', 'Falta documentación de la participación individual en el trabajo grupal.', NULL, NULL),
('a1212121-2121-2121-2121-212121212121', 'Disciplina', 'Copia en examen escrito',                   'muy_grave', 'Se detectó que el alumno copió respuestas de otro estudiante durante un examen escrito de matemática.', 'rechazado', NULL, NULL, '2026-04-12 11:00:00+00', '2026-04-14 16:00:00+00', 'Se requiere presentar pruebas adicionales. El informe original carece de evidencia fotográfica o firmas de testigos.', NULL, NULL),

-- === Instancias estándar ===
('a9999999-9999-9999-9999-999999999999', 'Otra',       'Solicitud de entrevista con psicopedagoga', 'leve',      'La alumna presenta dificultades de atención sostenida que afectan su rendimiento. Se solicita evaluación interdisciplinaria.', 'aprobado', NULL, NULL, '2026-04-10 09:00:00+00', '2026-04-11 10:00:00+00', NULL, 'Se deriva al equipo de orientación escolar.', '2026-05-10'),
('a2222222-2222-2222-2222-222222222222', 'Otra',       'Primera llamada de atención formal',        'grave',     'La alumna acumula 3 informes leves en el mes. Se realiza primera llamada de atención formal a los padres.', 'aprobado', NULL, NULL, '2026-04-20 11:00:00+00', '2026-04-21 09:00:00+00', NULL, 'Reunión programada con orientación.', '2026-05-02'),

-- === DOBLE INFORME LEVE MISMO DÍA (para testing) ===
('a1515151-5151-5151-5151-515151515151', 'Conducta',   'Golpeó la puerta al salir del aula',        'leve',      'El alumno golpeó la puerta con fuerza al ser enviado a coordinación, generando una situación de riesgo menor.', 'aprobado', NULL, NULL, '2026-04-12 14:30:00+00', '2026-04-13 10:00:00+00', NULL, 'Segundo informe leve del mismo día.', NULL);
