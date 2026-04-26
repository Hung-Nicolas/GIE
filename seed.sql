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

-- 1. ALUMNOS (40 estudiantes, grados 1° a 6°, divisiones 1-3, turnos variados)
INSERT INTO public.alumnos (id, nombre, apellido, curso, division, turno) VALUES
('a1111111-1111-1111-1111-111111111111', 'Lucas',       'Alvarez',     '1°', '1', 'Mañana'),
('a2222222-2222-2222-2222-222222222222', 'Sofía',       'Benítez',     '1°', '1', 'Mañana'),
('a3333333-3333-3333-3333-333333333333', 'Mateo',       'Castro',      '1°', '2', 'Mañana'),
('a4444444-4444-4444-4444-444444444444', 'Valentina',   'Díaz',        '1°', '2', 'Mañana'),
('a5555555-5555-5555-5555-555555555555', 'Thiago',      'Espósito',    '1°', '3', 'Tarde'),
('a6666666-6666-6666-6666-666666666666', 'Camila',      'Fernández',   '1°', '3', 'Tarde'),
('a7777777-7777-7777-7777-777777777777', 'Benjamín',    'García',      '2°', '1', 'Tarde'),
('a8888888-8888-8888-8888-888888888888', 'Isabella',    'Hernández',   '2°', '1', 'Tarde'),
('a9999999-9999-9999-9999-999999999999', 'Santiago',    'Ibáñez',      '2°', '2', 'Tarde'),
('a1010101-0101-0101-0101-010101010101', 'Martina',     'Jiménez',     '2°', '2', 'Noche'),
('a1111112-1111-1111-1111-111111111112', 'Emiliano',    'Klein',       '2°', '3', 'Noche'),
('a1212121-2121-2121-2121-212121212121', 'Julieta',     'Luna',        '2°', '3', 'Noche'),
('a1313131-3131-3131-3131-313131313131', 'Máximo',      'Moreno',      '3°', '1', 'Noche'),
('a1414141-4141-4141-4141-414141414141', 'Victoria',    'Navarro',     '3°', '1', 'Mañana'),
('a1515151-5151-5151-5151-515151515151', 'Bruno',       'Ortiz',       '3°', '2', 'Mañana'),
('a1616161-6161-6161-6161-616161616161', 'Catalina',    'Pérez',       '3°', '2', 'Mañana'),
('a1717171-7171-7171-7171-717171717171', 'Tomás',       'Quinteros',   '3°', '3', 'Tarde'),
('a1818181-8181-8181-8181-818181818181', 'Emma',        'Ramírez',     '3°', '3', 'Tarde'),
('a1919191-9191-9191-9191-919191919191', 'Facundo',     'Silva',       '4°', '1', 'Tarde'),
('a2020202-0202-0202-0202-020202020202', 'Agustina',    'Torres',      '4°', '1', 'Noche'),
('a2121212-1212-1212-1212-121212121212', 'Joaquín',     'Vargas',      '4°', '2', 'Noche'),
('a2222223-2223-2223-2223-222322232223', 'Morena',      'Wainstein',   '4°', '2', 'Noche'),
('a2323232-3232-3232-3232-323232323232', 'Bautista',    'Yáñez',       '4°', '3', 'Mañana'),
('a2424242-4242-4242-4242-424242424242', 'Milagros',    'Zabala',      '4°', '3', 'Mañana'),
('a2525252-5252-5252-5252-525252525252', 'Dante',       'Acosta',      '5°', '1', 'Mañana'),
('a2626262-6262-6262-6262-626262626262', 'Renata',      'Bravo',       '5°', '1', 'Mañana'),
('a2727272-7272-7272-7272-727272727272', 'León',        'Cabrera',     '5°', '2', 'Tarde'),
('a2828282-8282-8282-8282-828282828282', 'Antonella',   'Domínguez',   '5°', '2', 'Tarde'),
('a2929292-9292-9292-9292-929292929292', 'Francisco',   'Escobar',     '5°', '3', 'Noche'),
('a3030303-0303-0303-0303-030303030303', 'Guadalupe',   'Flores',      '5°', '3', 'Noche'),
('a3131313-1313-1313-1313-131313131313', 'Ignacio',     'Guzmán',      '6°', '1', 'Noche'),
('a3232323-2323-2323-2323-232323232323', 'Aitana',      'Herrera',     '6°', '1', 'Noche'),
('a3333334-3334-3334-3334-333433343334', 'Valentino',   'Ibarra',      '6°', '2', 'Mañana'),
('a3434343-4343-4343-4343-434343434343', 'Cecilia',     'Juárez',      '6°', '2', 'Mañana'),
('a3535353-5353-5353-5353-535353535353', 'Sebastián',   'Kovacs',      '6°', '3', 'Tarde'),
('a3636363-6363-6363-6363-636363636363', 'Florencia',   'Lagos',       '6°', '3', 'Tarde'),
('a3737373-7373-7373-7373-737373737373', 'Matías',      'Molina',      '6°', '1', 'Mañana'),
('a3838383-8383-8383-8383-838383838383', 'Rocío',       'Nuñez',       '6°', '2', 'Tarde'),
('a3939393-9393-9393-9393-939393939393', 'Nicolás',     'Ortega',      '5°', '1', 'Noche'),
('a4040404-0404-0404-0404-040404040404', 'c5555555-5555-5555-5555-555555555555', 'Paula',       'Peralta',     '4°', '1', 'Mañana');


