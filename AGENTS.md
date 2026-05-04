# GIE - Gestor de Informes Escolares

## Visión general del proyecto

GIE es una aplicación web de gestión de informes disciplinarios y académicos escolares. Es una **SPA (Single Page Application) de solo cliente** construida con HTML, CSS, JavaScript vanilla y **Vite** como bundler / dev server. La persistencia, autenticación y autorización se realizan exclusivamente mediante **Supabase** (PostgreSQL + Auth).

El sistema permite a docentes y preceptores crear informes sobre conducta de alumnos, a los regentes revisar, aprobar o rechazar dichos informes, y a los DOE (Departamento de Orientación Escolar) visualizar informes y alumnos en modo solo lectura. Incluye dashboard con estadísticas, calendario de reuniones, filtros de búsqueda, gestión de usuarios, vista detallada por alumno, exportación a PDF, plantillas de informes y suscripción en tiempo real.

La interfaz, el código y toda la documentación interna están en **español**.

## Stack tecnológico

| Capa | Tecnología | Origen |
|------|-----------|--------|
| Bundler / Dev server | Vite | npm |
| Estilos | Tailwind CSS v3 + PostCSS + Autoprefixer | npm |
| Iconografía | Font Awesome 6.4.0 | CDN (cdnjs) |
| Lógica | JavaScript vanilla (ES modules) | `src/main.js` |
| Gráficos | Chart.js v4 | npm |
| Exportación PDF | html2pdf.js | npm |
| Tipografía | Inter (Google Fonts) | CDN |
| Backend / Auth / DB | Supabase | `@supabase/supabase-js` |
| CI / Deploy | GitHub Actions → GitHub Pages | `.github/workflows/deploy.yml` |

## Estructura del proyecto

```
.
├── index.html                   # Entry point HTML (estructura completa de la SPA)
├── package.json                 # Dependencias npm (vite, tailwindcss, chart.js, etc.)
├── vite.config.js               # Configuración de Vite (base: '/GIE/', puerto 3000)
├── tailwind.config.js           # Configuración de Tailwind CSS
├── postcss.config.js            # Configuración de PostCSS
├── .env                         # Variables de entorno (Supabase) — NO versionar
├── .gitignore                   # Ignora node_modules/, dist/, .env, etc.
├── AGENTS.md                    # Este archivo
├── TESTING.md                   # Plan de pruebas manual
├── supabase.sql                 # Schema SQL completo para Supabase (tablas, RLS, triggers, funciones RPC)
├── seed.sql                     # Datos de demostración para Supabase (alumnos + informes)
├── test.sql                     # Queries de verificación para el SQL Editor de Supabase
├── ejemplos.sql                 # Queries de ejemplo / referencia
├── fix_duplicados_alumnos.sql   # Script de corrección: elimina alumnos duplicados
├── fix_duplicados_informes.sql  # Script de corrección: elimina informes duplicados
├── fix_grado_7_a_6.sql          # Script de corrección: migra alumnos de 7° a 6°
├── reset-pass.js                # Script Node.js standalone para resetear contraseñas (valores hardcodeados)
├── .github/workflows/deploy.yml # GitHub Actions: build + deploy a GitHub Pages
├── dist/                        # Build de producción (generado por Vite)
├── node_modules/                # Dependencias instaladas
└── src/
    ├── main.js                  # Punto de entrada JS y ÚNICO módulo activo (~2260 líneas, monolito)
    ├── config.js                # Cliente Supabase y flag USE_SUPABASE
    ├── auth.js                  # Autenticación: login, logout, restauración de sesión, helpers de UI
    ├── styles.css               # Tailwind directives + estilos custom (status-, instancia-, animate-)
    ├── app.js                   # LEGACY — No se utiliza (importa src/db.js que no existe)
    ├── dashboard.js             # LEGACY — No se utiliza (importa src/db.js que no existe)
    ├── estadisticas.js          # LEGACY — No se utiliza (importa src/db.js que no existe)
    ├── usuarios.js              # LEGACY — No se utiliza (importa src/db.js que no existe)
    ├── alumno.js                # LEGACY — No se utiliza (importa src/db.js que no existe)
    ├── pdf.js                   # LEGACY — No se utiliza (importa src/db.js que no existe)
    └── informes.js              # LEGACY — No se utiliza (importa src/db.js que no existe)
```

