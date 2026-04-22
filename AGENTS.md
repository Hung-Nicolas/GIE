# GIE - Gestor de Informes Escolares

## Visión general del proyecto

GIE es una aplicación web de gestión de informes disciplinarios y académicos escolares. Es una **SPA (Single Page Application) de solo cliente** construida con HTML, CSS, JavaScript vanilla y **Vite** como bundler/dev server. La persistencia y autenticación se realizan exclusivamente mediante **Supabase** (PostgreSQL + Auth).

El sistema permite a docentes y preceptores crear informes sobre conducta de alumnos, y a los regentes revisar, aprobar o rechazar dichos informes. Incluye dashboard con estadísticas, filtros de búsqueda, gestión de usuarios, vista detallada por alumno y exportación a PDF.

La interfaz y toda la documentación interna están en **español**.

## Estructura del proyecto

```
.
├── index.html              # Entry point HTML (estructura de la SPA)
├── package.json            # Dependencias npm
├── vite.config.js          # Configuración de Vite
├── tailwind.config.js      # Configuración de Tailwind CSS
├── postcss.config.js       # Configuración de PostCSS
├── .env                    # Variables de entorno (Supabase)
├── supabase.sql            # Schema SQL completo para Supabase (tablas, RLS, triggers, funciones RPC)
├── seed.sql                # Datos de demostración para Supabase
├── test.sql                # Queries de prueba
├── AGENTS.md               # Este archivo
├── dist/                   # Build de producción (generado)
├── node_modules/           # Dependencias instaladas
└── src/
    ├── main.js             # Punto de entrada JS: inicialización, event listeners, realtime
    ├── config.js           # Configuración y validación de Supabase
    ├── db.js               # Capa de datos: localStorage, carga de alumnos/informes/usuarios
    ├── auth.js             # Autenticación: login, logout, restauración de sesión, demo DB
    ├── app.js              # Núcleo de la app: navegación, utilidades, CRUD de informes, modales
    ├── dashboard.js        # Dashboard: estadísticas rápidas, gráfico de dona, actividad reciente
    ├── estadisticas.js     # Estadísticas: gráficos por curso, tipo de falta, tendencia mensual, top alumnos
    ├── usuarios.js         # Gestión de usuarios (solo regente): crear, activar/desactivar
    ├── alumno.js           # Vista detallada de un alumno: resumen, historial de informes
    ├── pdf.js              # Exportación de informes a PDF con html2pdf.js
    └── styles.css          # Tailwind + estilos custom (status-, instancia-, animate-)
```

## Stack tecnológico

| Capa | Tecnología | Origen |
|------|-----------|--------|
| Bundler / Dev server | Vite | npm |
| Estilos | Tailwind CSS | npm |
| Iconografía | Font Awesome 6.4.0 | CDN (cdnjs) |
| Lógica | JavaScript vanilla (ES modules) | `src/*.js` |
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

### Persistencia de datos

#### Modo Supabase (recomendado para producción)
- **Usuarios/Auth**: manejados por `auth.users` de Supabase + tabla `perfiles` (vinculadas 1:1).
- **Alumnos**: tabla `alumnos` (solo lectura desde la app).
- **Informes**: tabla `informes` con RLS por rol.
- **Realtime**: suscripción a cambios en `informes` para actualización en tiempo real.

#### Sin Supabase
Si las credenciales de Supabase no están configuradas, la app muestra el login pero **no permite autenticación**. Toda la funcionalidad requiere una sesión activa de Supabase Auth.

### Módulos funcionales

El código JavaScript está organizado en módulos ES dentro de `src/`:

