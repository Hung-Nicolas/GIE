# 🧠 Plantilla de Contexto para Agentes de Código

> Copiar este archivo en la raíz del próximo proyecto (como `AGENTS.md`) y completar las secciones marcadas con `[COMPLETAR]`.
> Esto permite que el agente de código entienda la arquitectura, convenciones y restricciones sin necesidad de exploración previa.
>
> **Ejemplo real completado:** Este archivo refleja el stack de **GIE v1.5.4** (Gestor de Informes Escolares).

---

## 1. Visión General

| Campo | Valor |
|-------|-------|
| **Nombre del proyecto** | GIE — Gestor de Informes Escolares |
| **Tipo de app** | SPA (Single Page Application) de solo cliente |
| **Idioma del código/UI** | Español |
| **Arquitectura** | Monolito frontend (`src/main.js` ~3600 líneas) |
| **Backend** | Terceros — Supabase (PostgreSQL + Auth + Realtime) |

### Descripción en 2 líneas
Aplicación web para que docentes y preceptores creen informes disciplinarios/académicos sobre alumnos; regentes revisan, aprueban o rechazan; DOE visualiza informes derivados en modo lectura + observaciones. Incluye dashboard con estadísticas, calendario de reuniones, gestión de usuarios, exportación a PDF y plantillas de informes.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión (si aplica) | Origen |
|------|-----------|---------------------|--------|
| Bundler / Dev server | Vite | 5.4.10 | npm |
| Framework frontend | JavaScript vanilla (ES modules) | — | `src/main.js` |
| Estilos | Tailwind CSS v3 + PostCSS 8 + Autoprefixer 10 | 3.4.14 | npm |
| Iconografía | Font Awesome 6 | 6.4.0 | CDN (cdnjs) |
| Tipografía | Inter (Google Fonts) | — | CDN |
| Gráficos / Charts | Chart.js | v4.4.6 | npm |
| Exportación PDF | html2pdf.js | v0.10.2 | npm |
| Backend / Auth / DB | Supabase | `@supabase/supabase-js` v2.104.0 | npm |
| Testing | Ninguno (pruebas manuales) | — | — |
| CI / Deploy | GitHub Actions → GitHub Pages | — | `.github/workflows/deploy.yml` |

### Scripts npm importantes

```bash
npm run dev      # Servidor de desarrollo con hot reload (puerto 3000)
npm run build    # Build de producción en dist/ (sourcemap habilitado)
npm run preview  # Previsualizar build de producción localmente
```

---

## 3. Estructura del Proyecto

```
.
├── index.html                   # Entry point HTML (estructura completa de la SPA, ~1400 líneas)
├── package.json                 # Dependencias npm (versión 1.5.4, type: module)
├── vite.config.js               # Configuración de Vite (base: '/GIE/', puerto 3000, outDir: 'dist')
├── tailwind.config.js           # Configuración de Tailwind CSS (content: index.html + src/**/*)
├── postcss.config.js            # Configuración de PostCSS (tailwindcss + autoprefixer)
├── .env                         # Variables de entorno (Supabase) — NO versionar
├── .gitignore                   # Ignora node_modules/, dist/, .env, etc.
├── AGENTS.md                    # Este archivo
├── TESTING.md                   # Plan de pruebas manual
├── supabase.sql                 # Schema SQL completo para Supabase (tablas, RLS, triggers, funciones RPC, datos demo)
├── seed.sql                     # Datos de demostración para Supabase (40 alumnos, 5 categorías, ~60 informes)
├── temp.sql                     # Migración de producción (columnas nuevas, funciones RPC)
├── src/
│   ├── main.js                  # Punto de entrada JS y ÚNICO módulo activo (~3600 líneas, monolito)
│   ├── config.js                # Cliente Supabase y flag USE_SUPABASE
│   ├── auth.js                  # Autenticación: login, logout, restauración de sesión, helpers de UI
│   ├── styles.css               # Tailwind directives + estilos custom (status-, instancia-, animate-, skeleton-)
│   ├── app.js                   # LEGACY — No se utiliza (importa src/db.js que no existe)
│   ├── dashboard.js             # LEGACY — No se utiliza
│   ├── estadisticas.js          # LEGACY — No se utiliza
│   ├── usuarios.js              # LEGACY — No se utiliza
│   ├── alumno.js                # LEGACY — No se utiliza
│   ├── pdf.js                   # LEGACY — No se utiliza
│   └── informes.js              # LEGACY — No se utiliza
├── dist/                        # Build de producción (generado por Vite)
├── .github/workflows/deploy.yml # GitHub Actions: build + deploy a GitHub Pages
└── supabase/                    # Configuración de Supabase CLI (functions, config.toml)
```

