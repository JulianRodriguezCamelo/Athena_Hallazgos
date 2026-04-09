# Hallazgos ERO — Plan de Trabajo & Modelo de Base de Datos
**Fiduprevisora · Fecha:** 2026-04-06

---

## 1. MODELO RELACIONAL DE BASE DE DATOS

```
┌──────────────────────────────────┐
│             users                │
├──────────────────────────────────┤
│ PK  id              INTEGER      │
│     nombre          VARCHAR      │
│     email           VARCHAR(UQ)  │
│     password_hash   VARCHAR      │
│     rol             ENUM ──────────────── vicepresidente
│     vicepresidencia VARCHAR      │                       directivo
│     dependencia     VARCHAR      │                       tecnico
│     activo          BOOLEAN      │                       gestor
│     created_at      TIMESTAMP    │
│     updated_at      TIMESTAMP    │
└──────────────┬───────────────────┘
               │ 1
               │
               │ N
┌──────────────▼───────────────────┐
│         upload_history           │
├──────────────────────────────────┤
│ PK  id                 INTEGER   │
│ FK  uploaded_by_id     INTEGER ──┘
│     filename_original  VARCHAR   │
│     filename_stored    VARCHAR   │
│     total_registros    INTEGER   │
│     registros_exitosos INTEGER   │
│     registros_fallidos INTEGER   │
│     estado             ENUM ─────── procesando | completado | error
│     errores            TEXT      │
│     uploaded_at        TIMESTAMP │
└──────────────┬───────────────────┘
               │ 1
               │
               │ N
┌──────────────▼───────────────────────────────────────────────┐
│                          hallazgos                           │
├──────────────────────────────────────────────────────────────┤
│ PK  id                          INTEGER                      │
│ FK  upload_id                   INTEGER ──► upload_history   │
│     codigo_del_hallazgo         VARCHAR  (indexed)           │
│     descripcion                 TEXT                         │
│                                                              │
│  ── Fechas evento ──────────────────────────────────────     │
│     fecha_inicial_evento        DATETIME                     │
│     fecha_finalizacion_evento   DATETIME                     │
│                                                              │
│  ── Organización ──────────────────────────────────────      │
│     vicepresidencia             VARCHAR  (indexed)           │
│     dependencia_reporta_ero     VARCHAR  (indexed)           │
│     reportado_para              VARCHAR                      │
│     reportado_por               VARCHAR                      │
│                                                              │
│  ── Estado principal ──────────────────────────────────      │
│     estado                      VARCHAR  (indexed)           │
│     observaciones               TEXT                         │
│     aplicativo_afecta_ero       VARCHAR                      │
│                                                              │
│  ── Plan de Acción ────────────────────────────────────      │
│     id_plan_accion              VARCHAR  (indexed)           │
│     nombre_plan_accion          VARCHAR                      │
│     descripcion_plan_accion     TEXT                         │
│     estado_plan_accion          VARCHAR  (indexed)           │
│     responsable_plan_accion     VARCHAR  (indexed)           │
│     estado_accion               VARCHAR                      │
│     responsable_accion          VARCHAR  (indexed)           │
│                                                              │
│  ── Prórroga ──────────────────────────────────────────      │
│     prorroga                    VARCHAR                      │
│     fecha_cierre_proyectada     DATETIME                     │
│     fecha_cierre_final_prorroga DATETIME                     │
│                                                              │
│     created_at                  TIMESTAMP                    │
│     updated_at                  TIMESTAMP                    │
└──────────────┬───────────────────────────────────────────────┘
               │ 1
               │
               │ N
┌──────────────▼───────────────────────────────────────────────┐
│                         actividades                          │
├──────────────────────────────────────────────────────────────┤
│ PK  id                   INTEGER                             │
│ FK  hallazgo_id          INTEGER ──► hallazgos (CASCADE DEL) │
│     codigo_del_hallazgo  VARCHAR  (indexed)                  │
│     orden                INTEGER  (secuencia)                │
│     id_plan_accion        VARCHAR                            │
│     nombre_plan_accion    VARCHAR                            │
│     descripcion           TEXT                               │
│     estado_plan_accion    VARCHAR                            │
│     responsable           VARCHAR                            │
│     estado_accion         VARCHAR                            │
│     responsable_accion    VARCHAR                            │
│     fecha_compromiso      DATETIME                           │
│     prorroga              VARCHAR                            │
│     fecha_prorroga        DATETIME                           │
│     observaciones         TEXT                               │
│     created_at            TIMESTAMP                          │
└──────────────────────────────────────────────────────────────┘
```