1. **`src/main.js`** — Punto de entrada. Importa los demás módulos, inicializa la app (`DOMContentLoaded`), configura event listeners globales y la suscripción realtime de Supabase.
2. **`src/config.js`** — Lee `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, valida que sean URLs/claves reales, y exporta `USE_SUPABASE` (booleano) y `supabaseClient`.
3. **`src/db.js`** — Capa de acceso a datos (legacy, no se usa en la app actual):
   - El entry point `main.js` contiene su propia lógica de datos.
   - `cargarAlumnos()`, `cargarInformes()`, `cargarUsuariosSupa()` consultan Supabase directamente.
   - Helpers: `getAlumno()`, `getInforme()`, `getNombreUsuario()`.
4. **`src/auth.js`** — Autenticación y sesión (Supabase únicamente):
   - `doLogin()`: autentica mediante `supabaseClient.auth.signInWithPassword` y carga el perfil desde la tabla `perfiles`.
   - `restoreSession()`: restaura la sesión desde `supabaseClient.auth.getSession()` y carga el perfil correspondiente.
   - `doLogout()` / `clearSession()`: cierra la sesión de Supabase Auth.
   - `updateAuthUI()`, `setupLoginForm()`, `setupLoginBanner()`.
5. **`src/app.js`** — Núcleo funcional de la aplicación:
   - Navegación: `showSection()`, `toggleSidebar()`.
   - Utilidades: `formatearFecha()`, `formatearFechaCorta()`, `generarId()`, `mostrarToast()`.
   - Alumnos: `buscarAlumno()` (con debounce de 300 ms en `main.js`), `seleccionarAlumno()`, `limpiarAlumno()`.
   - Informes: `filtrarInformes()`, `renderizarInformes()`, `guardarInforme()`, `editarInforme()`.
   - Detalle y acciones: `verDetalle()`, `cambiarEstado()`, `mostrarRechazo()`, `confirmarRechazo()`, `cerrarModal()`.
6. **`src/dashboard.js`** — `actualizarDashboard()`: contadores de estados, gráfico de dona (gravedad), actividad reciente.
7. **`src/estadisticas.js`** — `cargarEstadisticas()`: gráficos de barras (por curso), torta (por tipo de falta), línea (tendencia mensual), tabla top alumnos.
8. **`src/usuarios.js`** — `cargarUsuarios()`, `crearUsuario()`, `toggleUsuario()`. Solo visible para rol `regente`.
9. **`src/alumno.js`** — `verAlumno()`: resumen individual con historial de informes y gráfico de dona.
10. **`src/pdf.js`** — `exportarPDF()`: generación dinámica de HTML para `html2pdf.js`.
11. **`src/styles.css`** — Directivas Tailwind (`@tailwind`) + clases custom (`status-*`, `instancia-*`, `animate-*`).

### Control de acceso basado en roles (RBAC)

| Rol | Permisos |
|-----|----------|
| `regente` | Acceso total: ver todos los informes, aprobar/rechazar/reactivar, gestión de usuarios, ver sección "Usuarios" en sidebar, ver Dashboard y Estadísticas. |
| `docente` / `preceptor` | Solo ver y crear/editar sus propios informes. No pueden editar informes aprobados. No ven Dashboard ni Estadísticas. |

La UI oculta elementos según el rol mediante clases CSS `hidden` y condicionales en el renderizado. En modo Supabase, las políticas RLS refuerzan estas restricciones en el servidor.

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

### Configuración de Supabase (opcional)

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

Los usuarios de demostración deben crearse directamente en el panel de **Supabase Dashboard → Authentication → Users**, o mediante la API de administración de Supabase. El trigger `handle_new_user()` en `supabase.sql` genera automáticamente el perfil en la tabla `perfiles` al crear un usuario en `auth.users`.

> ⚠️ **No se admite modo demo local.** La autenticación funciona exclusivamente con Supabase Auth.

### Convenciones de código

- Todo el código (variables, funciones, comentarios, logs) está en español.
- Funciones nombradas con `camelCase` descriptivo (ej. `formatearFecha`, `cambiarEstado`).
- IDs de elementos DOM utilizan `camelCase` o `snake_case` indistintamente.
- Clases CSS personalizadas definidas en `src/styles.css` con prefijos semánticos:
  - `status-*` para badges de estado (`pendiente`, `aprobado`, `rechazado`, etc.)
  - `instancia-*` para bordes laterales según gravedad (`leve`, `grave`, `muy_grave`)
  - `animate-*` para animaciones (`fade-in`, `slide-out`, `pop`, `shake`)
- Logs de consola prefijados con `[GIE]` y emoji para facilitar el debugging.
- Las funciones usadas en atributos `onclick` del HTML deben exponerse explícitamente a `window` (ver `main.js` y `app.js` donde se asignan a `window.*`).

## Testing

**No hay tests automatizados** (unitarios, de integración ni E2E). La verificación se realiza manualmente abriendo la aplicación en el navegador.

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

- Si se agrega nueva funcionalidad, mantener el patrón de módulos ES en `src/`. Colocar la lógica en el archivo más apropiado según el dominio (auth, db, app, dashboard, etc.).
- No utilizar `localStorage` para autenticación ni sesión. La auth es exclusivamente Supabase.
- Respetar el sistema de roles (`regente`, `docente`, `preceptor`) al implementar nuevas pantallas o acciones.
- Las fechas se formatean para la locale `es-AR` (día/mes/año).
- Las nuevas dependencias de frontend deben instalarse vía `npm install` y importarse como ES modules.
- Las funciones usadas en `onclick` del HTML deben exponerse explícitamente a `window` (ej. `window.verDetalle = verDetalle;`).
- Al modificar el schema de datos, actualizar tanto `supabase.sql` como los datos de demo en `src/db.js` y `seed.sql`.
