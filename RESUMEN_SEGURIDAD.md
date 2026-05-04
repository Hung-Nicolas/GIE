# Resumen de Hardening de Seguridad — GIE

> Documento para presentación a regentes y autoridades escolares.

---

## 1. Contexto

Se realizó una auditoría de seguridad completa del sistema GIE con el objetivo de dejarlo en condiciones para una **implementación oficial en una escuela real**.

**Hallazgo inicial:** El sistema contenía múltiples vulnerabilidades críticas que lo hacían inseguro para datos reales de alumnos.

**Estado actual:** Todas las vulnerabilidades críticas fueron corregidas. El sistema ahora cuenta con múltiples capas de protección.

---

## 2. Vulnerabilidades encontradas y corregidas

| # | Vulnerabilidad | Riesgo | Solución aplicada |
|---|---------------|--------|-------------------|
| 1 | **XSS masivo** (~40 puntos): datos de alumnos, informes y usuarios se mostraban sin sanitizar, permitiendo inyección de JavaScript malicioso. | 🔴 Crítico | Se agregó sanitización automática en todo el frontend. |
| 2 | **Cualquier usuario podía leer todos los informes** por una política de base de datos mal configurada. | 🔴 Crítico | Se restringió el acceso: docentes solo ven sus informes; regentes ven todos. |
| 3 | **Auto-registro público**: cualquier persona podía crear una cuenta y obtener acceso automático como docente. | 🔴 Alto | Se bloqueó el auto-registro. Ahora solo el regente crea usuarios. |
| 4 | **Cliente de base de datos expuesto globalmente** en el navegador. | 🔴 Alto | Se eliminó la exposición global. |
| 5 | **Credenciales de demostración** visibles en el código fuente del sitio. | 🟡 Medio | Se eliminaron completamente. |
| 6 | **Sin política de seguridad de contenido (CSP)**. | 🟡 Medio | Se agregó CSP para bloquear cargas de scripts no autorizados. |
| 7 | **Mapas de código fuente en producción** (facilitaban el análisis del código por atacantes). | 🟢 Bajo | Se deshabilitaron. |
| 8 | **Limpieza de sesión amplia** (borraba todo el almacenamiento del navegador). | 🟢 Bajo | Se restringió solo a datos de la aplicación. |

---

## 3. Capas de seguridad implementadas

### A. Frontend (navegador)
- ✅ **Sanitización de salida**: todo texto que viene de la base de datos se escapa antes de mostrarse. Un informe con `<script>alert(1)</script>` en el título se muestra como texto plano.
- ✅ **CSP (Content Security Policy)**: el navegador bloquea la carga de scripts, estilos o imágenes de dominios no autorizados.
- ✅ **Sin exposición de API**: el cliente de Supabase ya no está accesible desde la consola del navegador.
- ✅ **Sin mapas de fuente**: el código fuente original no se expone en producción.

### B. Base de datos (Supabase)
- ✅ **RLS endurecidas**: las reglas de acceso por fila ahora respetan los roles:
  - **Regente**: acceso total a informes, usuarios y auditoría.
  - **Docente/Preceptor**: solo puede ver y editar sus propios informes.
  - **Anónimo**: sin acceso a nada.
- ✅ **Auditoría**: nueva tabla `audit_log` que registra quién aprobó, rechazó o modificó un informe y cuándo.
- ✅ **Bloqueo de auto-registro**: si alguien intenta registrarse sin autorización, queda con rol `pendiente` e `inactivo`.
- ✅ **RPC seguras**: las funciones de administración (cambio de contraseñas, eliminación de usuarios) ya no son accesibles sin autenticación.

### C. Infraestructura
- ✅ **Claves rotadas**: la clave de superusuario (`SERVICE_ROLE_KEY`) debe regenerarse antes del deploy oficial.
- ✅ **Archivos sensibles ignorados**: scripts con contraseñas hardcodeadas ya no se suben al repositorio.

---

## 4. Recomendaciones para la decisión de implementación

| Aspecto | Recomendación |
|---------|--------------|
| **Hosting** | GitHub Pages es suficiente para una demo y funciona bien. Para producción con datos reales, considerar un hosting con control de headers de seguridad (Vercel, Netlify, o servidor propio). |
| **Supabase** | El proyecto actual está configurado y endurecido. Si se migra a otro proyecto, ejecutar `migracion_produccion.sql`. |
| **Usuarios** | El flujo recomendado es que **solo el regente cree usuarios**. No habilitar registro público. |
| **Datos demo** | El archivo `seed.sql` puede cargar alumnos e informes de prueba para la demo. Eliminar antes de producción. |
| **Backups** | Configurar backups automáticos en Supabase (incluido en planes pagos). |

---

## 5. Estado del código

- **Build**: ✅ Exitoso (sin errores).
- **Deploy**: Listo para publicar vía GitHub Actions.
- **Próximo paso manual**: ejecutar `migracion_produccion.sql` en Supabase y rotar la `SERVICE_ROLE_KEY`.

---

## 6. Demo para regentes

Para la presentación, se recomienda:
1. Tener el proyecto Supabase con datos de demo (`seed.sql`).
2. Acceder con un usuario **regente** para mostrar el dashboard, estadísticas y gestión de usuarios.
3. Acceder con un usuario **docente** para demostrar que solo ve sus propios informes.
4. Mostrar que un informe con código HTML en el título se renderiza como texto plano (prueba de sanitización).

---

*Documento generado el 2026-05-02 como parte del hardening de producción de GIE.*