-- 1b. CATEGORÍAS
INSERT INTO public.categorias (id, nombre, color, activo) VALUES
('c1111111-1111-1111-1111-111111111111', 'Conducta', '#ef4444', TRUE),
('c2222222-2222-2222-2222-222222222222', 'Disciplina', '#f97316', TRUE),
('c3333333-3333-3333-3333-333333333333', 'Asistencia', '#3b82f6', TRUE),
('c4444444-4444-4444-4444-444444444444', 'Académica', '#10b981', TRUE),
('c5555555-5555-5555-5555-555555555555', 'c5555555-5555-5555-5555-555555555555', 'Otros', '#94a3b8', TRUE);

-- 2. INFORMES (~60 informes variados entre múltiples alumnos)
-- Usamos NULL en creado_por/revisado_por porque los UUIDs de usuarios no existen aún.

INSERT INTO public.informes (alumno_id, categoria_id, tipo_falta, titulo, instancia, resumen, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo, observaciones, fecha_reunion) VALUES

-- === BRUNO ORTIZ (3°) - historial extenso ===
('a1515151-5151-5151-5151-515151515151', 'Otra',       'Interrupción reiterada de clase',           'leve',      'El alumno interrumpió la clase en múltiples ocasiones pese a las advertencias del docente.', 'aprobado', NULL, NULL, '2026-04-12 09:00:00+00', '2026-04-13 11:00:00+00', NULL, 'Se contactó a los padres por teléfono.', '2026-04-30'),
('a1515151-5151-5151-5151-515151515151', 'Otra',       'Interrupción reiterada de clase',           'leve',      'Reincidencia del mismo comportamiento. Se solicitó que mantenga silencio pero persistió.', 'aprobado', NULL, NULL, '2026-03-14 09:00:00+00', '2026-03-15 11:00:00+00', NULL, 'Reincidencia. Se programó entrevista.', NULL),
('a1515151-5151-5151-5151-515151515151', 'Otra',       'Uso de auriculares durante clase',          'leve',      'El alumno utilizaba auriculares durante la explicación del docente, ignorando las advertencias.', 'aprobado', NULL, NULL, '2026-03-10 10:00:00+00', '2026-03-11 09:00:00+00', NULL, 'Primera vez que ocurre.', NULL),
('a1515151-5151-5151-5151-515151515151', 'Conducta',   'Discusión verbal con compañero',            'grave',     'Discusión verbal elevada con un compañero que interrumpió las clases aledañas.', 'aprobado', NULL, NULL, '2026-03-20 09:15:00+00', '2026-03-21 10:00:00+00', NULL, 'Ambos alumnos fueron llamados a coordinación.', NULL),
('a1515151-5151-5151-5151-515151515151', 'Conducta',   'Discusión verbal con compañero',            'grave',     'Segunda discusión en menos de un mes con el mismo compañero.', 'aprobado', NULL, NULL, '2026-04-08 13:30:00+00', '2026-04-10 09:00:00+00', NULL, 'Reincidencia del mismo comportamiento.', '2026-05-05'),
('a1515151-5151-5151-5151-515151515151', 'Disciplina', 'Encendido de fuego en patio',               'muy_grave', 'El alumno encendió una hoja de papel en el patio durante el recreo, poniendo en riesgo la seguridad.', 'aprobado', NULL, NULL, '2026-04-14 12:30:00+00', '2026-04-15 10:00:00+00', NULL, 'Se aplicó sanción de suspensión de 2 días.', NULL),
('a1515151-5151-5151-5151-515151515151', 'Disciplina', 'Uso de auriculares durante clase',          'leve',      'Utilizaba auriculares durante la explicación del docente, ignorando las advertencias.', 'pendiente', NULL, NULL, '2026-04-23 10:00:00+00', NULL, NULL, NULL, NULL),
('a1515151-5151-5151-5151-515151515151', 'Conducta',   'Falta de respeto hacia compañero',          'grave',     'Utilizó lenguaje inapropiado hacia un compañero durante el recreo.', 'pendiente', NULL, NULL, '2026-04-20 12:00:00+00', NULL, NULL, NULL, NULL),
('a1515151-5151-5151-5151-515151515151', 'Conducta',   'Golpeó la puerta al salir del aula',        'leve',      'El alumno golpeó la puerta con fuerza al ser enviado a coordinación.', 'aprobado', NULL, NULL, '2026-04-12 14:30:00+00', '2026-04-13 10:00:00+00', NULL, 'Segundo informe leve del mismo día.', NULL),

