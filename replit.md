# Clínica Odontológica Argüello — Sistema de Gestión Clínica

## Architecture

This is a pnpm monorepo (frontend) + Django backend. The API server runs as a separate Python process.

### Artifacts
- **`artifacts/clinica-arguello`** — React + Vite frontend (preview path: `/`)
- **`artifacts/api-server`** — Workflow config that runs the Django API (preview path: `/api`)
- **`artifacts/django-api`** — Django 5 + Django REST Framework Python backend

### Libraries (frontend codegen, still present but API is now Django)
- **`lib/db`** — Drizzle ORM schema reference (schema mirrors existing PostgreSQL tables; migrations no longer run through Django)
- **`lib/api-spec`** — OpenAPI spec + Orval codegen config (`@workspace/api-spec`)
- **`lib/api-zod`** — Auto-generated Zod schemas from OpenAPI (`@workspace/api-zod`)
- **`lib/api-client-react`** — Auto-generated React Query hooks from OpenAPI (`@workspace/api-client-react`)

### Scripts
- **`scripts/`** — Utility scripts (seed, etc.)

## Django Backend Structure

```
artifacts/django-api/
  manage.py
  clinica_project/          # Django project config
    settings.py             # DB from DATABASE_URL, CORS, DRF config, migrations disabled
    urls.py                 # Routes /api/ → api.urls
    wsgi.py
  api/
    models.py               # managed=False models mapped to existing PostgreSQL tables
    authentication.py       # Custom HMAC-SHA256 JWT (compatible with Express tokens)
    permissions.py          # IsAdmin, IsAdminOrReceptionist, IsNotDentist
    serializers.py          # DRF serializers
    urls.py                 # All API URL patterns
    views/
      auth.py               # POST /api/auth/login, GET /api/auth/me, POST /api/auth/logout
      users.py              # CRUD /api/users (admin only)
      patients.py           # CRUD /api/patients, PUT /api/patients/:id/odontogram
      appointments.py       # CRUD /api/appointments, GET /api/appointments/availability
      clinical_records.py   # CRUD /api/clinical-records + file attachments
      invoices.py           # CRUD /api/invoices (markup % for admin)
      inventory.py          # CRUD /api/inventory + POST /api/inventory/:id/adjust
      dashboard.py          # GET /api/dashboard/summary, today, recent, revenue, low-stock
      health.py             # GET /api/healthz
```

**Python interpreter:** `/home/runner/workspace/.pythonlibs/bin/python`  
**Packages installed via uv:** django, djangorestframework, psycopg2-binary, PyJWT (unused), django-cors-headers, gunicorn, Pillow

## Database

PostgreSQL (Replit managed). All tables already created by Drizzle migrations. Django uses `managed = False` on all models (no Django migrations needed).

Tables:
- `users` — Staff accounts (admin, receptionist, dentist)
- `patients` — Patient registry with medical info + `odontogram_data` JSONB
- `appointments` — Appointments with conflict detection
- `clinical_records` — Clinical visit records with tooth info
- `clinical_record_attachments` — File attachments stored as base64 in DB
- `invoices` — Billing with line items (stored as JSONB)
- `inventory` — Dental supply inventory with low stock tracking

## Authentication

Custom HMAC-based JWT (Python reimplementation of original Node.js version — identical format):
- Token stored in `localStorage` key: `clinica_token`
- `setAuthTokenGetter` configured in `main.tsx` to read from localStorage
- Server reads `Authorization: Bearer <token>` header
- Secret: `SESSION_SECRET` env var (fallback: `clinica-arguello-secret-2026`)
- Algorithm: HMAC-SHA256, base64url-encoded header/payload/signature
- Password hash format: `{salt}:{hmac_sha256("{password}:{salt}", SECRET).hexdigest()}`

### Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@clinica-arguello.com | admin2026 |
| Recepcionista | recepcion@clinica-arguello.com | recep2026 |
| Dentista | dentista@clinica-arguello.com | dent2026 |

## RBAC Rules
- **Admin**: Full access to all resources, can apply markup % to invoices
- **Receptionist**: Full access except user management
- **Dentist**: Only own patients (via appointments), own appointments/records/invoices; **no inventory access**

## Frontend Routes

- `/login` — Auth page
- `/dashboard` — Summary metrics, today's appointments, revenue chart, low stock
- `/patients` — Searchable patient list
- `/patients/new` — New patient form
- `/patients/:id` — Patient detail with tabs (Perfil, Citas, Expediente, Facturas)
- `/appointments` — Day-view agenda with inline status updates
- `/appointments/new` — New appointment with availability slot picker
- `/clinical-records` — Clinical record list with patient filter
- `/clinical-records/new` — New clinical record form
- `/invoices` — Invoice list with status filter and mark-as-paid
- `/invoices/new` — Invoice builder with line items
- `/inventory` — Inventory with low-stock alerts and adjust dialogs
- `/inventory/new` — New inventory item form
- `/settings/users` — User management (admin only)

## Tech Stack

- **Frontend:** React 18, Vite, wouter (routing), react-hook-form + zod, recharts, Tailwind CSS, shadcn/ui
- **Backend:** Django 5.2, Django REST Framework, psycopg2-binary, gunicorn (production)
- **Database:** PostgreSQL 16 (Replit managed)
- **Auth:** Custom HMAC-SHA256 JWT (identical format on both ends)

## Running the Backend

Development:
```bash
cd artifacts/django-api && /home/runner/workspace/.pythonlibs/bin/python manage.py runserver 0.0.0.0:8080
```

Production:
```bash
cd artifacts/django-api && /home/runner/workspace/.pythonlibs/bin/gunicorn clinica_project.wsgi:application --bind 0.0.0.0:8080 --workers 2
```
