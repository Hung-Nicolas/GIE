-- Fix: docentes/preceptores solo ven sus propios informes
DROP POLICY IF EXISTS "informes_select" ON public.informes;
CREATE POLICY "informes_select"
    ON public.informes FOR SELECT
    TO authenticated
    USING (
        public.perfil_rol() = 'regente'
        OR (public.perfil_rol() = 'doe' AND estado IN ('derivado', 'archivado', 'anulado'))
        OR (public.perfil_rol() IN ('docente', 'preceptor') AND creado_por = auth.uid())
        OR (
            public.perfil_rol() = 'pat'
            AND (
                creado_por = auth.uid()
                OR alumno_id IN (SELECT unnest(alumnos_pat) FROM perfiles WHERE id = auth.uid())
            )
        )
    );