-- === CATALINA PÉREZ (3°) ===
('a1616161-6161-6161-6161-616161616161', 'Disciplina', 'Fuga del aula sin permiso',                 'grave',     'El alumno abandonó el aula durante la clase sin solicitar permiso al docente.', 'aprobado', NULL, NULL, '2026-04-05 15:00:00+00', '2026-04-06 08:30:00+00', NULL, 'Volvió a los 15 minutos.', '2026-04-28'),
('a1616161-6161-6161-6161-616161616161', 'Asistencia', 'Ausencia injustificada de 2 días',          'leve',      'Faltó dos días consecutivos sin presentar justificación.', 'pendiente', NULL, NULL, '2026-04-18 09:00:00+00', NULL, NULL, NULL, NULL),
('a1616161-6161-6161-6161-616161616161', 'Conducta',   'Lenguaje inapropiado hacia preceptor',      'grave',     'Utilizó palabras ofensivas hacia el preceptor al ser llamada la atención.', 'aprobado', NULL, NULL, '2026-03-28 11:00:00+00', '2026-03-29 09:00:00+00', NULL, 'Se citó a los padres.', '2026-04-15'),

-- === EMMA RAMÍREZ (3°) ===
('a1818181-8181-8181-8181-818181818181', 'Asistencia', 'Retiro anticipado sin autorización',        'leve',      'El alumno abandonó el establecimiento antes del horario sin la autorización correspondiente.', 'aprobado', NULL, NULL, '2026-04-16 11:00:00+00', '2026-04-18 09:00:00+00', NULL, 'Justificó posteriormente con nota médica.', NULL),
('a1818181-8181-8181-8181-818181818181', 'Otra',       'Olvido de materiales reiterado',            'leve',      'Olvidó los materiales necesarios para la clase de educación física por tercera vez.', 'pendiente', NULL, NULL, '2026-04-21 07:50:00+00', NULL, NULL, NULL, NULL),

-- === BENJAMÍN GARCÍA (2°) ===
('a7777777-7777-7777-7777-777777777777', 'Asistencia', 'Llegadas tarde consecutivas',               'leve',      'El alumno acumula 5 llegadas tarde en el mes sin justificación.', 'aprobado', NULL, NULL, '2026-04-12 08:15:00+00', '2026-04-16 10:00:00+00', NULL, 'Padres notificados por mail.', NULL),
('a7777777-7777-7777-7777-777777777777', 'Disciplina', 'Alteración del orden en el aula',           'leve',      'Generó disturbios durante la clase de matemática.', 'pendiente', NULL, NULL, '2026-04-19 09:00:00+00', NULL, NULL, NULL, NULL),
('a7777777-7777-7777-7777-777777777777', 'Conducta',   'Discusión con compañero en patio',          'grave',     'Discusión verbal que atrajo la atención de otros cursos.', 'aprobado', NULL, NULL, '2026-03-15 12:00:00+00', '2026-03-16 10:00:00+00', NULL, 'Ambos alumnos se disculparon.', NULL),

-- === MATEO CASTRO (1°) ===
('a3333333-3333-3333-3333-333333333333', 'Otra',       'Olvido de materiales reiterado',            'leve',      'La alumna olvidó los materiales necesarios para la clase de educación física por tercera vez.', 'aprobado', NULL, NULL, '2026-04-14 07:50:00+00', '2026-04-14 12:00:00+00', NULL, 'Se le prestó material del depósito.', NULL),
('a3333333-3333-3333-3333-333333333333', 'Conducta',   'Empujón a compañero en fila',               'leve',      'Empujó a un compañero mientras esperaban en la fila del comedor.', 'pendiente', NULL, NULL, '2026-04-22 12:30:00+00', NULL, NULL, NULL, NULL),

-- === VALENTINA DÍAZ (1°) ===
('a4444444-4444-4444-4444-444444444444', 'Conducta',   'Falta de respeto hacia un compañero',       'grave',     'Durante el recreo, utilizó un lenguaje inapropiado hacia un compañero generando un incidente.', 'aprobado', NULL, NULL, '2026-04-15 11:00:00+00', '2026-04-15 14:00:00+00', NULL, 'Se medió conversación entre ambas partes.', NULL),
('a4444444-4444-4444-4444-444444444444', 'Disciplina', 'Uso de celular durante clase',              'leve',      'Fue sorprendida utilizando el celular durante la clase de historia.', 'pendiente', NULL, NULL, '2026-04-20 10:00:00+00', NULL, NULL, NULL, NULL),
('a4444444-4444-4444-4444-444444444444', 'Asistencia', 'Llegada tarde reiterada',                   'leve',      'Acumula 6 llegadas tarde en el mes.', 'aprobado', NULL, NULL, '2026-03-22 08:30:00+00', '2026-03-23 09:00:00+00', NULL, 'Notificación enviada a familia.', NULL),

