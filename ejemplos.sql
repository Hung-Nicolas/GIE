-- ============================================================
-- GIE - Datos de ejemplo adicionales
-- Ejecutar en SQL Editor de Supabase después de supabase.sql
-- ============================================================

-- -----------------------------------------------------------
-- ALUMNOS ADICIONALES
-- -----------------------------------------------------------
INSERT INTO public.alumnos (nombre, apellido, curso, division) VALUES
('Julián', 'Medina', '7°', '2'),
('Florencia', 'Ríos', '1°', '1'),
('Mateo', 'Soto', '1°', '2'),
('Camila', 'Torres', '1°', '2'),
('Thiago', 'Ruiz', '2°', '1'),
('Valentina', 'Flores', '2°', '2'),
('Benjamín', 'Acosta', '2°', '2'),
('Martina', 'Castillo', '3°', '1'),
('Santiago', 'Bravo', '3°', '2'),
('Emma', 'Vega', '3°', '2'),
('Lucas', 'Herrera', '4°', '1'),
('Agustina', 'Molina', '4°', '2'),
('Facundo', 'Ortiz', '4°', '2'),
('Catalina', 'Silva', '5°', '1'),
('Tomás', 'Romero', '5°', '2'),
('Julieta', 'Rojas', '5°', '2'),
('Bruno', 'Moreno', '6°', '1'),
('Victoria', 'Paredes', '6°', '2'),
('Maximiliano', 'Luna', '7°', '1'),
('Morena', 'Campos', '7°', '2')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------
-- INFORMES ADICIONALES (varios alumnos con historial denso)
-- -----------------------------------------------------------
-- Los inserts usan subqueries para buscar IDs dinámicamente

-- ========== ALUMNO: Bruno Moreno (6°1) - 8 informes ==========
INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Disciplina', 'Uso de auriculares durante clase', 'leve', 'Utilizaba auriculares durante la explicación del docente, ignorando las advertencias.', 'No me di cuenta.', NULL, 'aprobado', p1.id, p2.id, '2026-03-05T10:00:00Z', '2026-03-06T14:30:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Bruno' AND a.apellido = 'Moreno' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Disciplina', 'Interrupción reiterada de clase', 'leve', 'Interrumpió la clase en múltiples ocasiones pese a las advertencias.', 'Me disculpo.', NULL, 'aprobado', p1.id, p2.id, '2026-03-12T09:00:00Z', '2026-03-13T11:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Bruno' AND a.apellido = 'Moreno' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Conducta', 'Discusión verbal con compañero', 'grave', 'Discusión verbal elevada con un compañero que interrumpió las clases aledañas.', NULL, NULL, 'aprobado', p1.id, p2.id, '2026-03-20T09:15:00Z', '2026-03-21T10:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Bruno' AND a.apellido = 'Moreno' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Asistencia', 'Llegadas tarde reiteradas', 'leve', 'Acumula 8 llegadas tarde en el mes sin justificación válida.', 'Me levanto tarde.', NULL, 'pendiente', p1.id, NULL, '2026-04-02T08:00:00Z', NULL, NULL
FROM public.alumnos a, public.perfiles p1
WHERE a.nombre = 'Bruno' AND a.apellido = 'Moreno' AND p1.rol = 'docente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Disciplina', 'Fuga del aula sin permiso', 'grave', 'Abandonó el aula durante la clase sin solicitar permiso al docente.', 'Tenía que ir al baño.', NULL, 'aprobado', p1.id, p2.id, '2026-04-08T13:30:00Z', '2026-04-10T09:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Bruno' AND a.apellido = 'Moreno' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Académica', 'Copia en examen escrito', 'muy_grave', 'Copió respuestas de otro estudiante durante un examen escrito de matemática.', 'No copié.', NULL, 'rechazado', p1.id, p2.id, '2026-04-12T11:00:00Z', '2026-04-14T16:00:00Z', 'Se requiere presentar pruebas adicionales.'
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Bruno' AND a.apellido = 'Moreno' AND p1.rol = 'preceptor' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Disciplina', 'Encendido de fuego en patio', 'muy_grave', 'Encendió una hoja de papel en el patio durante el recreo.', 'Era solo una hoja.', NULL, 'aprobado', p1.id, p2.id, '2026-04-14T12:30:00Z', '2026-04-15T10:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Bruno' AND a.apellido = 'Moreno' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Conducta', 'Amenazas a compañero', 'muy_grave', 'Realizó amenazas verbales hacia un compañero durante la salida del colegio.', NULL, NULL, 'pendiente', p1.id, NULL, '2026-04-23T15:00:00Z', NULL, NULL
FROM public.alumnos a, public.perfiles p1
WHERE a.nombre = 'Bruno' AND a.apellido = 'Moreno' AND p1.rol = 'preceptor'
ON CONFLICT DO NOTHING;

