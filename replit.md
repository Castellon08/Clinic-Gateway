# Clínica Odontológica Argüello — Sistema de Gestión Clínica

## Architecture

This is a pnpm monorepo with the following packages:

### Artifacts
- **`artifacts/clinica-arguello`** — React + Vite frontend (preview path: `/`)
- **`artifacts/api-server`** — Express 5 + TypeScript API server (preview path: `/api`)

### Libraries
- **`lib/db`** — Drizzle ORM schema + PostgreSQL connection (`@workspace/db`)
- **`lib/api-spec`** — OpenAPI spec + Orval codegen config (`@workspace/api-spec`)
- **`lib/api-zod`** — Auto-generated Zod schemas from OpenAPI (`@workspace/api-zod`)
- **`lib/api-client-react`** — Auto-generated React Query hooks from OpenAPI (`@workspace/api-client-react`)

### Scripts
- **`scripts/`** — Utility scripts (seed, etc.)

## Database

PostgreSQL (Replit managed). Schema is in `lib/db/src/schema/`:
- `users` — Staff accounts (admin, receptionist, dentist)
- `patients` — Patient registry with medical info
- `appointments` — Appointments with conflict detection
- `clinical_records` — Clinical visit records with tooth info
- `invoices` — Billing with line items (stored as JSONB)
- `inventory` — Dental supply inventory with low stock tracking

Run migrations: `pnpm --filter @workspace/db run migrate`

## Authentication

Custom HMAC-based JWT (no external libs):
- Token stored in `localStorage` key: `clinica_token`
- `setAuthTokenGetter` configured in `main.tsx` to read from localStorage
- Server reads `Authorization: Bearer <token>` header
- Secret: `SESSION_SECRET` env var (fallback: `clinica-arguello-secret-2026`)

### Test Credentials
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@clinica-arguello.com | admin2026 |
| Recepcionista | recepcion@clinica-arguello.com | recep2026 |
| Dentista | dentista@clinica-arguello.com | dent2026 |

## API Codegen

The OpenAPI spec is at `lib/api-spec/openapi.yaml`. To regenerate client hooks and Zod schemas:
```
pnpm --filter @workspace/api-spec run codegen
```

**IMPORTANT:** `lib/api-zod/src/index.ts` must contain ONLY `export * from "./generated/api";` — the codegen script patches it automatically after Orval runs.

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
- **Backend:** Express 5, TypeScript (ESM), Drizzle ORM, Pino (logging)
- **Database:** PostgreSQL 16 (Replit managed)
- **Codegen:** Orval (OpenAPI → React Query + Zod)