-- === THIAGO ESPÓSITO (1°) ===
('a5555555-5555-5555-5555-555555555555', 'Asistencia', 'Ausencia injustificada',                    'leve',      'El alumno faltó 3 días consecutivos sin presentar justificación.', 'pendiente', NULL, NULL, '2026-04-17 09:00:00+00', NULL, NULL, NULL, NULL),
('a5555555-5555-5555-5555-555555555555', 'Conducta',   'Golpeó la puerta del aula',                 'leve',      'Golpeó la puerta con fuerza al salir del aula.', 'aprobado', NULL, NULL, '2026-03-10 14:00:00+00', '2026-03-11 09:00:00+00', NULL, 'Se habló con el alumno.', NULL),

-- === MARTINA JIMÉNEZ (2°) ===
('a1010101-0101-0101-0101-010101010101', 'Académica',  'Plagio en trabajo práctico',                'grave',     'Se detectó que el trabajo práctico presentado fue copiado de internet sin citar fuentes.', 'rechazado', NULL, NULL, '2026-04-08 13:45:00+00', '2026-04-09 09:00:00+00', 'Falta adjuntar las fuentes consultadas para reconsiderar.', NULL, NULL),
('a1010101-0101-0101-0101-010101010101', 'Otra',       'No trajo autorización de salida',           'leve',      'Salió del establecimiento sin la autorización firmada.', 'pendiente', NULL, NULL, '2026-04-23 15:00:00+00', NULL, NULL, NULL, NULL),

-- === VICTORIA NAVARRO (3°) ===
('a1414141-4141-4141-4141-414141414141', 'Académica',  'Fraude en trabajo grupal',                  'muy_grave', 'Se detectó que la alumna no participó en el trabajo grupal pero figuraba como autora.', 'rechazado', NULL, NULL, '2026-04-11 10:00:00+00', '2026-04-13 16:00:00+00', 'Falta documentación de la participación individual.', NULL, NULL),
('a1414141-4141-4141-4141-414141414141', 'Conducta',   'Falta de respeto hacia docente',            'grave',     'Respondió de manera irrespetuosa al docente cuando se le llamó la atención.', 'aprobado', NULL, NULL, '2026-03-18 10:00:00+00', '2026-03-19 09:30:00+00', NULL, 'Se programó entrevista.', '2026-04-05'),

-- === JULIETA LUNA (2°) ===
('a1212121-2121-2121-2121-212121212121', 'Disciplina', 'Copia en examen escrito',                   'muy_grave', 'Se detectó que el alumno copió respuestas de otro estudiante durante un examen escrito de matemática.', 'rechazado', NULL, NULL, '2026-04-12 11:00:00+00', '2026-04-14 16:00:00+00', 'Se requiere presentar pruebas adicionales. El informe original carece de evidencia fotográfica.', NULL, NULL),
('a1212121-2121-2121-2121-212121212121', 'Otra',       'No presentó justificativo médico',          'leve',      'Faltó dos días y no presentó el justificativo médico.', 'aprobado', NULL, NULL, '2026-03-25 09:00:00+00', '2026-03-26 10:00:00+00', NULL, 'Se le dio plazo de 48 horas.', NULL),

-- === SANTIAGO IBÁÑEZ (3°) ===
('a9999999-9999-9999-9999-999999999999', 'Otra',       'Solicitud de entrevista con psicopedagoga', 'leve',      'La alumna presenta dificultades de atención sostenida que afectan su rendimiento.', 'aprobado', NULL, NULL, '2026-04-10 09:00:00+00', '2026-04-11 10:00:00+00', NULL, 'Se deriva al equipo de orientación escolar.', '2026-05-10'),
('a9999999-9999-9999-9999-999999999999', 'Conducta',   'Rehuso seguir instrucciones',               'leve',      'Se negó a realizar la actividad propuesta por el docente.', 'pendiente', NULL, NULL, '2026-04-21 09:00:00+00', NULL, NULL, NULL, NULL),

-- === SOFÍA BENÍTEZ (1°) ===
('a2222222-2222-2222-2222-222222222222', 'Otra',       'Primera llamada de atención formal',        'grave',     'La alumna acumula 3 informes leves en el mes. Se realiza primera llamada de atención formal.', 'aprobado', NULL, NULL, '2026-04-20 11:00:00+00', '2026-04-21 09:00:00+00', NULL, 'Reunión programada con orientación.', '2026-05-02'),
('a2222222-2222-2222-2222-222222222222', 'Disciplina', 'Dibujos en los bancos',                     'leve',      'Realizó dibujos con marcador indeleble en el banco del aula.', 'aprobado', NULL, NULL, '2026-03-12 10:00:00+00', '2026-03-13 09:00:00+00', NULL, 'Debe limpiar el banco en horario de almuerzo.', NULL),
('a2222222-2222-2222-2222-222222222222', 'Asistencia', 'Retiro sin autorización',                   'leve',      'Se retiró antes del horario sin la correspondiente autorización firmada.', 'pendiente', NULL, NULL, '2026-04-19 14:00:00+00', NULL, NULL, NULL, NULL),