> **⚠️ Nota importante sobre la arquitectura:** El archivo `src/main.js` es un monolito que contiene **toda** la lógica funcional de la aplicación. Los demás archivos en `src/` (excepto `config.js`, `auth.js` y `styles.css`) son legado no utilizados. **No existe `src/db.js`**. No crearlo ni intentar reactivar los archivos legacy sin refactorización previa.

## Gestión de dependencias

El proyecto usa **npm** como gestor de paquetes.

```bash
npm install
```

### Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo con hot reload (puerto 3000)
npm run build    # Build de producción en dist/ (sourcemap habilitado)
npm run preview  # Previsualizar build de producción localmente
```

### Variables de entorno

Vite expone al frontend solo las variables que empiezan con `VITE_`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Si estas variables no están definidas o son inválidas, la app muestra un banner de error en el login y **no permite la autenticación** porque la auth requiere Supabase. No existe un modo demo local funcional; los elementos visuales de demo en el HTML no tienen lógica activa en `main.js`.

## Arquitectura y organización del código

### Punto de entrada

`index.html` carga únicamente `/src/main.js` como módulo ES. Desde allí se importan:
- `src/config.js` — Cliente Supabase y flag `USE_SUPABASE`
- `src/auth.js` — Estado de sesión, login/logout, helpers de UI
- `src/styles.css` — Estilos
- `chart.js/auto` y `html2pdf.js` — dependencias npm

### Persistencia de datos (Supabase)

La aplicación **solo funciona con Supabase**. No hay backend propio ni modo offline operativo.

**Tablas principales:**
- **`auth.users`** + **`public.perfiles`** (1:1) — usuarios, roles y estado activo/inactivo.
- **`public.alumnos`** — catálogo de alumnos (lectura desde la app).
- **`public.informes`** — informes con RLS por rol. Campos clave: `estado`, `instancia`, `tipo_falta`, `fecha_reunion`, `observaciones`, `motivo_rechazo`.
- **`public.plantillas`** — plantillas personalizadas de informes con contador de usos (`usos`).

**Funciones RPC (SECURITY DEFINER):**
- `actualizar_password_usuario(user_id UUID, new_password TEXT)` — regente cambia contraseñas.
- `listar_usuarios_completos()` — LEFT JOIN de `auth.users` + `perfiles`.
- `sincronizar_perfil(...)` — upsert manual de perfil.
- `eliminar_usuario_completo(user_id UUID)` — elimina usuario de `auth.users` (y perfiles por CASCADE), previa validación de que el llamante es regente y no elimina a otro regente.

**Triggers:**
- `on_auth_user_created` — crea automáticamente un registro en `public.perfiles` al insertar en `auth.users`.

**Realtime:**
- Suscripción al canal `informes_changes` de Supabase. Cualquier cambio en la tabla `informes` recarga los datos y refresca las vistas activas sin necesidad de refrescar la página.

### Módulo `src/main.js` (monolito funcional)

Toda la lógica de la aplicación reside en este archivo (~2260 líneas). Se organiza internamente en secciones comentadas:

1. **Estado global** — Arrays `alumnos`, `informes`, `usuarios`, `plantillas`; objeto `charts`; variables de calendario (`calCurrentDate`, `calSelectedDate`); `tabInformesActivo`.
2. **Plantillas predefinidas** — `PLANTILLAS_INFORME` (~13 plantillas de ejemplo).
3. **Carga inicial de datos** — `cargarAlumnos()`, `cargarInformes()`, `cargarUsuariosSupa()`, `cargarPlantillas()`.
4. **Helpers** — `getAlumno()`, `getInforme()`, `getNombreUsuario()`.
5. **Inicialización** — `DOMContentLoaded` → `setupLoginBanner()`, `setupLoginForm()`, `setupEventListeners()`, `restoreSession()`, `iniciarApp()`.
6. **Navegación** — `showSection()`, `toggleSidebar()`, `logout()`.
7. **Utilidades** — `formatearFecha()`, `formatearFechaCorta()`, `generarId()`, `mostrarToast()`.
8. **Alumnos** — `buscarAlumno()` (con debounce de 300 ms), `seleccionarAlumno()`, `limpiarAlumno()`.
9. **Informes - CRUD** — `filtrarInformes()`, `renderizarInformes()`, `guardarInforme()`, `editarInforme()`, `cancelarForm()`.
   - Nota: al crear un informe, el campo `tipo_falta` se guarda siempre como `'Otra'`.
10. **Detalle y acciones** — `verDetalle()`, `cambiarEstado()`, `mostrarRechazo()`, `confirmarRechazo()`.
11. **Acciones rápidas con animación** — `accionRapidaAprobar()`, `accionRapidaRechazar()`, `aprobarDesdeDashboard()`, `rechazarDesdeDashboard()`, `aprobarConAnimacion()`.
12. **Dashboard** — `actualizarDashboard()` con contadores, calendario de reuniones (`renderCalendarioReuniones()`, `renderReunionesDiaSeleccionado()`), pendientes de revisión, historial reciente y gráfico de dona.
13. **Estadísticas** — `cargarEstadisticas()` con gráficos de barras (por curso + drill-down por división), torta (por tipo de falta), línea (tendencia mensual) y tabla top alumnos.
14. **Vista alumno** — `verAlumno()` con resumen, historial, gráfico de dona individual y línea de tiempo.
15. **Usuarios** — `cargarUsuarios()`, `crearUsuario()`, `sincronizarPerfilUsuario()`, `editarUsuarioForm()`, `guardarEdicionUsuario()`, `eliminarUsuario()`.
16. **Plantillas CRUD** — `cargarPlantillas()`, `calcularTendenciaPlantillas()`, `renderizarSelectPlantillas()`, `renderizarListaPlantillas()`, `abrirModalPlantillas()`, `crearPlantilla()`, `eliminarPlantilla()`.
17. **Reuniones** — `confirmarFechaReunion()`, `guardarCambioReunion()`, `posponerReunion()`, `eliminarReunion()`.
18. **Exportar PDF** — `exportarPDF()` genera HTML dinámico para `html2pdf.js`.
19. **Exposición global** — Funciones usadas en `onclick` del HTML se asignan a `window` al final del archivo.

### Control de acceso basado en roles (RBAC)

| Rol | Permisos |
|-----|----------|
| `regente` | Acceso total: ver todos los informes, aprobar/rechazar/reactivar, gestión de usuarios (crear/editar/eliminar), ver Dashboard y Estadísticas, administrar plantillas. |
| `docente` / `preceptor` | Solo ver y crear/editar sus propios informes. No pueden editar informes aprobados. No ven Dashboard, Estadísticas ni la sección Usuarios. |
| `doe` | Solo lectura: ver todos los informes y alumnos, acceder a Ajustes. No puede crear, editar, eliminar ni cambiar estados de informes. No ve Dashboard, Estadísticas, Docentes ni Usuarios. |

La UI oculta elementos según el rol mediante clases CSS `hidden` y condicionales en el renderizado. En Supabase, las políticas RLS refuerzan estas restricciones en el servidor.

### Animaciones y UX

- **Entrada escalonada**: clases `animate-enter` y `animate-delay-*` (100ms a 600ms) para tarjetas del dashboard.
- **Scroll reveal**: `IntersectionObserver` en `card-scroll` que repite la animación al subir/bajar.
- **Slide-out**: `animate-slide-out` al aprobar/rechazar informes desde listas.
- **Pop / Shake**: `animate-pop` para checkmarks, `animate-shake` para validaciones.
- **Spinner**: clase `btn-spinner` para botones en carga.

## Convenciones de código

- **Idioma**: todo el código (variables, funciones, comentarios, logs de consola) está en español.
- **Funciones**: `camelCase` descriptivo (ej. `formatearFecha`, `cambiarEstado`).
- **IDs de DOM**: `camelCase` o `snake_case` indistintamente.
- **Clases CSS personalizadas** definidas en `src/styles.css` con prefijos semánticos:
  - `status-*` para badges de estado (`pendiente`, `aprobado`, `rechazado`, `archivado`, `en_revision`)
  - `instancia-*` para bordes laterales según gravedad (`leve`, `grave`, `muy_grave`)
  - `animate-*` para animaciones (`fade-in`, `slide-out`, `pop`, `shake`)
- **Logs de consola**: prefijados con `[GIE]` y emoji para facilitar debugging.
- **Fechas**: formateadas para la locale `es-AR` (día/mes/año).
- **`onclick` en HTML**: cualquier función invocada desde atributos `onclick` en el HTML debe exponerse explícitamente a `window` (ver final de `main.js`).
- **Tailwind**: se usa para layout, spacing, colores y utilidades; los estilos custom solo complementan animaciones y estados semánticos.

## Testing

**No hay tests automatizados** (unitarios, de integración ni E2E). La verificación se realiza manualmente abriendo la aplicación en el navegador.

El archivo `TESTING.md` contiene un plan de pruebas manual completo cubriendo:
- Autenticación (login, logout, sesión persistente, usuario desactivado)
- Dashboard (calendario, reuniones, pendientes, historial, gráficos)
- Informes (CRUD, filtros, aprobar/rechazar, PDF, plantillas)
- Alumnos (listado, filtros, detalle)
- Estadísticas (gráficos, drill-down, top alumnos)
- Usuarios (crear, editar, cambiar contraseña, desactivar, eliminar)
- Roles y permisos
- Responsive / UI

El archivo `test.sql` contiene queries de verificación para ejecutar en el SQL Editor de Supabase.

## Despliegue

### Build local

```bash
npm run build
```

Esto crea la carpeta `dist/` con archivos estáticos optimizados.

### GitHub Actions (automático)

El workflow `.github/workflows/deploy.yml` se ejecuta en cada push a `main` o manualmente (`workflow_dispatch`):

1. Checkout del código
2. Setup de Node.js 22 con cache de npm
3. `npm ci`
4. `npm run build` (inyecta `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` desde GitHub Secrets)
5. Deploy a la rama `gh-pages` mediante `peaceiris/actions-gh-pages@v4`

> **Requisito**: el repositorio debe tener configurados los secrets `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en GitHub → Settings → Secrets and variables → Actions.