-- ========== ALUMNO: Victoria Paredes (6°2) - 7 informes ==========
INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Otra', 'Incumplimiento de uniforme', 'leve', 'Asistió sin uniforme reglamentario por quinta vez en el mes.', 'Se me lavó.', NULL, 'aprobado', p1.id, p2.id, '2026-03-08T07:45:00Z', '2026-03-09T09:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Victoria' AND a.apellido = 'Paredes' AND p1.rol = 'preceptor' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Asistencia', 'Llegadas tarde consecutivas', 'leve', 'Acumula 6 llegadas tarde en abril sin justificación.', 'Tuve problemas de transporte.', NULL, 'aprobado', p1.id, p2.id, '2026-03-15T08:15:00Z', '2026-03-16T10:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Victoria' AND a.apellido = 'Paredes' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Disciplina', 'Uso de celular durante evaluación', 'muy_grave', 'Sorprendida utilizando el celular durante una evaluación de ciencias.', 'Solo miré la hora.', NULL, 'aprobado', p1.id, p2.id, '2026-03-22T10:00:00Z', '2026-03-24T11:30:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Victoria' AND a.apellido = 'Paredes' AND p1.rol = 'preceptor' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Conducta', 'Falta de respeto hacia docente', 'grave', 'Respondió de manera irrespetuosa al docente cuando se le llamó la atención.', 'No fue mi intención.', NULL, 'rechazado', p1.id, p2.id, '2026-04-03T14:00:00Z', '2026-04-05T09:00:00Z', 'Falta contexto del incidente. Se solicita declaración de testigos.'
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Victoria' AND a.apellido = 'Paredes' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Disciplina', 'Alteración del orden en biblioteca', 'leve', 'Generó disturbios en la biblioteca durante hora de estudio.', 'Me pidieron que me calme.', NULL, 'pendiente', p1.id, NULL, '2026-04-10T14:00:00Z', NULL, NULL
FROM public.alumnos a, public.perfiles p1
WHERE a.nombre = 'Victoria' AND a.apellido = 'Paredes' AND p1.rol = 'docente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Asistencia', 'Retiro anticipado sin autorización', 'leve', 'Abandonó el establecimiento antes del horario sin autorización.', 'Me sentía mal.', NULL, 'aprobado', p1.id, p2.id, '2026-04-16T11:00:00Z', '2026-04-18T09:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Victoria' AND a.apellido = 'Paredes' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Asistencia', 'Llegada tarde con estado etílico', 'muy_grave', 'Llegó a clase con evidentes signos de haber consumido alcohol.', NULL, NULL, 'pendiente', p1.id, NULL, '2026-04-24T08:00:00Z', NULL, NULL
FROM public.alumnos a, public.perfiles p1
WHERE a.nombre = 'Victoria' AND a.apellido = 'Paredes' AND p1.rol = 'docente'
ON CONFLICT DO NOTHING;