-- === MÁXIMO MORENO (3°) ===
('a1313131-3131-3131-3131-313131313131', 'Disciplina', 'Uso de celular durante evaluación',         'muy_grave', 'El alumno fue sorprendido utilizando su teléfono celular durante una evaluación escrita.', 'pendiente', NULL, NULL, '2026-04-18 10:30:00+00', NULL, NULL, NULL, NULL),
('a1313131-3131-3131-3131-313131313131', 'Conducta',   'Agresión verbal a compañero',               'grave',     'Insultó repetidamente a un compañero frente a testigos.', 'aprobado', NULL, NULL, '2026-03-05 11:00:00+00', '2026-03-06 09:00:00+00', NULL, 'Se citó a los padres de ambos.', '2026-03-20'),

-- === TOMÁS QUINTEROS (3°) ===
('a1717171-7171-7171-7171-717171717171', 'Asistencia', 'Llegadas tarde reiteradas',                 'leve',      'Acumula 7 llegadas tarde en el mes.', 'pendiente', NULL, NULL, '2026-04-12 08:00:00+00', NULL, NULL, NULL, NULL),
('a1717171-7171-7171-7171-717171717171', 'Disciplina', 'Rompe objetos del aula',                    'grave',     'Rompió intencionalmente una regla de madera del aula.', 'aprobado', NULL, NULL, '2026-03-30 10:00:00+00', '2026-03-31 09:00:00+00', NULL, 'Debe reponer el material.', NULL),

-- === ISABELLA HERNÁNDEZ (2°) ===
('a8888888-8888-8888-8888-888888888888', 'Conducta',   'Falta de respeto hacia docente',            'grave',     'Respondió de manera irrespetuosa al docente cuando se le llamó la atención.', 'pendiente', NULL, NULL, '2026-04-22 10:00:00+00', NULL, NULL, NULL, NULL),
('a8888888-8888-8888-8888-888888888888', 'Otra',       'No trajo material de trabajo',              'leve',      'Olvidó el material por cuarta vez en el mes.', 'aprobado', NULL, NULL, '2026-04-02 09:00:00+00', '2026-04-03 10:00:00+00', NULL, 'Se notificó a la familia.', NULL),

-- === CAMILA FERNÁNDEZ (1°) ===
('a6666666-6666-6666-6666-666666666666', 'Disciplina', 'Alteración del orden en clase',             'leve',      'Generó disturbios y alteró el orden durante la clase.', 'pendiente', NULL, NULL, '2026-04-19 08:00:00+00', NULL, NULL, NULL, NULL),
('a6666666-6666-6666-6666-666666666666', 'Asistencia', 'Falta injustificada',                       'leve',      'Faltó un día sin presentar justificación.', 'aprobado', NULL, NULL, '2026-03-08 09:00:00+00', '2026-03-09 10:00:00+00', NULL, 'Justificó posteriormente.', NULL),

-- === LUCAS ÁLVAREZ (1°) ===
('a1111111-1111-1111-1111-111111111111', 'Disciplina', 'Uso de celular durante clase',              'leve',      'Utilizaba el celular durante el desarrollo de la clase.', 'pendiente', NULL, NULL, '2026-04-22 10:00:00+00', NULL, NULL, NULL, NULL),
('a1111111-1111-1111-1111-111111111111', 'Conducta',   'Empujón en el pasillo',                     'leve',      'Empujó a un compañero en el pasillo durante el cambio de hora.', 'aprobado', NULL, NULL, '2026-03-17 11:00:00+00', '2026-03-18 09:00:00+00', NULL, 'Se medió en el momento.', NULL),

-- === EMILIANO KLEIN (2°) ===
('a1111112-1111-1111-1111-111111111112', 'Académica',  'No entrega trabajos prácticos',             'leve',      'No entregó tres trabajos prácticos consecutivos.', 'aprobado', NULL, NULL, '2026-04-06 09:00:00+00', '2026-04-07 10:00:00+00', NULL, 'Se citó a los padres.', NULL),
('a1111112-1111-1111-1111-111111111112', 'Disciplina', 'Perturbación durante evaluación',           'grave',     'Hablaba y disturbaba durante una evaluación escrita.', 'pendiente', NULL, NULL, '2026-04-24 10:00:00+00', NULL, NULL, NULL, NULL),

-- === FACUNDO SILVA (4°) ===
('a1919191-9191-9191-9191-919191919191', 'Conducta',   'Discusión verbal en el patio',              'grave',     'Discusión elevada con un compañero que atrajo la atención de otros cursos.', 'aprobado', NULL, NULL, '2026-04-03 12:00:00+00', '2026-04-04 09:00:00+00', NULL, 'Ambos fueron amonestados.', NULL),
('a1919191-9191-9191-9191-919191919191', 'Asistencia', 'Llegada tarde habitual',                    'leve',      'Acumula 8 llegadas tarde en el bimestre.', 'pendiente', NULL, NULL, '2026-04-20 08:15:00+00', NULL, NULL, NULL, NULL),