## Configuración de Supabase (setup inicial)

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Copiar `Project URL` y `anon public` API Key
3. Crear `.env` en la raíz del proyecto:
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
4. Ejecutar `supabase.sql` en el SQL Editor de Supabase (ejecutar como `postgres` o con "Run without RLS" si aplica)
5. En Auth → Providers → Email, desactivar **"Confirm email"**
6. En Database → Replication → Realtime, agregar tabla `informes` a la publicación `supabase_realtime`
7. (Opcional) Ejecutar `seed.sql` para cargar datos de demostración
8. Crear usuarios de demo desde Authentication → Users → Add user (los perfiles se crean automáticamente por el trigger)

### Script de reset de contraseña

`reset-pass.js` es un script Node.js standalone que usa la **API de admin de Supabase** (`SUPABASE_SERVICE_ROLE_KEY`). Contiene valores hardcodeados (URL del proyecto y UUID de usuario). No forma parte de la app frontend. Para usarlo:

```bash
export SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
node reset-pass.js
```

## Consideraciones de seguridad

> ⚠️ **Este sistema no está diseñado para manejar datos reales de producción sin modificaciones significativas.**

- Las contraseñas se manejan por `auth.users` de Supabase (encriptadas por Supabase).
- Las políticas RLS protegen el acceso a datos en el servidor.
- La sesión de Supabase Auth se persiste en `sessionStorage` (no en `localStorage`).
- `reset-pass.js` requiere `SERVICE_ROLE_KEY` y debe usarse con precaución.
- `tipo_falta` se almacena siempre como `'Otra'` al crear informes desde la UI; si se requiere categorización real, hay que modificar el formulario de creación.
- Idealmente debe tratarse como un prototipo o demostración funcional, no como un sistema de gestión escolar productivo sin auditoría adicional.

