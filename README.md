# GIE - Gestor de Informes Escolares

Aplicación web para la gestión de informes disciplinarios y académicos escolares. Permite a docentes y preceptores crear informes sobre conducta de alumnos, a los regentes revisar, aprobar, rechazar o derivar dichos informes, al Departamento de Orientación Escolar (DOE) intervenir en informes derivados, y a los PAT (Profesores de Acompañamiento Tutorial) realizar seguimiento de sus alumnos asignados.

**Versión actual:** 1.6.2

## Tecnologías

- **Frontend:** HTML, JavaScript vanilla (ES modules), Tailwind CSS v3
- **Bundler:** Vite 5.4.10
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Gráficos:** Chart.js v4.4.6
- **Exportación PDF:** html2pdf.js v0.10.2
- **Iconografía:** Font Awesome 6.4.0
- **Tipografía:** Inter (Google Fonts)

## Requisitos previos

- [Node.js](https://nodejs.org/) (versión 22 o superior recomendada)
- Cuenta en [Supabase](https://supabase.com)

## Roles de usuario

| Rol | Permisos |
|-----|----------|
| **Regente** | Acceso total: gestión de informes, usuarios, dashboard, estadísticas, docentes y plantillas. Puede aprobar, rechazar, reactivar y derivar informes. |
| **Docente / Preceptor** | Crear, ver y editar sus propios informes. No pueden editar informes finalizados. Acceso a listado de alumnos (todos o "Mis cursos" según asignación). |
| **DOE** | Visualización de informes derivados, archivados y anulados. Puede agregar observaciones y acciones en informes derivados, y devolverlos a estado `pendiente`. |
| **PAT** | Seguimiento de alumnos asignados. Acceso limitado a la información de sus alumnos designados. |

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

### Usuarios
- Gestión completa de usuarios: crear, editar, activar/desactivar, eliminar.
- Asignación de cursos por usuario.
- Cambio de contraseña desde el panel de regente.
- Vista de docentes con historial de informes creados.

### Administración
- Panel de espacio utilizado en la base de datos.
- Gestión de tipos de observación personalizados (colores, activación/desactivación).
- Modal de novedades con historial de versiones.

## Estructura del proyecto

```
.
├── index.html                   # Punto de entrada de la SPA
├── src/
│   ├── main.js                  # Lógica principal de la aplicación (~3000 líneas)
│   ├── config.js                # Cliente Supabase y flag USE_SUPABASE
│   ├── auth.js                  # Autenticación (login, logout, sesión)
│   └── styles.css               # Tailwind + estilos custom (animaciones, skeletons, badges)
├── supabase.sql                 # Schema completo de la base de datos
├── seed.sql                     # Datos de demostración (~40 alumnos, 113 informes, 437 historiales, 42 observaciones)
├── migracion_categorias.sql     # Migración: tabla categorías
├── migracion_tipos_observacion.sql  # Migración: tipos de observación personalizados
├── temp.sql                     # Fix: trigger handle_new_user + política RLS
├── fix_duplicados_alumnos.sql   # Corrección: elimina alumnos duplicados
├── fix_duplicados_informes.sql  # Corrección: elimina informes duplicados
├── fix_grado_7_a_6.sql          # Corrección: migra alumnos de 7° a 6°
├── reset-pass.js                # Script Node.js para reseteo de contraseñas (admin)
├── .github/workflows/           # CI/CD para GitHub Pages
├── supabase/                    # Configuración de Supabase CLI
└── AGENTS.md                    # Documentación técnica para desarrolladores
```

## 🔗 Integración con Nexus (Base de Datos Escolar Maestra)

GIE puede sincronizar sus alumnos desde **Nexus**, la BD escolar centralizada.


## Licencia

Este proyecto es de uso interno y educativo.