### Resumen de relaciones

| Relación                         | Tipo | Cascade |
|----------------------------------|------|---------|
| users → upload_history           | 1:N  | No      |
| upload_history → hallazgos       | 1:N  | Sí (delete) |
| hallazgos → actividades          | 1:N  | Sí (delete) |

---

## 2. TAREAS PENDIENTES POR ÁREA

> **Leyenda de prioridad:** 🔴 Alta · 🟡 Media · 🟢 Baja  
> **Leyenda de dificultad:** ⬛ Alta · 🟧 Media · ⬜ Baja

---

### BACKEND

| # | Tarea | Prioridad | Dificultad | Descripción |
|---|-------|:---------:|:----------:|-------------|
| B1 | **Migraciones con Alembic (Flask-Migrate)** | 🔴 Alta | 🟧 Media | Actualmente se usa `db.create_all()`. En producción cualquier cambio de esquema destruye datos. Implementar Flask-Migrate para versionado seguro. |
| B2 | **Secretos en variables de entorno** | 🔴 Alta | ⬜ Baja | `SECRET_KEY` y `JWT_SECRET_KEY` están hardcodeados en `config.py`. Moverlos a `.env` y usar `python-dotenv` apropiadamente. |
| B3 | **Gestión incremental de cargas Excel** | 🔴 Alta | ⬛ Alta | Cada upload reemplaza TODOS los hallazgos. Implementar lógica de upsert por `codigo_del_hallazgo` para cargas incrementales sin pérdida de histórico. |
| B4 | **Modelo de Auditoría (AuditLog)** | 🟡 Media | 🟧 Media | Crear tabla `audit_log` que registre quién cambió qué campo y cuándo en hallazgos/actividades. Crítico para trazabilidad en entidades reguladas. |
| B5 | **Notificaciones por email** | 🟡 Media | 🟧 Media | Integrar Flask-Mail para alertas automáticas: hallazgos próximos a vencer, SLA incumplido, asignación de responsable. |
| B6 | **Rate limiting en endpoints** | 🟡 Media | ⬜ Baja | Agregar Flask-Limiter para proteger endpoints de abuso, especialmente `/api/auth/login` y `/api/uploads/`. |
| B7 | **Limpieza de archivos Excel subidos** | 🟡 Media | ⬜ Baja | Los `.xlsx` quedan en disco indefinidamente. Implementar política de retención (ej. eliminar archivos > 90 días) o limpiar al borrar el `upload_history`. |
| B8 | **Operaciones masivas (bulk)** | 🟡 Media | 🟧 Media | Endpoint `PATCH /api/hallazgos/bulk` para actualizar estado de múltiples hallazgos en una sola operación. |
| B9 | **Mensajes de error detallados en Excel parser** | 🟡 Media | ⬜ Baja | El parser recolecta errores pero no vincula el número de fila exacto. Mejorar mensajes para indicar fila y columna del error. |
| B10 | **Exportación de datos** | 🟡 Media | 🟧 Media | Endpoints `GET /api/hallazgos/export?format=xlsx\|csv` para exportar resultados filtrados. Usar openpyxl (ya disponible). |
| B11 | **Historial de cambios de estado** | 🟢 Baja | 🟧 Media | Crear tabla `estado_historial` que registre las transiciones de estado de cada hallazgo con fecha y usuario responsable. |
| B12 | **Tests unitarios e integración** | 🟢 Baja | ⬛ Alta | No existe ningún test. Implementar con `pytest` + `pytest-flask`. Priorizar: excel_parser, auth, hallazgos CRUD. |
| B13 | **Documentación API (Swagger/OpenAPI)** | 🟢 Baja | 🟧 Media | Integrar `flask-openapi3` o `flasgger` para generar documentación interactiva automáticamente. |
| B14 | **Permisos del rol Técnico** | 🟢 Baja | ⬜ Baja | El técnico actualmente es solo lectura. Evaluar si debe poder editar `observaciones` en hallazgos donde es responsable. |
| B15 | **Soft delete real para usuarios** | 🟢 Baja | ⬜ Baja | Los usuarios se marcan `activo=false` pero nunca se limpian. Añadir endpoint admin para purga definitiva de usuarios inactivos. |

