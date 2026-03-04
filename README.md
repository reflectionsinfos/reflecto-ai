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

Create `.env` files in both `apps/frontend` and `apps/backend`. See [deployment.md](./deployment.md) for production values.

Key variables needed:

```
# apps/backend/.env
DATABASE_URL=postgresql://...
AZURE_CLIENT_ID=...
AZURE_TENANT_ID=...
GEMINI_API_KEY=...

# apps/frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000
AZURE_AD_CLIENT_ID=...
AZURE_AD_TENANT_ID=...
```

### Installation

```bash
npm install
```

### Running the App

```bash
npm run dev
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend**: [http://localhost:4000](http://localhost:4000)

### Database Management

```bash
# Push schema changes (from apps/backend)
npm run db:push

# Seed database
npm run seed
```

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