### Archivos Legacy / No usados
> **Importante:** Listar explícitamente archivos que existen en el repo pero NO deben modificarse ni reactivarse.

- `src/app.js`, `src/dashboard.js`, `src/estadisticas.js`, `src/usuarios.js`, `src/alumno.js`, `src/pdf.js`, `src/informes.js` — LEGACY, no se utilizan. Importan `src/db.js` que **no existe**.
- **No existe `src/db.js`**. No crearlo ni modificar referencias a él en los archivos legacy.

---

## 4. Variables de Entorno

Vite expone al frontend solo variables que empiezan con `VITE_`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

> Si estas variables no están definidas o son inválidas, la app muestra un banner de error en el login y **no permite la autenticación** porque la auth requiere Supabase. No existe un modo demo local funcional.

---

## 5. Arquitectura y Patrones de Código

### Punto de entrada
`index.html` carga únicamente `/src/main.js` como módulo ES. Desde allí se importan:
- `src/config.js` — Cliente Supabase y flag `USE_SUPABASE`
- `src/auth.js` — Estado de sesión, login/logout, helpers de UI
- `src/styles.css` — Estilos
- `chart.js/auto` y `html2pdf.js` — dependencias npm

### Estado global
- Variables globales en el scope de `main.js`: `alumnos[]`, `informes[]`, `usuarios[]`, `categorias[]`, `plantillas[]`
- Objeto `charts` para instancias de Chart.js
- Variables de calendario (`calCurrentDate`, `calSelectedDate`)
- `tabInformesActivo`, `tabAlumnosActivo`, `periodoTendenciaDias`

### Persistencia de datos
- **Base de datos**: PostgreSQL (Supabase)
- **Tablas principales**: `auth.users` + `public.perfiles` (1:1), `public.alumnos`, `public.categorias`, `public.informes`, `public.plantillas`, `public.historial_informes`
- **Auth**: Email + password (Supabase Auth). En el dashboard de Supabase se desactiva "Confirm email".
- **Sesión**: `sessionStorage` (no `localStorage`).
- **Realtime**: Suscripción al canal `informes_changes` de Supabase. Cualquier cambio en `informes` recarga los datos y refresca las vistas activas.

### Funciones RPC (SECURITY DEFINER)
- `actualizar_password_usuario(user_id UUID, new_password TEXT)` — regente cambia contraseñas.
- `listar_usuarios_completos()` — LEFT JOIN de `auth.users` + `perfiles`.
- `sincronizar_perfil(...)` — upsert manual de perfil (acepta `cursos TEXT[]`, `alumnos_pat UUID[]`).
- `eliminar_usuario_completo(user_id UUID)` — elimina usuario de `auth.users` (y perfiles por CASCADE).
- `obtener_espacio_bd()` — retorna tamaño de la base de datos.

### Exposición global (window)
> Si el HTML usa `onclick="miFuncion()"`, esas funciones DEBEN exponerse a `window` en el entry point.

```javascript
window.verDetalle = verDetalle;
window.verAlumno = verAlumno;
window.verDocente = verDocente;
window.editarInforme = editarInforme;
window.cambiarEstado = cambiarEstado;
window.cerrarModal = cerrarModal;
window.cerrarModalGrupo = cerrarModalGrupo;
// ... etc.
```

---

## 6. Control de Acceso (RBAC)

| Rol | Permisos |
|-----|----------|
| `regente` | Acceso total: ver todos los informes, aprobar/rechazar/reactivar, gestión de usuarios (crear/editar/eliminar), ver Dashboard, Estadísticas, Docentes y administrar plantillas. |
| `docente` / `preceptor` | Solo ver y crear/editar sus propios informes. No pueden editar informes aprobados. No ven Dashboard, Estadísticas, Docentes ni la sección Usuarios. |
| `doe` | Solo lectura: ver **solo informes derivados**, agregar observaciones, pasar a `pendiente`. No puede crear, editar, eliminar ni cambiar otros estados. No ve Dashboard, Estadísticas, Docentes ni Usuarios. |
| `pat` | Docente + extras: crear/editar sus propios informes, ver informes de otros sobre sus `alumnos_pat`, ver todos los alumnos (tiene tabs "Todos", "Mis cursos", "Mis alumnos"), puede tener cursos asignados + lista `alumnos_pat`. |