---

### FRONTEND

| # | Tarea | Prioridad | Dificultad | Descripción |
|---|-------|:---------:|:----------:|-------------|
| F1 | **Página dedicada de Actividades** | 🔴 Alta | 🟧 Media | No existe una ruta `/actividades`. Crear página con listado paginado, filtros (estado_plan_accion, estado_accion, responsable, vencido) y detalle por actividad. El backend ya tiene los endpoints. |
| F2 | **Vista detalle de Hallazgo** | 🔴 Alta | 🟧 Media | No hay una página `/hallazgos/[id]`. Al hacer clic en un hallazgo debería abrir una vista completa con todos los campos, sus actividades y el historial de cambios. |
| F3 | **Formulario de edición de Hallazgo** | 🔴 Alta | 🟧 Media | Actualmente la edición no está clara en la UI. Crear un modal o página de edición con los campos editables según el rol (estado, observaciones, plan de acción, prórroga, etc.). |
| F4 | **Indicadores de semáforo en tablas** | 🟡 Media | ⬜ Baja | En la tabla de hallazgos mostrar visualmente si está: 🟢 En tiempo · 🟡 Próximo a vencer (≤7 días) · 🔴 Vencido. Calcular en frontend con `fecha_cierre_proyectada`. |
| F5 | **Exportar a Excel desde la UI** | 🟡 Media | 🟧 Media | Botón "Exportar" en `/hallazgos` que llame al endpoint de exportación (B10) y descargue el archivo. |
| F6 | **Dashboard Técnico** | 🟡 Media | 🟧 Media | El rol `tecnico` cae en el mismo dashboard que VP. Crear un dashboard específico que muestre solo los hallazgos donde el usuario es responsable o está en su dependencia. |
| F7 | **Notificaciones en UI** | 🟡 Media | 🟧 Media | Agregar un ícono de campana en el header con alertas: hallazgos próximos a vencer, nuevas asignaciones. Consumir desde un endpoint de notificaciones (requiere B5 o un endpoint propio). |
| F8 | **Gestión de perfil de usuario** | 🟡 Media | ⬜ Baja | Ningún usuario puede editar su propio perfil (nombre, contraseña). Crear página `/perfil` con formulario de cambio de datos propios. |
| F9 | **Modo oscuro funcional** | 🟡 Media | ⬜ Baja | `ThemeProvider` y `next-themes` están instalados pero el toggle no está expuesto en la UI. Agregar botón en el header. |
| F10 | **Paginación mejorada** | 🟡 Media | ⬜ Baja | La paginación actual es básica. Agregar selector de ítems por página (10/25/50/100) y mostrar "X de Y resultados". |
| F11 | **Filtros guardados / búsqueda avanzada** | 🟢 Baja | 🟧 Media | Permitir al usuario guardar configuraciones de filtros como "favoritos" usando `localStorage` para no tener que reconfigurarlos en cada sesión. |
| F12 | **Tabla de Actividades en detalle de Hallazgo** | 🟢 Baja | ⬜ Baja | En la futura vista detalle (F2), mostrar las actividades en una tabla ordenada por `orden` con posibilidad de expandir cada una. |
| F13 | **Manejo de sesión expirada** | 🟢 Baja | ⬜ Baja | El token JWT dura 8 horas. Si expira durante el uso, el usuario ve errores genéricos. Interceptar 401 y mostrar modal "Tu sesión expiró, vuelve a ingresar" con redirect a `/login`. |
| F14 | **Skeleton loaders / estado vacío mejorado** | 🟢 Baja | ⬜ Baja | Reemplazar spinners genéricos con skeletons por sección. Agregar ilustraciones para estados vacíos (ej. "No hay hallazgos con estos filtros"). |
| F15 | **Tests de componentes (Vitest / Jest)** | 🟢 Baja | ⬛ Alta | No hay tests en el frontend. Implementar con Vitest + React Testing Library para componentes críticos: AuthContext, tablas, filtros. |