-- ========== ALUMNO: Julián Medina (7°2) - 6 informes ==========
INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Disciplina', 'Uso de auriculares durante clase', 'leve', 'Utilizaba auriculares durante la explicación del docente.', 'No me di cuenta.', NULL, 'aprobado', p1.id, p2.id, '2026-03-10T10:00:00Z', '2026-03-11T09:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Julián' AND a.apellido = 'Medina' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Disciplina', 'Fuga del aula sin permiso', 'grave', 'Abandonó el aula durante la clase sin permiso.', 'Tenía que ir al baño.', NULL, 'aprobado', p1.id, p2.id, '2026-03-18T13:30:00Z', '2026-03-19T10:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Julián' AND a.apellido = 'Medina' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Conducta', 'Agresión física leve en patio', 'grave', 'Empujó a un compañero generando una caída durante el recreo.', 'Fue sin querer.', NULL, 'pendiente', p1.id, NULL, '2026-04-05T12:00:00Z', NULL, NULL
FROM public.alumnos a, public.perfiles p1
WHERE a.nombre = 'Julián' AND a.apellido = 'Medina' AND p1.rol = 'docente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Académica', 'Sustitución de evaluador en examen', 'muy_grave', 'Otra persona realizó el examen online en lugar del alumno.', 'Fui yo.', NULL, 'rechazado', p1.id, p2.id, '2026-04-13T09:00:00Z', '2026-04-16T11:00:00Z', 'La evidencia técnica no es concluyente.'
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Julián' AND a.apellido = 'Medina' AND p1.rol = 'preceptor' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Disciplina', 'Ingreso con sustancias prohibidas', 'muy_grave', 'Se encontró con bebidas alcohólicas en su mochila durante un control.', 'No son mías.', NULL, 'aprobado', p1.id, p2.id, '2026-04-17T08:00:00Z', '2026-04-19T14:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Julián' AND a.apellido = 'Medina' AND p1.rol = 'preceptor' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Asistencia', 'Ausencia injustificada prolongada', 'leve', 'Faltó 5 días consecutivos sin justificación ni responder llamados.', 'Estaba de viaje.', NULL, 'pendiente', p1.id, NULL, '2026-04-25T08:00:00Z', NULL, NULL
FROM public.alumnos a, public.perfiles p1
WHERE a.nombre = 'Julián' AND a.apellido = 'Medina' AND p1.rol = 'docente'
ON CONFLICT DO NOTHING;

-- ========== ALUMNO: Morena Campos (7°2) - 5 informes ==========
INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Conducta', 'Bullying a compañero nuevo', 'grave', 'Identificada como líder de un grupo que hostiga a un compañero nuevo.', 'Solo jugábamos.', NULL, 'aprobado', p1.id, p2.id, '2026-03-25T10:00:00Z', '2026-03-27T14:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Morena' AND a.apellido = 'Campos' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Disciplina', 'Uso de celular durante clase', 'leve', 'Utilizaba el celular durante el desarrollo de la clase.', 'Solo miré la hora.', NULL, 'aprobado', p1.id, p2.id, '2026-04-02T11:00:00Z', '2026-04-03T09:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Morena' AND a.apellido = 'Campos' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Asistencia', 'Llegadas tarde consecutivas', 'leve', 'Acumula 4 llegadas tarde en la semana.', 'Me levanto tarde.', NULL, 'pendiente', p1.id, NULL, '2026-04-09T08:00:00Z', NULL, NULL
FROM public.alumnos a, public.perfiles p1
WHERE a.nombre = 'Morena' AND a.apellido = 'Campos' AND p1.rol = 'docente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Académica', 'Entrega de trabajo ajeno', 'grave', 'Trabajo práctico descargado de internet sin modificaciones ni citas.', 'No sabía que no se podía.', NULL, 'rechazado', p1.id, p2.id, '2026-04-15T15:00:00Z', '2026-04-18T10:00:00Z', 'Falta evidencia de plagio con herramienta antiplagio.'
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Morena' AND a.apellido = 'Campos' AND p1.rol = 'preceptor' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Conducta', 'Discusión verbal con preceptor', 'grave', 'Discusión verbal con el preceptor al ser llamada la atención.', NULL, NULL, 'pendiente', p1.id, NULL, '2026-04-22T12:00:00Z', NULL, NULL
FROM public.alumnos a, public.perfiles p1
WHERE a.nombre = 'Morena' AND a.apellido = 'Campos' AND p1.rol = 'preceptor'
ON CONFLICT DO NOTHING;

-- ========== ALUMNO: Catalina Silva (5°1) - 4 informes ==========
INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Disciplina', 'Interrupción reiterada de clase', 'leve', 'Interrumpió la clase en múltiples ocasiones pese a advertencias.', 'Me disculpo.', NULL, 'aprobado', p1.id, p2.id, '2026-03-14T09:00:00Z', '2026-03-15T11:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Catalina' AND a.apellido = 'Silva' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Asistencia', 'Ausencia injustificada', 'leve', 'Faltó 3 días consecutivos sin presentar justificación.', 'Estuve enferma.', NULL, 'aprobado', p1.id, p2.id, '2026-03-28T08:00:00Z', '2026-03-30T10:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Catalina' AND a.apellido = 'Silva' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Académica', 'Fraude en trabajo grupal', 'muy_grave', 'No participó en el trabajo grupal pero figuraba como autora.', 'Hice mi parte.', NULL, 'rechazado', p1.id, p2.id, '2026-04-11T10:00:00Z', '2026-04-13T16:00:00Z', 'Falta documentación de participación individual.'
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Catalina' AND a.apellido = 'Silva' AND p1.rol = 'preceptor' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Conducta', 'Falta de respeto hacia compañero', 'grave', 'Utilizó lenguaje inapropiado hacia un compañero durante el recreo.', 'Lo siento.', NULL, 'pendiente', p1.id, NULL, '2026-04-20T12:00:00Z', NULL, NULL
FROM public.alumnos a, public.perfiles p1
WHERE a.nombre = 'Catalina' AND a.apellido = 'Silva' AND p1.rol = 'docente'
ON CONFLICT DO NOTHING;