-- === AGUSTINA TORRES (4°) ===
('a2020202-0202-0202-0202-020202020202', 'Otra',       'No traje material para taller',             'leve',      'Olvidó el material para el taller de arte por segunda vez.', 'aprobado', NULL, NULL, '2026-03-20 10:00:00+00', '2026-03-21 09:00:00+00', NULL, 'Se le prestó material.', NULL),
('a2020202-0202-0202-0202-020202020202', 'Disciplina', 'Uso de celular prohibido',                  'leve',      'Utilizaba el celular durante la clase de biología.', 'pendiente', NULL, NULL, '2026-04-17 11:00:00+00', NULL, NULL, NULL, NULL),

-- === JOAQUÍN VARGAS (4°) ===
('a2121212-1212-1212-1212-121212121212', 'Conducta',   'Agresión física leve',                      'grave',     'Le dio un empujón a un compañero generando una caída leve.', 'aprobado', NULL, NULL, '2026-04-01 12:30:00+00', '2026-04-02 09:00:00+00', NULL, 'Se aplicó sanción de reflexión.', '2026-04-20'),
('a2121212-1212-1212-1212-121212121212', 'Asistencia', 'Ausencia de 4 días',                        'leve',      'Faltó cuatro días sin justificación.', 'pendiente', NULL, NULL, '2026-04-15 09:00:00+00', NULL, NULL, NULL, NULL),

-- === DANTE ACOSTA (5°) ===
('a2525252-5252-5252-5252-525252525252', 'Disciplina', 'Encendió papel en el baño',                 'muy_grave', 'Encendió papel higiénico en el baño de varones generando alarma.', 'aprobado', NULL, NULL, '2026-03-08 11:00:00+00', '2026-03-09 09:00:00+00', NULL, 'Se aplicó suspensión de 3 días.', NULL),
('a2525252-5252-5252-5252-525252525252', 'Conducta',   'Robo de útil escolar',                      'grave',     'Fue sorprendido con un útil escolar que pertenecía a otro alumno.', 'pendiente', NULL, NULL, '2026-04-18 10:00:00+00', NULL, NULL, NULL, NULL),

-- === RENATA BRAVO (5°) ===
('a2626262-6262-6262-6262-626262626262', 'Académica',  'Copia en trabajo escrito',                  'grave',     'Se detectó que copió párrafos enteros de Wikipedia sin citar.', 'rechazado', NULL, NULL, '2026-04-10 13:00:00+00', '2026-04-12 16:00:00+00', 'Falta bibliografía y citas correspondientes.', NULL, NULL),
('a2626262-6262-6262-6262-626262626262', 'Otra',       'No trajo justificación de ausencia',        'leve',      'Faltó 3 días y no presentó la justificación.', 'aprobado', NULL, NULL, '2026-03-15 09:00:00+00', '2026-03-16 10:00:00+00', NULL, 'Se extendió plazo de 72 horas.', NULL),

-- === LEÓN CABRERA (5°) ===
('a2727272-7272-7272-7272-727272727272', 'Asistencia', 'Retiro anticipado habitual',                'leve',      'Se retira antes del horario sin autorización al menos una vez por semana.', 'pendiente', NULL, NULL, '2026-04-14 14:00:00+00', NULL, NULL, NULL, NULL),
('a2727272-7272-7272-7272-727272727272', 'Conducta',   'Falta de respeto a preceptor',              'grave',     'Respondió de forma irrespetuosa al preceptor en el control de entrada.', 'aprobado', NULL, NULL, '2026-03-22 08:00:00+00', '2026-03-23 09:00:00+00', NULL, 'Se citó a los padres.', '2026-04-10'),

-- === FRANCISCO ESCOBAR (5°) ===
('a2929292-9292-9292-9292-929292929292', 'Disciplina', 'Daño a computadora del aula',               'muy_grave', 'Rompió intencionalmente la pantalla de una computadora del aula.', 'aprobado', NULL, NULL, '2026-04-05 10:00:00+00', '2026-04-06 09:00:00+00', NULL, 'Debe reponer el equipo. Suspensión de 5 días.', NULL),
('a2929292-9292-9292-9292-929292929292', 'Asistencia', 'Faltas injustificadas reiteradas',          'leve',      'Acumula 10 faltas injustificadas en el bimestre.', 'pendiente', NULL, NULL, '2026-04-22 09:00:00+00', NULL, NULL, NULL, NULL),

