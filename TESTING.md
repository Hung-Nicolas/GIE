# 🧪 Plan de Pruebas - GIE

## 1. AUTENTICACIÓN

### 1.1 Login exitoso
- **Paso**: Ingresar `test@gie.com` / `test1234`
- **Esperado**: Accede al dashboard, muestra nombre del usuario en sidebar

### 1.2 Login fallido
- **Paso**: Ingresar mail inexistente o contraseña incorrecta
- **Esperado**: Toast rojo "Credenciales inválidas", no accede

### 1.3 Sesión persistente
- **Paso**: Loguearse → cerrar pestaña → volver a abrir la URL
- **Esperado**: Sigue logueado (sesión en sessionStorage + Supabase)

### 1.4 Logout
- **Paso**: Clickear "Cerrar sesión"
- **Esperado**: Vuelve al login, se borra la sesión

### 1.5 Usuario desactivado
- **Paso**: Desactivar un usuario desde la sección Usuarios → intentar loguear con ese usuario
- **Esperado**: Toast "Usuario desactivado"

---

## 2. DASHBOARD

### 2.1 Calendario
- **Paso**: Clickear flechas de mes anterior/siguiente
- **Esperado**: Cambia el mes, días con informes tienen puntos de color

### 2.2 Próximas reuniones (pendientes)
- **Paso**: Revisar que muestre solo informes con estado "pendiente"
- **Esperado**: Lista scrollable dentro de la tarjeta (altura fija 480px)

### 2.3 Pendientes de revisión
- **Paso**: Revisar que muestre informes pendientes ordenados por fecha
- **Esperado**: Botones "Aprobar" y "Rechazar" funcionan, animación slide-out al aprobar

### 2.4 Historial reciente
- **Paso**: Scrollear la lista
- **Esperado**: Muestra últimos informes de todos los estados

### 2.5 Gráfico de gravedad (doughnut)
- **Paso**: Mirar el gráfico circular
- **Esperado**: Muestra proporción leve/grave/muy_grave, no se expande al clickear

---

## 3. INFORMES

### 3.1 Crear informe
- **Paso**: Ir a "Nuevo" → completar formulario → Guardar
- **Esperado**: Aparece en lista con estado "pendiente", toast verde

### 3.2 Crear informe desde plantilla
- **Paso**: Seleccionar plantilla del dropdown → campos se autocompletan
- **Esperado**: Título, instancia y resumen se llenan automáticamente

### 3.3 Editar informe (solo si es tuyo o sos regente)
- **Paso**: Clickear "Editar" en un informe pendiente
- **Esperado**: Formulario carga datos, al guardar se actualiza

### 3.4 No editar informe aprobado
- **Paso**: Intentar editar un informe con estado "aprobado"
- **Esperado**: Toast "No se puede editar un informe aprobado"

### 3.5 Eliminar informe
- **Paso**: Clickear "Eliminar" en un informe propio
- **Esperado**: Confirmación, desaparece de la lista

### 3.6 Filtrar informes
- **Paso**: Usar filtros de estado, tipo, instancia, fechas
- **Esperado**: Lista se actualiza en tiempo real

### 3.7 Buscar informes
- **Paso**: Escribir nombre de alumno en el buscador
- **Esperado**: Filtra por nombre/apellido del alumno

### 3.8 Aprobar informe (regente)
- **Paso**: Clickear "Aprobar" en un pendiente
- **Esperado**: Estado cambia a "aprobado", aparece revisor, animación slide-out

### 3.9 Rechazar informe (regente)
- **Paso**: Clickear "Rechazar" → escribir motivo → Confirmar
- **Esperado**: Estado cambia a "rechazado", aparece motivo, animación

### 3.10 Exportar PDF
- **Paso**: Clickear "Descargar PDF" en un informe
- **Esperado**: Se descarga archivo PDF con formato correcto

---

## 4. ALUMNOS

### 4.1 Listar alumnos
- **Paso**: Ir a "Alumnos"
- **Esperado**: Lista ordenada por cantidad de informes (descendente)

### 4.2 Filtrar por grado
- **Paso**: Seleccionar "6°" en el filtro
- **Esperado**: Solo muestra alumnos de 6°

### 4.3 Filtrar por división
- **Paso**: Seleccionar "1" en el filtro
- **Esperado**: Solo muestra alumnos de división 1

### 4.4 Buscar alumno
- **Paso**: Escribir "Barreto" en el buscador
- **Esperado**: Filtra por nombre o apellido

### 4.5 Ver detalle de alumno
- **Paso**: Clickear un alumno
- **Esperado**: Muestra gráfico circular + historial de informes, botón "Volver"

### 4.6 Volver desde detalle
- **Paso**: Clickear "Volver"
- **Esperado**: Vuelve a la lista de alumnos

---