- La UI oculta elementos mediante clases CSS `hidden` y condicionales en el renderizado.
- Las restricciones se refuerzan en el servidor mediante **RLS** (Row Level Security) en Supabase.

---

## 7. Convenciones de Código

### Idioma
- Código (variables, funciones, comentarios, logs): **español**
- UI (textos visibles al usuario): **español**

### Nomenclatura
| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Funciones | `camelCase` descriptivo | `guardarInforme`, `filtrarAlumnos`, `actualizarDashboard` |
| Variables | `camelCase` | `tabInformesActivo`, `misAlumnosPAT` |
| IDs de DOM | `camelCase` o `snake_case` | `filtroBusqueda`, `btn-cerrar-modal` |
| Clases CSS custom | prefijo semántico | `status-pendiente`, `instancia-leve`, `animate-fade-in`, `skeleton-text` |
| Constantes globales | `SCREAMING_SNAKE_CASE` | `PLANTILLAS_INFORME` |

### Logs de consola
- Prefijo obligatorio: `[GIE]`
- Usar emoji para diferenciar: ✅ ❌ ⚠️ 🔄

### Fechas
- Locale de formateo: `es-AR`
- Formato preferido: `dd/mm/yyyy` (hora incluida cuando aplica)

---

## 8. UX / Animaciones

| Animación | Clase CSS | Uso |
|-----------|-----------|-----|
| Entrada escalonada | `animate-enter` + `animate-delay-*` (100–600ms) | Tarjetas del dashboard |
| Scroll reveal | `card-scroll` + `IntersectionObserver` | Repite animación al subir/bajar |
| Slide-out | `animate-slide-out` | Al aprobar/rechazar informes desde listas |
| Pop / Shake | `animate-pop`, `animate-shake` | Checkmarks, validaciones |
| Spinner de carga | `btn-spinner` | Botones async |
| Skeletons | `skeleton`, `skeleton-text`, `skeleton-card` | Estados de carga |

- ¿Se usan `IntersectionObserver` para scroll reveal? **Sí**
- ¿Hay debounce en búsquedas? **Sí, 300ms** en `buscarAlumno`

---

## 9. Reglas de Oro para el Agente

1. **No crear archivos legacy**: Si un archivo está marcado como legacy/no usado, no modificarlo ni reactivarlo.
2. **No inventar dependencias**: Instalar todo vía `npm install`. No usar CDNs no listados sin consultar.
3. **Respetar el monolito**: `src/main.js` es intencionalmente monolítico. Agregar funcionalidad en la sección correspondiente.
4. **Exponer funciones a window**: Cualquier función llamada desde `onclick` del HTML debe asignarse a `window`.
5. **No usar localStorage para auth**: La sesión usa `sessionStorage`. Mantenerlo así.
6. **Idioma consistente**: Todo en español (código, comentarios, UI).
7. **Minimalismo**: Hacer el cambio más pequeño posible que cumpla el requerimiento.
8. **Actualizar SQL/schema**: Si se modifica el modelo de datos, actualizar `supabase.sql`, `seed.sql` y `temp.sql`.
9. **No existe `src/db.js`**: No crearlo ni intentar reactivar archivos legacy sin refactorización previa.

---

## 10. Testing

- **¿Hay tests automatizados?** No.
- **Verificación**: Manual abriendo la aplicación en el navegador.
- **Archivo de plan de pruebas**: `TESTING.md`

---

## 11. Deploy

### Build local
```bash
npm run build
```

### CI/CD
- **Plataforma**: GitHub Actions → GitHub Pages
- **Trigger**: Push a `main` o manual (`workflow_dispatch`)
- **Secrets necesarios**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

---

## 12. Checklist de Inicio de Proyecto

Antes de pedir al agente que desarrolle una feature, asegurarse de que estén definidos:

- [x] Stack tecnológico decidido y versiones fijadas.
- [x] Estructura de carpetas establecida.
- [x] `.env` de ejemplo creado (`.env.example`).
- [x] Schema de base de datos definido (`supabase.sql`).
- [x] Sistema de roles y permisos aclarado.
- [x] Convenciones de nomenclatura documentadas.
- [x] Guía de estilos (colores, tipografía, espaciado) definida.
- [ ] Plan de testing acordado.
- [x] Estrategia de deploy definida.

---

> **Nota final**: Este archivo vive en el repo y debe actualizarse cuando cambien decisiones arquitectónicas, dependencias o convenciones. Un `AGENTS.md` desactualizado es peor que no tenerlo.
