# GIE - Gestor de Informes Escolares

Aplicación web para la gestión de informes disciplinarios y académicos escolares. Permite a docentes y preceptores crear informes sobre conducta de alumnos, a los regentes revisar, aprobar o rechazar dichos informes, y al Departamento de Orientación Escolar (DOE) visualizarlos en modo solo lectura.

## 🚀 Tecnologías

- **Frontend:** HTML, JavaScript vanilla (ES modules), Tailwind CSS v3
- **Bundler:** Vite 5.4.10
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Gráficos:** Chart.js v4.4.6
- **Exportación PDF:** html2pdf.js v0.10.2
- **Iconografía:** Font Awesome 6.4.0
- **Tipografía:** Inter (Google Fonts)

## 📋 Requisitos previos

- [Node.js](https://nodejs.org/) (versión 22 o superior recomendada)
- Cuenta en [Supabase](https://supabase.com)

## ⚡ Instalación rápida

1. Clonar el repositorio e instalar dependencias:

```bash
npm install
```

2. Crear un archivo `.env` en la raíz del proyecto con las credenciales de Supabase:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

3. Ejecutar `supabase.sql` en el SQL Editor de Supabase para crear las tablas, políticas RLS, triggers y funciones RPC.

4. (Opcional) Ejecutar `seed.sql` para cargar datos de demostración.

5. En Supabase → Auth → Providers → Email, desactivar **"Confirm email"**.

6. En Supabase → Database → Replication → Realtime, agregar la tabla `informes` a la publicación `supabase_realtime`.

## 🔧 Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo (puerto 3000)
npm run build    # Build de producción en dist/
npm run preview  # Previsualizar build de producción localmente
```

## 👥 Roles de usuario

| Rol | Permisos |
|-----|----------|
| **Regente** | Acceso total: gestión de informes, usuarios, dashboard, estadísticas y plantillas. |
| **Docente / Preceptor** | Crear, ver y editar sus propios informes. |
| **DOE** | Visualización de informes derivados, archivados y anulados en modo solo lectura, con posibilidad de agregar observaciones. |

## 📁 Estructura del proyecto

```
.
├── index.html              # Punto de entrada de la SPA
├── src/
│   ├── main.js             # Lógica principal de la aplicación
│   ├── config.js           # Cliente Supabase
│   ├── auth.js             # Autenticación
│   └── styles.css          # Estilos personalizados
├── supabase.sql            # Schema completo de la base de datos
├── seed.sql                # Datos de demostración
└── .github/workflows/      # CI/CD para GitHub Pages
```

## 🚀 Despliegue

El proyecto incluye un workflow de GitHub Actions configurado para realizar build y deploy automático a GitHub Pages en cada push a la rama `main`.

Asegúrate de configurar los siguientes secrets en tu repositorio:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## ⚠️ Notas de seguridad

Este sistema está pensado como prototipo o demostración funcional. Si se desea utilizar con datos reales de producción, se recomienda realizar una auditoría de seguridad adicional.

## 📝 Licencia

Este proyecto es de uso interno y educativo.
