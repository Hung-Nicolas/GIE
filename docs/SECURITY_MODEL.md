# 🛡️ Modelo de Seguridad y Control de Acceso (RBAC & RLS) — GIE

Este documento describe la arquitectura de seguridad, control de acceso basado en roles (RBAC) y políticas de **Row Level Security (RLS)** implementadas en PostgreSQL sobre Supabase para la plataforma **GIE (Gestor de Informes Escolares)**.

---

## 1. Principio de Defensa en Profundidad

La plataforma GIE implementa una estrategia de **Defensa en Profundidad**:
1. **Frontend (UI Gating):** La interfaz de usuario adapta los botones y vistas según el rol (`esRegente()`), proporcionando una experiencia limpia y libre de ruido.
2. **Backend (PostgreSQL RLS):** La seguridad y validez de negocio se auditan estrictamente en el motor de base de datos. Ningún usuario puede auto-elevar privilegios, consultar datos de estudiantes de forma anónima ni alterar informes aprobados, aun interactuando directamente contra la API REST (`PostgREST`).

---

## 2. Jerarquía de Roles y Helper `es_regente_db()`

En base de datos, los roles con capacidad directiva completa se determinan mediante la función `SECURITY DEFINER` `public.es_regente_db()`:

```sql
SELECT public.es_regente_db(); -- Retorna TRUE si el usuario auth.uid() posee rol directivo activo
```

Roles directivos contemplados:
- `regente`, `subregente`, `rector`, `vicerector`, `jefe_de_taller`.

---

## 3. Matriz de Políticas RLS por Tabla

| Tabla | Rol `anon` | Rol `docente` / `pat` | Rol `regente` (Directivo) |
|---|:---:|---|---|
| `perfiles` | ❌ Bloqueado | Lectura general; Edición solo de contacto propio (sin mutar `rol`) | Acceso y gestión total |
| `alumnos` | ❌ Bloqueado | Lectura del padrón autenticado | Modificación / sincronización total |
| `informes` | ❌ Bloqueado | Creación en `pendiente`; Edición de informes propios pendientes/anulados | Aprobación, derivación, archivo y edición total |
| `observaciones_alumno` | ❌ Bloqueado | Inserción con `autor_id = auth.uid()` | Inserción y consulta total |

---

## 4. Guía de Ejecución de Migraciones

Las migraciones de seguridad se encuentran en `supabase/migrations/`:
1. `20260911000001_security_hardening_rls.sql`: Funciones de seguridad, RLS de tablas maestras, constraints de longitud y secuencia.
2. `20260911000002_fix_rpcs_security.sql`: Corrección de lógica de derivación (`devolver_informe_a_pendiente`) y protección de sincronización (`recibir_informe_nexus`).

Para aplicarlas en Supabase:
1. Copiar y pegar el contenido en el **SQL Editor** del dashboard de Supabase.
2. O ejecutar vía CLI: `supabase db push`.

---

## 5. Ejecución de Tests de Seguridad

Dentro del repositorio, correr:
```bash
python3 tests/test_backend_security.py
python3 tests/test_legitimate_workflows.py
```
