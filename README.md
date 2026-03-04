# ReflectoAI — Talent Intelligence Platform

An AI-powered HR recognition and talent development platform. Built as a monorepo with a Next.js frontend and Express/Node.js backend, featuring Google Gemini integration for smart message drafting, a unified recognition system, and a tech growth learning module.

## Features

### Recognition & Awards
- **Kudos Cards** — peer-to-peer recognition with AI-generated message drafts (Gemini)
- **Shout Outs** — team-wide public appreciation with admin review view
- **Spot Awards** — admin-issued awards with recipient selector and database persistence
- **My Cards** — view and manage your received/downloaded recognition cards

### Talent Intelligence
- **Tech Growth Plan** — employee learning paths with manager approval workflow
- **Lesson Viewer** — browse and view lessons, with recent lessons display
- **AI Learning Assistant** — Gemini-powered guidance for learning recommendations

### Platform
- Multi-tenant architecture with Azure AD authentication (MSAL + Passport-Azure-AD)
- Admin vs employee role separation (`requireAdmin` middleware)
- Downloadable recognition cards (shareable token links)
- Analytics dashboard

## Project Structure (Monorepo)

```
reflecto-ai/
├── apps/
│   ├── frontend/          # Next.js 15 Web Application
│   │   ├── app/
│   │   │   ├── dashboard/
│   │   │   │   ├── kudos/
│   │   │   │   ├── shout-out/
│   │   │   │   ├── spot-awards/
│   │   │   │   ├── learning/
│   │   │   │   ├── analytics/
│   │   │   │   └── my-cards/
│   │   │   ├── download/
│   │   │   └── api/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   └── shout-out/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── db/              # Drizzle ORM config & schema
│   │   └── docs/
│   │
│   ├── backend/           # Express.js API Service
│   │   ├── src/
│   │   │   ├── routes/    # ai, recognition, learning, user, tenant
│   │   │   ├── services/  # AIAssistantService, AILearningService,
│   │   │   │              # RecognitionService, LearningService,
│   │   │   │              # tenant.service, user.service
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── config/
│   │   │   └── db/
│   │   ├── drizzle/       # Database migrations
│   │   ├── scripts/
│   │   └── postman-collection/
│   │
│   └── infra/             # Infrastructure configs
│       └── *.conf         # Nginx server configs (prod/staging)
│
└── (no packages/ - shared libs not yet extracted)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, Radix UI / Shadcn |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL via Drizzle ORM (with migrations) |
| AI | Google Gemini (message generation & learning assistant) |
| Auth | Azure Active Directory (MSAL client, Passport-Azure-AD server) |
| Deployment | Docker Compose, Nginx reverse proxy |

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Docker & Docker Compose (for containerised DB/App)
- PostgreSQL (if running locally without Docker)

### Environment Configuration

Both apps use separate env files per environment so you never need to manually edit them when switching between local and Docker/production.

#### How it works

**Frontend** — Next.js loads env files automatically based on `NODE_ENV`:

| File | Used when | `NEXT_PUBLIC_API_URL` |
|---|---|---|
| `apps/frontend/.env.local` | `next dev` (local) | `http://localhost:4000/api` |
| `apps/frontend/.env.production` | `next build` / Docker | `/api` (nginx proxy) |

**Backend** — Express loads env files in two layers:

| File | Contains | Loaded by |
|---|---|---|
| `apps/backend/.env` | Shared: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `GEMINI_API_KEY`, `PORT` | Always (auth middleware at startup) |
| `apps/backend/.env.local` | Local: `DATABASE_URL` (localhost), `FRONTEND_URL` | When `NODE_ENV` ≠ `production` |
| `apps/backend/.env.production` | Production: `DATABASE_URL` (prod server), `FRONTEND_URL` | When `NODE_ENV=production` |

Docker Compose sets `NODE_ENV=production` on the backend container, so `.env.production` is picked up automatically. Locally, `NODE_ENV` is unset → `.env.local` is used.

#### Azure AD app registrations

Two separate app registrations are required in Azure AD:

| Registration | Used by | Env var |
|---|---|---|
| **Frontend SPA** | MSAL login | `NEXT_PUBLIC_AZURE_CLIENT_ID` (frontend) |
| **Backend API** | Token audience validation | `AZURE_CLIENT_ID` (backend) |

The frontend acquires a token scoped to the backend API:
```
NEXT_PUBLIC_AZURE_SCOPE=api://<backend-api-client-id>/access_as_user
```
The backend validates that the token's audience matches its own `AZURE_CLIENT_ID`. Both apps must share the same `AZURE_TENANT_ID`.

#### Backend `.env` reference

```env
# apps/backend/.env  — shared across all environments
PORT=4000
AZURE_CLIENT_ID=<backend-api-app-registration-id>
AZURE_TENANT_ID=<your-tenant-id>
GEMINI_API_KEY=<your-gemini-key>
```