-- ========== ALUMNO: Tomás Romero (5°2) - 3 informes ==========
INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Disciplina', 'Uso de celular durante evaluación', 'muy_grave', 'Sorprendido utilizando el celular durante una evaluación de historia.', 'Solo miré la hora.', NULL, 'aprobado', p1.id, p2.id, '2026-03-30T10:00:00Z', '2026-04-01T11:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Tomás' AND a.apellido = 'Romero' AND p1.rol = 'preceptor' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Asistencia', 'Llegadas tarde reiteradas', 'leve', 'Acumula 7 llegadas tarde en el mes.', 'Me levanto tarde.', NULL, 'pendiente', p1.id, NULL, '2026-04-12T08:00:00Z', NULL, NULL
FROM public.alumnos a, public.perfiles p1
WHERE a.nombre = 'Tomás' AND a.apellido = 'Romero' AND p1.rol = 'docente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Conducta', 'Agresión física leve', 'grave', 'Empujó a un compañero en el pasillo generando una discusión.', 'Fue sin querer.', NULL, 'aprobado', p1.id, p2.id, '2026-04-21T14:00:00Z', '2026-04-23T09:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Tomás' AND a.apellido = 'Romero' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

-- ========== ALUMNO: Agustina Molina (4°2) - 3 informes ==========
INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Otra', 'Olvido de materiales reiterado', 'leve', 'Olvidó los materiales necesarios para la clase por cuarta vez.', 'Se me olvidó.', NULL, 'aprobado', p1.id, p2.id, '2026-03-20T08:00:00Z', '2026-03-21T09:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Agustina' AND a.apellido = 'Molina' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Disciplina', 'Fuga del aula sin permiso', 'grave', 'Abandonó el aula sin permiso durante una evaluación.', 'Tenía que ir al baño.', NULL, 'rechazado', p1.id, p2.id, '2026-04-06T10:00:00Z', '2026-04-08T11:00:00Z', 'Se requiere certificado médico.'
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Agustina' AND a.apellido = 'Molina' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Académica', 'Copia en examen', 'muy_grave', 'Copió respuestas de un compañero durante el examen de lengua.', 'No copié.', NULL, 'pendiente', p1.id, NULL, '2026-04-18T09:00:00Z', NULL, NULL
FROM public.alumnos a, public.perfiles p1
WHERE a.nombre = 'Agustina' AND a.apellido = 'Molina' AND p1.rol = 'preceptor'
ON CONFLICT DO NOTHING;

-- ========== ALUMNO: Facundo Ortiz (4°2) - 2 informes ==========
INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Disciplina', 'Alteración del orden en clase', 'leve', 'Generó disturbios y alteró el orden durante la clase.', 'Lo siento.', NULL, 'aprobado', p1.id, p2.id, '2026-04-04T11:00:00Z', '2026-04-05T10:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Facundo' AND a.apellido = 'Ortiz' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Asistencia', 'Ausencia injustificada', 'leve', 'Faltó 2 días sin justificación.', 'Estuve enfermo.', NULL, 'pendiente', p1.id, NULL, '2026-04-19T08:00:00Z', NULL, NULL
FROM public.alumnos a, public.perfiles p1
WHERE a.nombre = 'Facundo' AND a.apellido = 'Ortiz' AND p1.rol = 'docente'
ON CONFLICT DO NOTHING;

