# Backend - Hallazgos ERO

## Stack
- **Framework**: Flask 3.x
- **ORM**: Flask-SQLAlchemy
- **DB**: PostgreSQL 15
- **Auth**: Flask-JWT-Extended (JWT Bearer tokens)
- **Excel**: pandas + openpyxl

## Estructura

```
backend/
├── app/
│   ├── __init__.py          # Factory de la app Flask
│   ├── extensions.py        # db, jwt, cors
│   ├── models/
│   │   ├── user.py          # Roles: vicepresidente | directivo | profesional
│   │   ├── hallazgo.py      # 19 campos del Excel ERO
│   │   └── upload_history.py
│   ├── routes/
│   │   ├── auth.py          # POST /api/auth/login, GET /api/auth/me
│   │   ├── users.py         # CRUD usuarios (solo vice crea/edita)
│   │   ├── hallazgos.py     # GET/PUT hallazgos con filtro por rol
│   │   ├── uploads.py       # POST /api/uploads/ (Excel), GET /api/uploads/history
│   │   └── dashboard.py     # Métricas, por-estado, por-dependencia, timeline
│   ├── services/
│   │   └── excel_parser.py  # Mapeo flexible de columnas Excel -> modelo
│   └── utils/
│       └── decorators.py    # @role_required, @min_role, get_current_user()
├── config.py
├── app.py                   # Punto de entrada
├── seed_data.py             # Usuarios de prueba
└── requirements.txt
```

## Roles y permisos

| Acción                     | vicepresidente | directivo | profesional |
|----------------------------|:--------------:|:---------:|:-------:|
| Ver todos los hallazgos    | ✅             | ❌        | ❌      |
| Ver hallazgos dependencia  | ✅             | ✅        | ❌      |
| Ver propios hallazgos      | ✅             | ✅        | ✅      |
| Subir Excel                | ✅             | ✅        | ❌      |
| Ver historial de cargas    | ✅             | solo propio | ❌    |
| Crear/editar usuarios      | ✅             | ❌        | ❌      |
| Dashboard global           | ✅             | ❌        | ❌      |

## Endpoints principales

### Auth
- `POST /api/auth/login` — `{email, password}` → `{access_token, user}`
- `GET  /api/auth/me`    — Retorna usuario autenticado

### Hallazgos
- `GET  /api/hallazgos/`           — Lista paginada con filtros
- `GET  /api/hallazgos/:id`        — Detalle
- `PUT  /api/hallazgos/:id`        — Actualizar campos editables

### Uploads
- `POST /api/uploads/`             — Subir Excel (multipart/form-data, field: `file`)
- `GET  /api/uploads/history`      — Historial de cargas

### Dashboard
- `GET /api/dashboard/metrics`         — Totales KPI
- `GET /api/dashboard/por-estado`      — Distribución por estado
- `GET /api/dashboard/por-dependencia` — Por dirección
- `GET /api/dashboard/por-responsable` — Top responsables
- `GET /api/dashboard/timeline`        — Últimos 12 meses
- `GET /api/dashboard/prorrogas`       — Totales de prórroga

## Levantar localmente

```bash
# Con Docker
docker-compose up --build

# Sin Docker (requiere PostgreSQL corriendo)
cd backend
pip install -r requirements.txt
python app.py
python seed_data.py   # opcional: datos de prueba
```

## Usuario admin por defecto
- Email: `admin@fiduprevisora.com`
- Password: `Admin2025*`
- Rol: `vicepresidente`