## 5. ESTADÍSTICAS

### 5.1 Gráfico de barras (informes por grado)
- **Paso**: Mirar el gráfico de barras
- **Esperado**: Barras por grado 1° a 7°, se ven proporciones correctas

### 5.2 Drill-down por división
- **Paso**: Clickear una barra (ej: "6°")
- **Esperado**: Aparece panel abajo con desglose 6°1: X, 6°2: Y

### 5.3 Gráfico de torta (tipos de falta)
- **Paso**: Mirar gráfico circular
- **Esperado**: Proporciones de Disciplina/Conducta/Asistencia/Académica/Otra

### 5.4 Gráfico de línea (tendencia)
- **Paso**: Mirar gráfico de línea
- **Esperado**: Línea de informes por mes, no se rompe el layout

### 5.5 Top alumnos
- **Paso**: Revisar tabla "Alumnos con más informes"
- **Esperado**: Ordenados por cantidad, botón "Ver" lleva al detalle

---

## 6. USUARIOS (solo regente)

### 6.1 Crear usuario
- **Paso**: Completar formulario → Guardar
- **Esperado**: Aparece en lista, puede loguearse

### 6.2 Validar email duplicado
- **Paso**: Crear usuario con email ya existente
- **Esperado**: Toast "El email ya está registrado"

### 6.3 Validar contraseña corta
- **Paso**: Crear usuario con contraseña de 3 caracteres
- **Esperado**: Toast "La contraseña debe tener al menos 6 caracteres"

### 6.4 Editar usuario
- **Paso**: Clickear "Editar", cambiar nombre/rol, guardar
- **Esperado**: Se actualiza en la lista

### 6.5 Cambiar contraseña
- **Paso**: Editar usuario → ingresar nueva contraseña → guardar
- **Esperado**: El usuario puede loguearse con la nueva contraseña

### 6.6 Desactivar usuario
- **Paso**: Destildar "Activo" en editar → guardar
- **Esperado**: Usuario no puede loguearse

### 6.7 Eliminar usuario
- **Paso**: Clickear "Eliminar" → confirmar
- **Esperado**: Fila se va con animación slide-out, desaparece de lista

### 6.8 No eliminar regente
- **Paso**: Intentar eliminar a otro regente
- **Esperado**: Toast "No se puede eliminar a un usuario con rol regente"

---

## 7. PLANTILLAS

### 7.1 Crear plantilla
- **Paso**: Ir a Plantillas → completar título, instancia, resumen → Guardar
- **Esperado**: Aparece en lista y en el dropdown de "Nuevo informe"

### 7.2 Usar plantilla
- **Paso**: Ir a "Nuevo" → seleccionar plantilla del dropdown
- **Esperado**: Campos se autocompletan

### 7.3 Eliminar plantilla
- **Paso**: Clickear "Eliminar" en una plantilla
- **Esperado**: Desaparece de la lista

---

## 8. ROLES Y PERMISOS

### 8.1 Docente solo ve sus informes
- **Paso**: Loguear como docente → ir a "Informes"
- **Esperado**: Solo ve informes que él creó

### 8.2 Docente no ve sección Usuarios
- **Paso**: Loguear como docente
- **Esperado**: Botón "Usuarios" no aparece en el sidebar

### 8.3 Preceptor puede crear/ver
- **Paso**: Loguear como preceptor
- **Esperado**: Puede crear informes, no puede aprobar/rechazar

### 8.4 Regente ve todo
- **Paso**: Loguear como regente
- **Esperado**: Ve todos los informes, puede aprobar/rechazar, ve Usuarios

---

## 9. RESPONSIVE / UI

### 9.1 Mobile
- **Paso**: Abrir en modo responsive (Ctrl+Shift+M) o en celular
- **Esperado**: Sidebar se colapsa en hamburguesa, gráficos no se rompen

### 9.2 Tarjetas del dashboard
- **Paso**: Verificar que "Próximas reuniones" y "Pendientes" tengan misma altura
- **Esperado**: Ambas miden 480px, scroll interno si hay muchos items

### 9.3 Vista alumno
- **Paso**: Entrar a detalle de un alumno con muchos informes
- **Esperado**: Gráfico + historial en grid 50/50, no se desborda

---

## ✅ CHECKLIST RÁPIDO

- [ ] Login con cada rol (regente, docente, preceptor)
- [ ] Crear informe con cada tipo de falta
- [ ] Aprobar y rechazar informes
- [ ] Verificar que los PDF se descargan bien
- [ ] Crear, editar y eliminar un usuario
- [ ] Cambiar contraseña de usuario
- [ ] Verificar duplicados de alumnos/informes
- [ ] Revisar en móvil
- [ ] Revisar que no haya console.log en producción
- [ ] Revisar que no haya errores 404 de recursos críticos
