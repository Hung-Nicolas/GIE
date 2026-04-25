# 🧠 Plantilla de Contexto para Agentes de Código

> Copiar este archivo en la raíz del próximo proyecto (como `AGENTS.md`) y completar las secciones marcadas con `[COMPLETAR]`.
> Esto permite que el agente de código entienda la arquitectura, convenciones y restricciones sin necesidad de exploración previa.

---

## 1. Visión General

| Campo | Valor |
|-------|-------|
| **Nombre del proyecto** | `[COMPLETAR]` |
| **Tipo de app** | `[COMPLETAR: SPA / SSR / API REST / CLI / etc.]` |
| **Idioma del código/UI** | `[COMPLETAR: español / inglés / ambos]` |
| **Arquitectura** | `[COMPLETAR: monolito / modular / micro-frontends / etc.]` |
| **Backend** | `[COMPLETAR: serverless / propio / terceros (Supabase, Firebase, etc.) / ninguno]` |

### Descripción en 2 líneas
`[COMPLETAR: Qué hace la app y quién la usa.]`

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión (si aplica) | Origen |
|------|-----------|---------------------|--------|
| Bundler / Dev server | `[COMPLETAR: Vite / Webpack / Parcel / etc.]` | `[COMPLETAR]` | npm |
| Framework frontend | `[COMPLETAR: vanilla JS / React / Vue / Svelte / etc.]` | `[COMPLETAR]` | npm |
| Estilos | `[COMPLETAR: Tailwind / Bootstrap / SASS / CSS puro / etc.]` | `[COMPLETAR]` | npm / CDN |
| Iconografía | `[COMPLETAR: Font Awesome / Heroicons / Lucide / etc.]` | `[COMPLETAR]` | CDN / npm |
| Tipografía | `[COMPLETAR: Inter / Roboto / etc.]` | — | CDN / local |
| Gráficos / Charts | `[COMPLETAR: Chart.js / D3 / Recharts / etc.]` | `[COMPLETAR]` | npm |
| Exportación PDF | `[COMPLETAR: html2pdf.js / jsPDF / etc.]` | `[COMPLETAR]` | npm |
| Backend / Auth / DB | `[COMPLETAR: Supabase / Firebase / custom API / etc.]` | `[COMPLETAR]` | npm |
| Testing | `[COMPLETAR: Jest / Vitest / Cypress / Playwright / ninguno]` | `[COMPLETAR]` | npm |
| CI / Deploy | `[COMPLETAR: GitHub Actions / Vercel / Netlify / etc.]` | — | — |

### Scripts npm importantes

```bash
npm run dev      # [COMPLETAR: qué hace y en qué puerto]
npm run build    # [COMPLETAR: output folder]
npm run preview  # [COMPLETAR]
npm run test     # [COMPLETAR]
```

---

## 3. Estructura del Proyecto

```
.
├── index.html              # [COMPLETAR: entry point / template]
├── package.json
├── vite.config.js          # [COMPLETAR: o webpack, rollup, etc.]
├── tailwind.config.js      # [COMPLETAR: si aplica]
├── postcss.config.js       # [COMPLETAR: si aplica]
├── .env                    # [COMPLETAR: variables de entorno — NO versionar]
├── .gitignore
├── AGENTS.md               # Este archivo
├── src/
│   ├── main.js             # [COMPLETAR: entry point JS]
│   ├── config.js           # [COMPLETAR: clientes de servicios externos, flags]
│   ├── auth.js             # [COMPLETAR: lógica de autenticación]
│   ├── styles.css          # [COMPLETAR: tailwind + custom]
│   └── [COMPLETAR: resto de módulos]
├── dist/                   # Build de producción
└── .github/workflows/      # CI/CD
```

### Archivos Legacy / No usados
> **Importante:** Listar explícitamente archivos que existen en el repo pero NO deben modificarse ni reactivarse.

- `[COMPLETAR: ej. src/dashboard.js (legacy, no importar)]`
- `[COMPLETAR: ej. src/db.js (no existe, no crear)]`

---

## 4. Variables de Entorno