```env
# apps/backend/.env.local  — local dev (npm run dev on your laptop)
# Use the direct IP of the PostgreSQL host — host.docker.internal does NOT resolve outside Docker
DATABASE_URL=postgresql://<user>:<pass>@192.168.117.144:5432/<db>?schema=reflecto-ai-2
FRONTEND_URL=http://localhost:3000
AZURE_REDIRECT_URI=http://localhost:4000/auth/azure/callback
```

```env
# apps/backend/.env.production  — Docker containers (docker compose up)
# Use host.docker.internal — resolves to the host machine from inside a container
# On Linux hosts, docker-compose must also set extra_hosts: host.docker.internal:host-gateway
DATABASE_URL=postgresql://<user>:<pass>@host.docker.internal:5432/<db>?schema=reflecto-ai-2
FRONTEND_URL=https://your-prod-domain.com
AZURE_REDIRECT_URI=https://your-prod-domain.com/auth/azure/callback
```

> **PostgreSQL host reference:**
>
> | Where the backend runs | Use |
> |---|---|
> | Local laptop (`npm run dev`) | `192.168.117.144` — direct IP, routable from the host |
> | Inside Docker container | `host.docker.internal` — Docker's special DNS name that resolves to the host machine |
>
> `host.docker.internal` is only resolvable from within a Docker container. Using it in `.env.local` (local dev) will cause a connection failure.

#### Frontend `.env` reference

```env
# apps/frontend/.env.local  — local dev only
NEXT_PUBLIC_AZURE_AUTH_ENABLED=true
NEXT_PUBLIC_AZURE_TENANT_ID=<your-tenant-id>
NEXT_PUBLIC_AZURE_CLIENT_ID=<frontend-spa-app-registration-id>
NEXT_PUBLIC_AZURE_SCOPE=api://<backend-api-client-id>/access_as_user
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

```env
# apps/frontend/.env.production  — production / Docker
NEXT_PUBLIC_AZURE_AUTH_ENABLED=true
NEXT_PUBLIC_AZURE_TENANT_ID=<your-tenant-id>
NEXT_PUBLIC_AZURE_CLIENT_ID=<frontend-spa-app-registration-id>
NEXT_PUBLIC_AZURE_SCOPE=api://<backend-api-client-id>/access_as_user
NEXT_PUBLIC_API_URL=/api
```

### Installation

```bash
npm install
```

### Running the App

**Option 1 — Both together (from repo root):**

```bash
# Run frontend + backend concurrently via Turborepo
npm run dev
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend**: [http://localhost:4000](http://localhost:4000)

**Option 2 — Individually (separate terminals):**

```bash
# Terminal 1 — Backend (tsx watch, hot reload)
cd apps/backend
npm run dev

# Terminal 2 — Frontend
cd apps/frontend
npm run dev
```

### Database (Local)

You need a PostgreSQL instance running locally. Either:

- Install PostgreSQL natively and set `DATABASE_URL` in `apps/backend/.env`
- Or run just the DB in Docker: `docker compose up -d postgres`

```bash
# Push schema and optionally seed (from apps/backend)
cd apps/backend
npm run db:push
npm run seed    # optional
```

### Env Files Required

See [Environment Configuration](#environment-configuration) above for the full reference and how env files are selected per environment.

## Docker Deployment

For full production deployment instructions, see [deployment.md](./deployment.md).

### Prerequisites

- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) installed and running
- WSL 2 backend enabled (recommended for performance)

### Local Docker (Windows Docker Desktop)

**Start all services (build + run in background):**
```bash
docker compose up -d --build
```

**Start only specific services:**
```bash
# Backend + database only
docker compose up -d --build backend postgres

# Frontend only (assumes backend is already running)
docker compose up -d --build frontend
```

**View running containers:**
```bash
docker compose ps
```

**View logs:**
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

**Stop all services:**
```bash
docker compose down
```

**Stop and remove volumes (wipes database data):**
```bash
docker compose down -v
```

**Rebuild a single service without cache:**
```bash
docker compose build --no-cache backend
docker compose build --no-cache frontend
```

**Restart a single service:**
```bash
docker compose restart backend
```

**Open a shell inside a running container:**
```bash
docker exec -it reflecto-backend sh
docker exec -it reflecto-frontend sh
docker exec -it reflecto-postgres psql -U reflecto_user -d reflecto_db
```

### Production Compose (no bundled Postgres)

Uses `docker-compose.prod.yml` — connects to an external PostgreSQL host via `host.docker.internal`:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml logs -f
```

### Service URLs (local)

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| PostgreSQL | localhost:5432 |

## API Routes

| Route | Description |
|---|---|
| `/api/recognition` | Kudos, shout-outs, spot awards |
| `/api/ai` | Gemini message generation & AI assistant |
| `/api/learning` | Tech growth plans & lessons |
| `/api/users` | User management |
| `/api/tenants` | Tenant/org management |
