# GIE - Gestor de Informes Escolares

## Visión general del proyecto

GIE es una aplicación web de gestión de informes disciplinarios y académicos escolares. Es una **SPA (Single Page Application) de solo cliente** construida con HTML, CSS, JavaScript vanilla y **Vite** como bundler/dev server. La persistencia y autenticación se realizan exclusivamente mediante **Supabase** (PostgreSQL + Auth).

El sistema permite a docentes y preceptores crear informes sobre conducta de alumnos, y a los regentes revisar, aprobar o rechazar dichos informes. Incluye dashboard con estadísticas, filtros de búsqueda, gestión de usuarios, vista detallada por alumno, exportación a PDF y plantillas de informes.

La interfaz y toda la documentación interna están en **español**.

## Estructura del proyecto

```
.
├── index.html              # Entry point HTML (estructura completa de la SPA)
├── package.json            # Dependencias npm
├── vite.config.js          # Configuración de Vite
├── tailwind.config.js      # Configuración de Tailwind CSS
├── postcss.config.js       # Configuración de PostCSS
├── .env                    # Variables de entorno (Supabase)
├── supabase.sql            # Schema SQL completo para Supabase (tablas, RLS, triggers, funciones RPC)
├── seed.sql                # Datos de demostración para Supabase
├── test.sql                # Queries de verificación para Supabase
├── reset-pass.js           # Script Node.js standalone para resetear contraseñas vía admin API
├── AGENTS.md               # Este archivo
├── dist/                   # Build de producción (generado)
├── node_modules/           # Dependencias instaladas
└── src/
    ├── main.js             # Punto de entrada JS y ÚNICO módulo activo de la lógica de aplicación
    ├── config.js           # Configuración y validación de Supabase
    ├── auth.js             # Autenticación: login, logout, restauración de sesión
    ├── styles.css          # Tailwind + estilos custom (status-, instancia-, animate-)
    ├── app.js              # LEGACY - No se utiliza (importa src/db.js que no existe)
    ├── dashboard.js        # LEGACY - No se utiliza (importa src/db.js que no existe)
    ├── estadisticas.js     # LEGACY - No se utiliza (importa src/db.js que no existe)
    ├── usuarios.js         # LEGACY - No se utiliza (importa src/db.js que no existe)
    ├── alumno.js           # LEGACY - No se utiliza (importa src/db.js que no existe)
    ├── pdf.js              # LEGACY - No se utiliza (importa src/db.js que no existe)
    └── informes.js         # LEGACY - No se utiliza (importa src/db.js que no existe)
```

> **⚠️ Nota importante sobre la arquitectura:** El archivo `src/main.js` es un monolito de ~1400 líneas que contiene **toda** la lógica funcional de la aplicación. Los demás archivos en `src/` (excepto `config.js`, `auth.js` y `styles.css`) son legado no utilizados. No existe `src/db.js`.

## Stack tecnológico

| Capa | Tecnología | Origen |
|------|-----------|--------|
| Bundler / Dev server | Vite | npm |
| Estilos | Tailwind CSS | npm |
| Iconografía | Font Awesome 6.4.0 | CDN (cdnjs) |
| Lógica | JavaScript vanilla (ES modules) | `src/main.js` |
| Gráficos | Chart.js | npm |
| Exportación PDF | html2pdf.js | npm |
| Tipografía | Inter (Google Fonts) | CDN |
| Backend / Auth | Supabase | `@supabase/supabase-js` |

## Gestión de dependencias

El proyecto usa **npm** como gestor de paquetes. Las dependencias se instalan con:

```bash
npm install
```

### Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo con hot reload (puerto 3000)
npm run build    # Build de producción en dist/
npm run preview  # Previsualizar build de producción
```

### Variables de entorno

Vite expone al frontend solo las variables que empiezan con `VITE_`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Si estas variables no están definidas o son inválidas, la app **no permite el inicio de sesión** ya que la autenticación requiere Supabase.

## Arquitectura y organización del código

### Punto de entrada

`index.html` carga únicamente `/src/main.js` como módulo ES. Desde allí se importan:
- `src/config.js` — Cliente Supabase y flag `USE_SUPABASE`
- `src/auth.js` — Estado de sesión, login/logout, helpers de UI
- `src/styles.css` — Estilos
- `chart.js/auto` y `html2pdf.js` — dependencias npm

### Persistencia de datos

La aplicación **solo funciona con Supabase**. No hay modo demo local operativo.

- **Usuarios/Auth**: manejados por `auth.users` de Supabase + tabla `perfiles` (vinculadas 1:1).
- **Alumnos**: tabla `alumnos` (solo lectura desde la app).
- **Informes**: tabla `informes` con RLS por rol.
- **Plantillas**: tabla `plantillas` para plantillas personalizadas de informes.
- **Realtime**: suscripción a cambios en `informes` para actualización en tiempo real.

### Módulo `src/main.js` (monolito funcional)

Toda la lógica de la aplicación reside en este archivo. Se organiza internamente en secciones comentadas:

1. **Estado global** — Arrays `alumnos`, `informes`, `usuarios`, `plantillas`; objeto `charts`; variables de calendario.
2. **Plantillas predefinidas** — `PLANTILLAS_INFORME` (objeto con ~13 plantillas de ejemplo).
3. **Carga inicial de datos** — `cargarAlumnos()`, `cargarInformes()`, `cargarUsuariosSupa()`, `cargarPlantillas()`.
4. **Helpers** — `getAlumno()`, `getInforme()`, `getNombreUsuario()`.
5. **Inicialización** — `DOMContentLoaded` → `setupLoginBanner()`, `setupLoginForm()`, `setupEventListeners()`, `restoreSession()`, `iniciarApp()`.
6. **Navegación** — `showSection()`, `toggleSidebar()`, `logout()`.
7. **Utilidades** — `formatearFecha()`, `formatearFechaCorta()`, `generarId()`, `mostrarToast()`.
8. **Alumnos** — `buscarAlumno()` (con debounce de 300 ms), `seleccionarAlumno()`, `limpiarAlumno()`.
9. **Informes - CRUD** — `filtrarInformes()`, `renderizarInformes()`, `guardarInforme()`, `editarInforme()`, `cancelarForm()`.
10. **Detalle y acciones** — `verDetalle()`, `cambiarEstado()`, `mostrarRechazo()`, `confirmarRechazo()`, `cerrarModal()`, `cerrarModalRechazo()`.
11. **Acciones rápidas con animación** — `accionRapidaAprobar()`, `accionRapidaRechazar()`, `aprobarDesdeDashboard()`, `rechazarDesdeDashboard()`, `aprobarConAnimacion()`.
12. **Dashboard** — `actualizarDashboard()` con contadores, calendario de reuniones (`renderCalendarioReuniones()`, `renderReunionesDiaSeleccionado()`, `seleccionarDiaCal()`), pendientes de revisión, historial reciente y gráfico de dona.
13. **Estadísticas** — `cargarEstadisticas()` con gráficos de barras (por curso), torta (por tipo de falta), línea (tendencia mensual) y tabla top alumnos.
14. **Vista alumno** — `verAlumno()` con resumen, historial y gráfico de dona individual.
15. **Usuarios** — `cargarUsuarios()`, `crearUsuario()`, `sincronizarPerfilUsuario()`, `editarUsuarioForm()`, `guardarEdicionUsuario()`, `eliminarUsuario()`.
16. **Plantillas CRUD** — `cargarPlantillas()`, `calcularTendenciaPlantillas()`, `renderizarSelectPlantillas()`, `renderizarListaPlantillas()`, `abrirModalPlantillas()`, `crearPlantilla()`, `eliminarPlantilla()`.
17. **Exportar PDF** — `exportarPDF()` genera HTML dinámico para `html2pdf.js`.
18. **Exposición global** — Funciones usadas en `onclick` del HTML se asignan a `window` al final del archivo.

### Control de acceso basado en roles (RBAC)

| Rol | Permisos |
|-----|----------|
| `regente` | Acceso total: ver todos los informes, aprobar/rechazar/reactivar, gestión de usuarios, ver sección "Usuarios" en sidebar, ver Dashboard y Estadísticas. |
| `docente` / `preceptor` | Solo ver y crear/editar sus propios informes. No pueden editar informes aprobados. No ven Dashboard ni Estadísticas. |

La UI oculta elementos según el rol mediante clases CSS `hidden` y condicionales en el renderizado. En Supabase, las políticas RLS refuerzan estas restricciones en el servidor.

### Suscripción realtime

Si `USE_SUPABASE` es verdadero, `src/main.js` se suscribe al canal `informes_changes` de Supabase. Cualquier cambio en la tabla `informes` recarga los datos y actualiza las vistas activas (lista de informes o dashboard) sin necesidad de refrescar la página.

## Flujo de trabajo de desarrollo

### Requisitos

- Node.js 18+ (con npm)
- Navegador web moderno

### Instalación rápida

```bash
npm install
npm run dev
```

Luego acceder a `http://localhost:3000`.

