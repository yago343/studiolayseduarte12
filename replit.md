# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS + Recharts + date-fns + react-hook-form + framer-motion

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── studio-layse/       # Studio Layse Duarte web app (React + Vite)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Application: Studio Layse Duarte

A complete beauty studio management system with:

### Features
1. **Dashboard** - Revenue stats (day/week/month), appointment counts, avg ticket, monthly revenue chart, top services
2. **Calendar/Agenda** - Weekly calendar view with appointment blocks, create/edit/cancel appointments, status color coding
3. **Services** - CRUD for beauty services (name, description, price, duration)
4. **Clients** - Client management with appointment history
5. **Finances** - Income tracking (auto-created on appointment completion), expense management, financial reports
6. **Working Hours** - Configure studio open hours, breaks, per day of week
7. **Settings** - Studio name, primary color theme, custom messages
8. **Public Booking Page** (`/agendar`) - Client-facing booking with service selection, date/time picker

### DB Schema
- `services` - Beauty services with name, price, duration
- `clients` - Client registry with name, phone, email
- `appointments` - Bookings with status (confirmed/completed/cancelled/blocked), payment tracking
- `incomes` - Auto-created from completed appointments + manual entries
- `expenses` - Manual expense tracking by category
- `settings` - Studio settings (singleton)
- `working_hours` - Per-day schedule configuration

### API Routes (all under `/api`)
- `GET/POST /services`, `GET/PUT/DELETE /services/:id`
- `GET/POST /clients`, `GET/PUT/DELETE /clients/:id`
- `GET/POST /appointments`, `GET/PUT/DELETE /appointments/:id`, `PATCH /appointments/:id/status`
- `GET/POST /finances/incomes`, `DELETE /finances/incomes/:id`
- `GET/POST /finances/expenses`, `DELETE /finances/expenses/:id`
- `GET /finances/summary`
- `GET /dashboard`
- `GET/PUT /settings`
- `GET/PUT /schedule`
- `GET /availability?date=&serviceId=`
- `POST /public/book`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers
- Depends on: `@workspace/db`, `@workspace/api-zod`

### `artifacts/studio-layse` (`@workspace/studio-layse`)

React + Vite frontend for the Studio Layse Duarte management app.

- Pages: dashboard, calendar, services, clients, finances, schedule, settings, public-booking
- Uses: React Query, Recharts, date-fns, react-hook-form, framer-motion, TailwindCSS
- Collapsible sidebar navigation with dark mode toggle

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`).

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.