-- === IGNACIO GUZMÁN (6°) ===
('a3131313-1313-1313-1313-131313131313', 'Conducta',   'Discusión física con compañero',            'muy_grave', 'Se involucró en una pelea física con un compañero en el patio.', 'aprobado', NULL, NULL, '2026-03-12 12:00:00+00', '2026-03-13 09:00:00+00', NULL, 'Ambos alumnos suspendidos 2 días.', NULL),
('a3131313-1313-1313-1313-131313131313', 'Académica',  'Fraude en evaluación final',                'muy_grave', 'Fue sorprendido con un apunte durante el examen final de física.', 'rechazado', NULL, NULL, '2026-04-12 09:00:00+00', '2026-04-14 16:00:00+00', 'Falta evidencia fotográfica del hecho.', NULL, NULL),

-- === AITANA HERRERA (6°) ===
('a3232323-2323-2323-2323-232323232323', 'Otra',       'No entrega proyectos',                      'leve',      'No entregó el proyecto de química en la fecha estipulada.', 'aprobado', NULL, NULL, '2026-04-08 09:00:00+00', '2026-04-09 10:00:00+00', NULL, 'Se le dio extensión de una semana.', NULL),
('a3232323-2323-2323-2323-232323232323', 'Conducta',   'Lenguaje inapropiado en clase',             'grave',     'Utilizó lenguaje soez en clase delante de sus compañeros.', 'pendiente', NULL, NULL, '2026-04-20 11:00:00+00', NULL, NULL, NULL, NULL),

-- === VALENTINO IBARRA (6°) ===
('a3333334-3334-3334-3334-333433343334', 'Asistencia', 'Llegadas tarde crónicas',                   'leve',      'Acumula 12 llegadas tarde en el bimestre.', 'aprobado', NULL, NULL, '2026-04-01 08:30:00+00', '2026-04-02 09:00:00+00', NULL, 'Se notificó a la familia por escrito.', NULL),
('a3333334-3334-3334-3334-333433343334', 'Disciplina', 'Fuga del establecimiento',                  'grave',     'Abandonó el establecimiento durante el recreo sin permiso.', 'pendiente', NULL, NULL, '2026-04-18 12:00:00+00', NULL, NULL, NULL, NULL),

-- === CECILIA JUÁREZ (6°) ===
('a3434343-4343-4343-4343-434343434343', 'Conducta',   'Amenaza verbal a compañero',                'grave',     'Amenazó a un compañero frente a testigos en el aula.', 'aprobado', NULL, NULL, '2026-03-25 10:00:00+00', '2026-03-26 09:00:00+00', NULL, 'Se citó a los padres. Entrevista programada.', '2026-04-15'),
('a3434343-4343-4343-4343-434343434343', 'Otra',       'Olvido de uniforme reiterado',              'leve',      'No trajo el uniforme completo por quinta vez en el mes.', 'pendiente', NULL, NULL, '2026-04-21 08:00:00+00', NULL, NULL, NULL, NULL),

-- === SEBASTIÁN KOVACS (6°) ===
('a3535353-5353-5353-5353-535353535353', 'Disciplina', 'Vandalismo en baño',                        'muy_grave', 'Rompió un espejo y escribió en las paredes del baño.', 'aprobado', NULL, NULL, '2026-04-07 11:00:00+00', '2026-04-08 09:00:00+00', NULL, 'Debe pagar los daños. Suspensión de 3 días.', NULL),
('a3535353-5353-5353-5353-535353535353', 'Asistencia', 'Ausencia prolongada',                       'leve',      'Faltó 5 días consecutivos sin justificación.', 'pendiente', NULL, NULL, '2026-04-16 09:00:00+00', NULL, NULL, NULL, NULL),

-- === MATÍAS MOLINA (6°) ===
('a3737373-7373-7373-7373-737373737373', 'Conducta',   'Falta de respeto a directivo',              'grave',     'Respondió de forma agresiva al director cuando fue llamado a su oficina.', 'aprobado', NULL, NULL, '2026-03-18 10:00:00+00', '2026-03-19 09:00:00+00', NULL, 'Se citó a los padres de inmediato.', '2026-04-01'),
('a3737373-7373-7373-7373-737373737373', 'Otra',       'No trajo autorización de salida',           'leve',      'Se retiró sin la autorización correspondiente.', 'pendiente', NULL, NULL, '2026-04-23 14:00:00+00', NULL, NULL, NULL, NULL),

-- === ROCÍO NUÑEZ (6°) ===
('a3838383-8383-8383-8383-838383838383', 'Académica',  'Plagio en ensayo de lengua',                'grave',     'El ensayo presentado fue copiado integramente de internet.', 'rechazado', NULL, NULL, '2026-04-09 13:00:00+00', '2026-04-11 16:00:00+00', 'Falta indicar fuentes y presentar borradores.', NULL, NULL),
('a3838383-8383-8383-8383-838383838383', 'Asistencia', 'Llegada tarde reiterada',                   'leve',      'Acumula 6 llegadas tarde en lo que va del mes.', 'aprobado', NULL, NULL, '2026-04-14 08:15:00+00', '2026-04-15 10:00:00+00', NULL, 'Se envió notificación a la familia.', NULL),

