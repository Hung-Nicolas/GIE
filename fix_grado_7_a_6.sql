-- Cambiar todos los alumnos de 7° a 6°
UPDATE public.alumnos SET curso = '6°' WHERE curso = '7°';

-- Verificar que no queden alumnos en 7°
SELECT id, nombre, apellido, curso, division FROM public.alumnos WHERE curso = '7°';
