# Hallazgos ERO — Findings Management System

A full-stack web application for managing operational risk findings (ERO — _Eventos de Riesgo Operacional_) at **Fiduprevisora**. It supports importing findings from Excel reports, tracking action plans, and visualizing KPIs through an interactive dashboard.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Roles & Permissions](#roles--permissions)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
  - [With Docker (recommended)](#with-docker-recommended)
  - [Manual Setup](#manual-setup)
- [Environment Variables](#environment-variables)
- [Default Admin Account](#default-admin-account)

---

## Overview

Hallazgos ERO provides a centralized platform to:

- **Import** operational findings from Excel files (`.xlsx` / `.xls`) exported from the ERO system.
- **Track** action plans and their statuses per finding, filtered by department and role.
- **Visualize** KPIs through a dashboard with charts: status distribution, timelines, top responsible parties, and extension tracking.
- **Manage** users with role-based access control.

---

## Tech Stack

| Layer     | Technology                                       |
| --------- | ------------------------------------------------ |
| Frontend  | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| UI        | shadcn/ui, Lucide React, Recharts                |
| Backend   | Python, Flask 3.x                                |
| ORM       | Flask-SQLAlchemy                                 |
| Database  | PostgreSQL 15                                    |
| Auth      | Flask-JWT-Extended (Bearer tokens, 8h expiry)    |
| Excel     | pandas + openpyxl + xlrd                         |
| Container | Docker Compose                                   |

---

## Project Structure

```
hallazgos/
├── docker-compose.yml
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask application factory
│   │   ├── extensions.py        # db, jwt, cors instances
│   │   ├── models/
│   │   │   ├── user.py          # User model (roles: vicepresidente | directivo | tecnico)
│   │   │   ├── hallazgo.py      # Finding model (19 ERO Excel fields)
│   │   │   └── upload_history.py
│   │   ├── routes/
│   │   │   ├── auth.py          # Authentication endpoints
│   │   │   ├── users.py         # User CRUD (VP only)
│   │   │   ├── hallazgos.py     # Findings endpoints with role-based filtering
│   │   │   ├── uploads.py       # Excel file upload & history
│   │   │   └── dashboard.py     # KPI metrics & charts
│   │   ├── services/
│   │   │   └── excel_parser.py  # Flexible Excel column → model mapping
│   │   └── utils/
│   │       └── decorators.py    # @role_required, @min_role, get_current_user()
│   ├── config.py
│   ├── app.py                   # Entry point
│   ├── seed_data.py             # Sample users for testing
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── dashboard/           # Dashboard page
    │   ├── hallazgos/           # Findings list & detail pages
    │   ├── uploads/             # File upload page
    │   ├── usuarios/            # User management page
    │   └── login/               # Login page
    ├── components/              # Shared UI components
    ├── hooks/                   # Custom React hooks
    └── lib/                     # Utilities & API client
```

---

## Features

- **Excel Import** — Upload `.xlsx` / `.xls` files; the parser flexibly maps column names to the internal model. Upload history is tracked per user.
- **Findings Browser** — Paginated, filterable list of findings. Filters include status, department, responsible party, and date range. Data visible is scoped to the user's role.
- **Dashboard** — Visual KPIs including:
- Total findings, open/closed counts
- Distribution by status and by department
- Top responsible parties
- 12-month activity timeline
- Extension (prórroga) tracking
- **User Management** — VP-only CRUD for users; each user has a role and a department (_dependencia_).
- **JWT Authentication** — Secure token-based login with 8-hour token expiry.

---

## Roles & Permissions

| Action                   | vicepresidente | directivo | tecnico |
| ------------------------ | :------------: | :-------: | :-----: |
| View all findings        |       ✅       |    ❌     |   ❌    |
| View department findings |       ✅       |    ✅     |   ❌    |
| View own findings        |       ✅       |    ✅     |   ✅    |
| Upload Excel files       |       ✅       |    ✅     |   ❌    |
| View all upload history  |       ✅       | own only  |   ❌    |
| Create / edit users      |       ✅       |    ❌     |   ❌    |
| Access global dashboard  |       ✅       |    ❌     |   ❌    |

---

## API Reference

### Authentication

| Method | Endpoint          | Description                                      |
| ------ | ----------------- | ------------------------------------------------ |
| POST   | `/api/auth/login` | `{ email, password }` → `{ access_token, user }` |
| GET    | `/api/auth/me`    | Returns the authenticated user                   |

### Findings

| Method | Endpoint             | Description                 |
| ------ | -------------------- | --------------------------- |
| GET    | `/api/hallazgos/`    | Paginated list with filters |
| GET    | `/api/hallazgos/:id` | Finding detail              |
| PUT    | `/api/hallazgos/:id` | Update editable fields      |

### Uploads

| Method | Endpoint               | Description                                              |
| ------ | ---------------------- | -------------------------------------------------------- |
| POST   | `/api/uploads/`        | Upload Excel file (`multipart/form-data`, field: `file`) |
| GET    | `/api/uploads/history` | Upload history                                           |

### Dashboard

| Method | Endpoint                         | Description                |
| ------ | -------------------------------- | -------------------------- |
| GET    | `/api/dashboard/metrics`         | Total KPIs                 |
| GET    | `/api/dashboard/por-estado`      | Distribution by status     |
| GET    | `/api/dashboard/por-dependencia` | Distribution by department |
| GET    | `/api/dashboard/por-responsable` | Top responsible parties    |
| GET    | `/api/dashboard/timeline`        | Last 12 months activity    |
| GET    | `/api/dashboard/prorrogas`       | Extension totals           |

---

## Getting Started

### With Docker (recommended)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) to be running.

```bash
# Clone the repository
git clone <repo-url>
cd hallazgos

# Start all services (database, backend, frontend)
docker compose up --build
```

| Service  | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:5000 |
| Database | localhost:5432        |

### Manual Setup

> Requires Python 3.11+ and Node.js 20+, with a running PostgreSQL 15 instance.

**Backend**

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt

# Configure environment variables (see below)
cp .env.example .env

python app.py                # Starts on http://localhost:5000
python seed_data.py          # Optional: load sample users
```

**Frontend**

```bash
cd frontend
npm install
npm run dev                  # Starts on http://localhost:3000
```

---

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
FLASK_ENV=development

SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret

DB_HOST=localhost
DB_PORT=5432
DB_NAME=hallazgos_db
DB_USER=postgres
DB_PASSWORD=postgres

CORS_ORIGINS=http://localhost:3000
```

For the frontend, set `NEXT_PUBLIC_API_URL` in the environment or a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Default Admin Account

A default administrator account is automatically created on first run:

| Field    | Value                     |
| -------- | ------------------------- |
| Email    | `admin@fiduprevisora.com` |
| Password | `Admin2025*`              |
| Role     | `vicepresidente`          |

> **Change the default password immediately in any production environment.**