## Notas para agentes de código

- **No existe `src/db.js`**. No crearlo ni modificar referencias a él en los archivos legacy; esos archivos no se usan.
- Si se agrega nueva funcionalidad, agregarla directamente en `src/main.js` en la sección correspondiente, manteniendo el patrón de funciones nombradas en español.
- No utilizar `localStorage` para autenticación ni sesión. La auth es exclusivamente Supabase (`sessionStorage`).
- Respetar el sistema de roles (`regente`, `docente`, `preceptor`, `doe`) al implementar nuevas pantallas o acciones.
- Las nuevas dependencias de frontend deben instalarse vía `npm install` e importarse como ES modules.
- Las funciones usadas en `onclick` del HTML deben exponerse explícitamente a `window` (ej. `window.miNuevaFuncion = miNuevaFuncion;`).
- Al modificar el schema de datos, actualizar tanto `supabase.sql` como `seed.sql`.
- El archivo `src/main.js` es intencionalmente monolítico. Si se decide refactorizar a módulos, hay que tener en cuenta que los archivos legacy (`app.js`, `dashboard.js`, etc.) no son funcionales en su estado actual.
- Al agregar campos al formulario de informes, recordar actualizar: validaciones en `guardarInforme()`, renderizado en `renderizarInformes()` / `verDetalle()`, y estadísticas si aplica.