Vite expone al frontend solo variables que empiezan con `VITE_`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co         # [ADAPTAR]
VITE_SUPABASE_ANON_KEY=eyJ...                             # [ADAPTAR]
```

> Si las variables no están definidas, la app debe `[COMPLETAR: mostrar error / fallback a demo / no permitir auth]`.

---

## 5. Arquitectura y Patrones de Código

### Punto de entrada
`[COMPLETAR: index.html carga X, que importa Y y Z]`

### Estado global
- `[COMPLETAR: ¿dónde vive el estado? ¿Variables globales? ¿Store?]`
- `[COMPLETAR: ¿hay un estado compartido entre secciones?]`

### Persistencia de datos
- **Base de datos**: `[COMPLETAR: PostgreSQL / Firestore / Mongo / etc.]`
- **Tablas/colecciones principales**: `[COMPLETAR: listar]`
- **Auth**: `[COMPLETAR: email+password / OAuth / magic links / etc.]`
- **Sesión**: `[COMPLETAR: localStorage / sessionStorage / cookies / memory]`
- **Realtime**: `[COMPLETAR: ¿hay WebSockets / SSE / Supabase Realtime?]`

### Funciones RPC / API endpoints relevantes
- `[COMPLETAR: nombre_función — qué hace]`

### Exposición global (window)
> Si el HTML usa `onclick="miFuncion()"`, esas funciones DEBEN exponerse a `window` en el entry point.

```javascript
// Ejemplo:
window.miFuncion = miFuncion;
```

---

## 6. Control de Acceso (RBAC)

| Rol | Permisos |
|-----|----------|
| `[COMPLETAR: regente / admin / etc.]` | `[COMPLETAR: acceso total, gestión de usuarios, etc.]` |
| `[COMPLETAR: docente / editor / etc.]` | `[COMPLETAR: crear/editar propios, no eliminar, etc.]` |
| `[COMPLETAR: visitante / viewer / etc.]` | `[COMPLETAR: solo lectura]` |

- La UI oculta elementos mediante `[COMPLETAR: clases CSS hidden / renderizado condicional / etc.]`
- Las restricciones se refuerzan en el servidor mediante `[COMPLETAR: RLS / middleware / etc.]`

---

## 7. Convenciones de Código

### Idioma
- Código (variables, funciones, comentarios, logs): `[COMPLETAR: español / inglés]`
- UI (textos visibles al usuario): `[COMPLETAR: español / inglés]`

### Nomenclatura
| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Funciones | `[COMPLETAR: camelCase / PascalCase / snake_case]` | `[COMPLETAR: guardarInforme / GuardarInforme / guardar_informe]` |
| Variables | `[COMPLETAR]` | `[COMPLETAR]` |
| IDs de DOM | `[COMPLETAR]` | `[COMPLETAR]` |
| Clases CSS custom | `[COMPLETAR: prefijo semántico?]` | `[COMPLETAR: status-pendiente, animate-fade-in]` |
| Constantes globales | `[COMPLETAR]` | `[COMPLETAR: PLANTILLAS_INFORME]` |

### Logs de consola
- Prefijo obligatorio: `[COMPLETAR: ej. [GIE]]`
- Usar emoji para diferenciar: `[COMPLETAR: ✅ ❌ ⚠️ 🔄]`

### Fechas
- Locale de formateo: `[COMPLETAR: es-AR / en-US / ISO]`
- Formato preferido: `[COMPLETAR: dd/mm/yyyy / yyyy-mm-dd / etc.]`

---

## 8. UX / Animaciones

| Animación | Clase CSS | Uso |
|-----------|-----------|-----|
| `[COMPLETAR: entrada escalonada]` | `[COMPLETAR: animate-enter]` | `[COMPLETAR: tarjetas del dashboard]` |
| `[COMPLETAR: slide-out]` | `[COMPLETAR: animate-slide-out]` | `[COMPLETAR: al aprobar/rechazar]` |
| `[COMPLETAR: shake / error]` | `[COMPLETAR: animate-shake]` | `[COMPLETAR: validaciones]` |
| `[COMPLETAR: spinner de carga]` | `[COMPLETAR: btn-spinner]` | `[COMPLETAR: botones async]` |

- ¿Se usan `IntersectionObserver` para scroll reveal? `[COMPLETAR: sí / no]`
- ¿Hay debounce en búsquedas? `[COMPLETAR: sí, 300ms / no]`

---

## 9. Reglas de Oro para el Agente

1. **No crear archivos legacy**: Si un archivo está marcado como legacy/no usado, no modificarlo ni reactivarlo.
2. **No inventar dependencias**: Instalar todo vía `npm install`. No usar CDNs no listados sin consultar.
3. **Respetar el monolito modular**: Si el proyecto es monolítico (`main.js` grande), agregar funcionalidad en la sección correspondiente. Si es modular, crear archivos nuevos siguiendo la convención existente.
4. **Exponer funciones a window**: Cualquier función llamada desde `onclick` del HTML debe asignarse a `window`.
5. **No usar localStorage para auth**: Si la app usa `sessionStorage` para sesión, mantenerlo así.
6. **Idioma consistente**: No mezclar español/inglés si el proyecto establece uno.
7. **Minimalismo**: Hacer el cambio más pequeño posible que cumpla el requerimiento.
8. **Actualizar SQL/schema**: Si se modifica el modelo de datos, actualizar scripts SQL y seed.

---

## 10. Testing

- **¿Hay tests automatizados?** `[COMPLETAR: sí / no]`
- Si no hay, ¿cómo se verifica? `[COMPLETAR: manual en navegador / con script X]`
- Archivo de plan de pruebas: `[COMPLETAR: TESTING.md / ninguno]`

---

## 11. Deploy

### Build local
```bash
[COMPLETAR: npm run build && ...]
```

### CI/CD
- **Plataforma**: `[COMPLETAR: GitHub Pages / Vercel / Netlify / etc.]`
- **Trigger**: `[COMPLETAR: push a main / PR / manual]`
- **Secrets necesarios**: `[COMPLETAR: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, etc.]`

---

## 12. Checklist de Inicio de Proyecto

Antes de pedir al agente que desarrolle una feature, asegurarse de que estén definidos:

- [ ] Stack tecnológico decidido y versiones fijadas.
- [ ] Estructura de carpetas establecida.
- [ ] `.env` de ejemplo creado (`.env.example`).
- [ ] Schema de base de datos definido (si aplica).
- [ ] Sistema de roles y permisos aclarado.
- [ ] Convenciones de nomenclatura documentadas.
- [ ] Guía de estilos (colores, tipografía, espaciado) definida.
- [ ] Plan de testing acordado.
- [ ] Estrategia de deploy definida.

---

> **Nota final**: Este archivo vive en el repo y debe actualizarse cuando cambien decisiones arquitectónicas, dependencias o convenciones. Un `AGENTS.md` desactualizado es peor que no tenerlo.