-- === NICOLÁS ORTEGA (5°) ===
('a3939393-9393-9393-9393-939393939393', 'Disciplina', 'Portación de sustancia prohibida',          'muy_grave', 'Fue sorprendido con un cigarrillo electrónico dentro del establecimiento.', 'aprobado', NULL, NULL, '2026-04-04 10:00:00+00', '2026-04-05 09:00:00+00', NULL, 'Se aplicó suspensión de 5 días. Entrevista obligatoria.', NULL),
('a3939393-9393-9393-9393-939393939393', 'Conducta',   'Intimidación a compañero',                  'grave',     'Intimidó a un compañero menor en el pasillo.', 'pendiente', NULL, NULL, '2026-04-19 12:00:00+00', NULL, NULL, NULL, NULL),

-- === PAULA PERALTA (4°) ===
('a4040404-0404-0404-0404-040404040404', 'Otra',       'No trajo material de lectura',              'leve',      'Olvidó el libro de lectura por tercera vez.', 'aprobado', NULL, NULL, '2026-03-28 09:00:00+00', '2026-03-29 10:00:00+00', NULL, 'Se le prestó ejemplar de la biblioteca.', NULL),
('a4040404-0404-0404-0404-040404040404', 'Conducta',   'Falta de respeto hacia compañera',          'grave',     'Insultó a una compañera frente al curso.', 'pendiente', NULL, NULL, '2026-04-24 11:00:00+00', NULL, NULL, NULL, NULL),

-- === BAUTISTA YÁÑEZ (4°) ===
('a2323232-3232-3232-3232-323232323232', 'Asistencia', 'Ausencia de 3 días',                        'leve',      'Faltó tres días sin presentar justificación.', 'aprobado', NULL, NULL, '2026-04-02 09:00:00+00', '2026-04-03 10:00:00+00', NULL, 'Se contactó telefónicamente a la familia.', NULL),
('a2323232-3232-3232-3232-323232323232', 'Disciplina', 'Uso de celular en horario de clase',        'leve',      'Utilizaba el celular durante la clase de historia.', 'pendiente', NULL, NULL, '2026-04-20 10:00:00+00', NULL, NULL, NULL, NULL),

-- === MILAGROS ZABALA (4°) ===
('a2424242-4242-4242-4242-424242424242', 'Conducta',   'Empujón en el comedor',                     'leve',      'Empujó a una compañera en la fila del comedor.', 'aprobado', NULL, NULL, '2026-03-14 12:00:00+00', '2026-03-15 09:00:00+00', NULL, 'Se medió conversación.', NULL),
('a2424242-4242-4242-4242-424242424242', 'Otra',       'No entrega tareas',                         'leve',      'No entregó cuatro tareas consecutivas.', 'pendiente', NULL, NULL, '2026-04-17 09:00:00+00', NULL, NULL, NULL, NULL),

-- === ANTONELLA DOMÍNGUEZ (5°) ===
('a2828282-8282-8282-8282-828282828282', 'Disciplina', 'Fuma en el baño',                           'grave',     'Fue sorprendida fumando en el baño de alumnas.', 'aprobado', NULL, NULL, '2026-04-11 10:00:00+00', '2026-04-12 09:00:00+00', NULL, 'Se citó a los padres. Suspensión de 2 días.', NULL),
('a2828282-8282-8282-8282-828282828282', 'Asistencia', 'Llegada tarde habitual',                    'leve',      'Acumula 9 llegadas tarde en el bimestre.', 'pendiente', NULL, NULL, '2026-04-23 08:00:00+00', NULL, NULL, NULL, NULL),

-- === GUADALUPE FLORES (5°) ===
('a3030303-0303-0303-0303-030303030303', 'Conducta',   'Amenaza a compañera',                       'grave',     'Amenazó a una compañera por redes sociales.', 'aprobado', NULL, NULL, '2026-03-20 09:00:00+00', '2026-03-21 10:00:00+00', NULL, 'Se derivó al equipo de orientación.', '2026-04-05'),
('a3030303-0303-0303-0303-030303030303', 'Otra',       'No traje material de plástica',             'leve',      'Olvidó el material para la clase de plástica.', 'pendiente', NULL, NULL, '2026-04-21 10:00:00+00', NULL, NULL, NULL, NULL),

-- === MORENA WAINSTEIN (4°) ===
('a2222223-2223-2223-2223-222322232223', 'Académica',  'Copia en trabajo de ciencias',              'grave',     'El trabajo grupal fue copiado de otro curso.', 'rechazado', NULL, NULL, '2026-04-13 13:00:00+00', '2026-04-15 16:00:00+00', 'Falta evidencia del proceso de trabajo.', NULL, NULL),
('a2222223-2223-2223-2223-222322232223', 'c5555555-5555-5555-5555-555555555555', 'Disciplina', 'Uso de celular durante evaluación',         'muy_grave', 'Fue sorprendida utilizando el celular durante un examen.', 'pendiente', NULL, NULL, '2026-04-22 10:00:00+00', NULL, NULL, NULL, NULL);