---

## 3. RESUMEN POR PRIORIDAD

### 🔴 Prioridad Alta — Hacer primero

| ID | Área | Tarea |
|----|------|-------|
| B1 | Backend | Migraciones con Alembic |
| B2 | Backend | Mover secretos a `.env` |
| B3 | Backend | Cargas incrementales (upsert) en Excel |
| F1 | Frontend | Página de Actividades |
| F2 | Frontend | Vista detalle de Hallazgo |
| F3 | Frontend | Formulario de edición de Hallazgo |

### 🟡 Prioridad Media — Segunda iteración

| ID | Área | Tarea |
|----|------|-------|
| B4 | Backend | Modelo de Auditoría |
| B5 | Backend | Notificaciones por email |
| B6 | Backend | Rate limiting |
| B7 | Backend | Limpieza de archivos subidos |
| B8 | Backend | Operaciones masivas (bulk) |
| B9 | Backend | Errores detallados en parser Excel |
| B10 | Backend | Exportación de datos (xlsx/csv) |
| F4 | Frontend | Semáforo visual en tablas |
| F5 | Frontend | Exportar a Excel desde UI |
| F6 | Frontend | Dashboard Técnico |
| F7 | Frontend | Notificaciones en UI |
| F8 | Frontend | Perfil de usuario |
| F9 | Frontend | Modo oscuro |
| F10 | Frontend | Paginación mejorada |

### 🟢 Prioridad Baja — Mejoras futuras

| ID | Área | Tarea |
|----|------|-------|
| B11 | Backend | Historial de transiciones de estado |
| B12 | Backend | Tests con pytest |
| B13 | Backend | Documentación Swagger/OpenAPI |
| B14 | Backend | Permisos del rol Técnico |
| B15 | Backend | Purga de usuarios inactivos |
| F11 | Frontend | Filtros guardados |
| F12 | Frontend | Tabla de actividades en detalle |
| F13 | Frontend | Manejo de sesión expirada |
| F14 | Frontend | Skeleton loaders / estados vacíos |
| F15 | Frontend | Tests de componentes |

---

## 4. RESUMEN POR DIFICULTAD

### ⬛ Alta dificultad
- B3 — Cargas incrementales (upsert)
- B12 — Tests backend (pytest)
- F15 — Tests frontend (Vitest)

### 🟧 Dificultad Media
- B1 — Migraciones Alembic
- B4 — Modelo de Auditoría
- B5 — Notificaciones email
- B8 — Operaciones masivas
- B10 — Exportación de datos
- B11 — Historial de estados
- B13 — Documentación API
- F1 — Página de Actividades
- F2 — Vista detalle Hallazgo
- F3 — Formulario edición
- F5 — Exportar a Excel (UI)
- F6 — Dashboard Técnico
- F7 — Notificaciones UI
- F11 — Filtros guardados

### ⬜ Baja dificultad
- B2 — Variables de entorno
- B6 — Rate limiting
- B7 — Limpieza de archivos
- B9 — Errores detallados parser
- B14 — Permisos Técnico
- B15 — Purga usuarios
- F4 — Semáforo visual
- F8 — Perfil usuario
- F9 — Modo oscuro
- F10 — Paginación mejorada
- F12 — Tabla actividades en detalle
- F13 — Sesión expirada
- F14 — Skeleton loaders

---

*Generado automáticamente con Claude Code — 2026-04-06*