-- ========== ALUMNO: Santiago Bravo (3°2) - 2 informes ==========
INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Conducta', 'Falta de respeto hacia docente', 'grave', 'Respondió de manera irrespetuosa al docente.', NULL, NULL, 'aprobado', p1.id, p2.id, '2026-03-22T14:00:00Z', '2026-03-24T09:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Santiago' AND a.apellido = 'Bravo' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Disciplina', 'Uso de celular durante clase', 'leve', 'Utilizaba el celular durante la explicación.', 'Solo miré la hora.', NULL, 'pendiente', p1.id, NULL, '2026-04-14T10:00:00Z', NULL, NULL
FROM public.alumnos a, public.perfiles p1
WHERE a.nombre = 'Santiago' AND a.apellido = 'Bravo' AND p1.rol = 'docente'
ON CONFLICT DO NOTHING;

-- ========== ALUMNO: Emma Vega (3°2) - 2 informes ==========
INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Académica', 'Plagio en trabajo práctico', 'grave', 'Trabajo práctico copiado de internet sin citar fuentes.', 'No sabía.', NULL, 'aprobado', p1.id, p2.id, '2026-04-09T15:00:00Z', '2026-04-11T10:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Emma' AND a.apellido = 'Vega' AND p1.rol = 'preceptor' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Asistencia', 'Llegadas tarde', 'leve', 'Llegó tarde 3 veces esta semana.', 'Problemas de transporte.', NULL, 'pendiente', p1.id, NULL, '2026-04-23T08:00:00Z', NULL, NULL
FROM public.alumnos a, public.perfiles p1
WHERE a.nombre = 'Emma' AND a.apellido = 'Vega' AND p1.rol = 'docente'
ON CONFLICT DO NOTHING;

-- ========== ALUMNO: Mateo Soto (1°2) - 2 informes ==========
INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Disciplina', 'Interrupción de clase', 'leve', 'Interrumpió la clase reiteradamente.', 'Me disculpo.', NULL, 'aprobado', p1.id, p2.id, '2026-04-07T09:00:00Z', '2026-04-08T10:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Mateo' AND a.apellido = 'Soto' AND p1.rol = 'docente' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Conducta', 'Falta de respeto a compañero', 'grave', 'Utilizó lenguaje inapropiado hacia un compañero.', 'No fue mi intención.', NULL, 'pendiente', p1.id, NULL, '2026-04-20T12:00:00Z', NULL, NULL
FROM public.alumnos a, public.perfiles p1
WHERE a.nombre = 'Mateo' AND a.apellido = 'Soto' AND p1.rol = 'docente'
ON CONFLICT DO NOTHING;

-- ========== ALUMNO: Valentina Flores (2°2) - 1 informe ==========
INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Otra', 'Incumplimiento de uniforme', 'leve', 'Asistió sin uniforme reglamentario.', 'Se me olvidó.', NULL, 'aprobado', p1.id, p2.id, '2026-04-16T07:45:00Z', '2026-04-17T09:00:00Z', NULL
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Valentina' AND a.apellido = 'Flores' AND p1.rol = 'preceptor' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;

-- ========== ALUMNO: Benjamín Acosta (2°2) - 1 informe ==========
INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Disciplina', 'Uso de celular durante clase', 'leve', 'Utilizaba el celular durante la clase de matemática.', 'Solo miré la hora.', NULL, 'pendiente', p1.id, NULL, '2026-04-22T10:00:00Z', NULL, NULL
FROM public.alumnos a, public.perfiles p1
WHERE a.nombre = 'Benjamín' AND a.apellido = 'Acosta' AND p1.rol = 'docente'
ON CONFLICT DO NOTHING;

-- ========== ALUMNO: Maximiliano Luna (7°1) - 1 informe ==========
INSERT INTO public.informes (alumno_id, tipo_falta, titulo, instancia, resumen, descargo, observaciones, estado, creado_por, revisado_por, fecha_creacion, fecha_revision, motivo_rechazo)
SELECT a.id, 'Académica', 'Fraude en evaluación', 'muy_grave', 'Se detectó que otra persona realizó el examen online.', 'Fui yo.', NULL, 'rechazado', p1.id, p2.id, '2026-04-13T09:00:00Z', '2026-04-16T11:00:00Z', 'Evidencia técnica inconclusa.'
FROM public.alumnos a, public.perfiles p1, public.perfiles p2
WHERE a.nombre = 'Maximiliano' AND a.apellido = 'Luna' AND p1.rol = 'preceptor' AND p2.rol = 'regente'
ON CONFLICT DO NOTHING;