### Configuración de Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Copiar `Project URL` y `anon public` API Key
3. Crear `.env` en la raíz:
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. Ejecutar `supabase.sql` en el SQL Editor de Supabase
5. En Auth → Providers → Email, desactivar "Confirm email"
6. En Database → Replication → Realtime, agregar tabla `informes` a la publicación `supabase_realtime`
7. (Opcional) Ejecutar `seed.sql` para cargar datos de demostración en Supabase

### Datos de demostración

`seed.sql` inserta 20 alumnos, 4 usuarios de auth (`asd123@gie.com`, `regente@gie.com`, `docente@gie.com`, `preceptor@gie.com`) y 10 informes de ejemplo. Las contraseñas son `asd123`, `regente123`, `docente123` y `preceptor123` respectivamente.

### Script de reset de contraseña

`reset-pass.js` es un script Node.js standalone que usa la API de admin de Supabase (requiere `SUPABASE_SERVICE_ROLE_KEY`) para resetear la contraseña de un usuario específico. No forma parte de la app frontend.

## Convenciones de código

- Todo el código (variables, funciones, comentarios, logs) está en español.
- Funciones nombradas con `camelCase` descriptivo (ej. `formatearFecha`, `cambiarEstado`).
- IDs de elementos DOM utilizan `camelCase` o `snake_case` indistintamente.
- Clases CSS personalizadas definidas en `src/styles.css` con prefijos semánticos:
  - `status-*` para badges de estado (`pendiente`, `aprobado`, `rechazado`, etc.)
  - `instancia-*` para bordes laterales según gravedad (`leve`, `grave`, `muy_grave`)
  - `animate-*` para animaciones (`fade-in`, `slide-out`, `pop`, `shake`)
- Logs de consola prefijados con `[GIE]` y emoji para facilitar el debugging.
- Las funciones usadas en atributos `onclick` del HTML deben exponerse explícitamente a `window` (ver final de `main.js` donde se asignan a `window.*`).
- Las fechas se formatean para la locale `es-AR` (día/mes/año).

## Testing

**No hay tests automatizados** (unitarios, de integración ni E2E). La verificación se realiza manualmente abriendo la aplicación en el navegador. El archivo `test.sql` contiene queries de verificación para ejecutar en el SQL Editor de Supabase.

## Despliegue

El build de producción se genera con:

```bash
npm run build
```

Esto crea la carpeta `dist/` con archivos estáticos optimizados que pueden copiarse a cualquier hosting estático (GitHub Pages, Netlify, Vercel, Apache, Nginx, etc.).

## Consideraciones de seguridad

> ⚠️ **Este sistema no está diseñado para manejar datos reales de producción sin modificaciones significativas.**

- Las contraseñas se manejan por `auth.users` de Supabase (encriptadas por Supabase).
- Las políticas RLS protegen el acceso a datos en el servidor.
- La sesión de Supabase Auth se persiste en `sessionStorage` (no en `localStorage`).
- Idealmente debe tratarse como un prototipo o demostración funcional, no como un sistema de gestión escolar productivo sin auditoría adicional.

## Notas para agentes de código

- **No existe `src/db.js`**. No crearlo ni modificar referencias a él en los archivos legacy; esos archivos no se usan.
- Si se agrega nueva funcionalidad, agregarla directamente en `src/main.js` en la sección correspondiente, manteniendo el patrón de funciones nombradas en español.
- No utilizar `localStorage` para autenticación ni sesión. La auth es exclusivamente Supabase.
- Respetar el sistema de roles (`regente`, `docente`, `preceptor`) al implementar nuevas pantallas o acciones.
- Las nuevas dependencias de frontend deben instalarse vía `npm install` y importarse como ES modules.
- Las funciones usadas en `onclick` del HTML deben exponerse explícitamente a `window` (ej. `window.miNuevaFuncion = miNuevaFuncion;`).
- Al modificar el schema de datos, actualizar tanto `supabase.sql` como `seed.sql`.
- El archivo `src/main.js` es intencionalmente monolítico. Si se decide refactorizar a módulos, hay que tener en cuenta que los archivos legacy (`app.js`, `dashboard.js`, etc.) no son funcionales en su estado actual.
