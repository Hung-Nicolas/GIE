# GIE - Gestor de Informes Escolares

Aplicación web para la gestión de informes disciplinarios y académicos escolares. Permite a docentes y preceptores crear informes sobre conducta de alumnos, a los regentes revisar, aprobar, rechazar o derivar dichos informes, al Departamento de Orientación Escolar (DOE) intervenir en informes derivados, y a los PAT (Profesores de Acompañamiento Tutorial) realizar seguimiento de sus alumnos asignados.

**Versión actual:** 1.6.2

---

## Herramientas

<div align="center">

| | Tecnología | Descripción |
|:---:|:---|:---|
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg" width="32"/> | **HTML5** | Estructura del frontend |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" width="32"/> | **JavaScript (ES Modules)** | Lógica del frontend en vanilla JS |
| <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Tailwind_CSS_Logo.svg" width="32"/> | **Tailwind CSS v3** | Estilos y diseño utilitario |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg" width="32"/> | **Vite 5.4.10** | Bundler y servidor de desarrollo |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/supabase/supabase-original.svg" width="32"/> | **Supabase** | Backend: PostgreSQL + Auth + Realtime |
| <img src="https://www.chartjs.org/img/chartjs-logo.svg" width="32"/> | **Chart.js v4.4.6** | Gráficos e indicadores visuales |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg" width="32"/> | **PostgreSQL** | Base de datos relacional vía Supabase |

</div>

---

## Roles de usuario

| Rol | Permisos |
|-----|----------|
| **Regente** | Acceso total: gestión de informes, dashboard, estadísticas, docentes, usuarios y plantillas. Puede aprobar, rechazar, reactivar y derivar informes. Puede crear, editar, activar/desactivar, cambiar contraseña y eliminar usuarios. |
| **Docente / Preceptor** | Crear, ver y editar sus propios informes. No pueden editar informes finalizados. Acceso a listado de alumnos (todos o "Mis cursos" según asignación). |
| **DOE** | Visualización de informes derivados, archivados y anulados. Puede agregar observaciones y acciones en informes derivados, y devolverlos a estado `pendiente`. |
| **PAT** | Seguimiento de alumnos asignados. Acceso limitado a la información de sus alumnos designados. |

---

## Funcionalidades principales

### Informes
- **CRUD completo** de informes disciplinarios/académicos con numeración automática (YYYY + secuencial).
- **Workflow de estados:** `pendiente` → `revisado` → (`archivado` \| `derivado` \| `anulado`).
- **Instancias:** leve, grave, muy grave, consejo de aula, consejo escolar.
- **Aprobación/Rechazo/Reactivación/Derivación** con registro de historial completo.
- **Plantillas de informes** predefinidas y personalizables, con contador de usos.
- **Exportación a PDF** de informes individuales y en blanco.
- **Suscripción en tiempo real** a cambios en la tabla `informes` mediante Supabase Realtime.

### Alumnos
- Búsqueda con debounce, filtros por curso/turno y tabs "Todos" / "Mis cursos".
- **Vista detallada por alumno:** resumen, historial de informes, gráfico de instancias y línea de tiempo.
- **Observaciones y acciones por alumno:** seguimientos, entrevistas, llamados a padres, derivaciones, suspensiones, etc. con tipos personalizables y colores configurables.
- Creación de nuevos alumnos desde la interfaz.

### Dashboard
- Contadores de informes por estado e instancia.
- **Calendario de reuniones** con navegación mensual, selección de día y listado de reuniones.
- Pendientes de revisión e historial reciente.
- Gráfico de dona por instancia.
- Acciones rápidas con animaciones (aprobar/rechazar desde el dashboard).

### Estadísticas
- Gráfico de barras por curso con *drill-down* por división.
- Gráfico de torta por tipo de falta.
- Gráfico de línea de tendencia mensual con selector de período.
- **Tabla "Informes por Curso"** con desglose por instancia para cada curso+división.
- Top alumnos con más informes.

### Docentes y usuarios
- Vista de docentes con historial de informes creados.
- Los regentes pueden gestionar usuarios desde la sección **Docentes y Personal**: crear, editar datos y cursos, activar/desactivar, cambiar contraseña y eliminar usuarios.
- Los usuarios se autentican directamente en **GIE**.

### Administración
- Panel de espacio utilizado en la base de datos.
- Gestión de tipos de observación personalizados (colores, activación/desactivación).
- Modal de novedades con historial de versiones.

---

## Integración con Nexus (Base de Datos Escolar Maestra)

GIE se integra con **Nexus**, la BD escolar centralizada, únicamente para la sincronización de alumnos.

### Autenticación
- El login se realiza directamente contra **Supabase Auth de GIE**.
- Los usuarios, roles y contraseñas se gestionan en GIE.

### Sincronización de datos
- **Nexus → GIE:** alumnos vía Edge Function `sync-alumnos-nexus`, que corre en el servidor de GIE y no expone las credenciales de Nexus al frontend.
- **GIE → Nexus:** no hay sincronización de informes ni usuarios hacia Nexus.