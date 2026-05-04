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

For full production deployment instructions — deploy modes, rollback, manual steps, remote directory structure, and release notes — see [deployment/deployment.md](./deployment/deployment.md).

### Quick deploy to production (Windows)

```powershell
# No arguments — prompts with branch name, server, and path before proceeding
.\deployment\deploy.ps1

# Explicit modes
.\deployment\deploy.ps1 prod auto      # full automated pipeline (default)
.\deployment\deploy.ps1 prod copy      # upload + extract only, then activate manually on server
.\deployment\deploy.ps1 prod manual    # print copy-paste steps, nothing executed
.\deployment\deploy.ps1 prod rollback  # re-point current symlink to the previous release
.\deployment\deploy.ps1 -WhatIf        # dry-run any mode
```

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
| `/api/custom-templates` | Custom template CRUD (Phase 2) |
| `/api/messages` | System template messages (Phase 1) |

## Development Roadmap

### Phase 1 ✅ COMPLETED
**Database-Backed Kudos Messages**

**What was implemented:**
- Moved 50 hardcoded messages from frontend code to PostgreSQL database
- Created `messageTemplates` table (system defaults) and `customTemplateMessages` table (custom template support)
- Created batch API endpoint `/api/messages/all` for efficient message fetching (1 request vs 5+)
- Updated frontend to fetch and cache messages dynamically based on selected template
- Messages organized by: template ID → category (individual/team) → 5 message options per category

**Files modified:**
- `apps/backend/src/db/schema.ts` - Added messageTemplates and customTemplateMessages tables
- `apps/backend/drizzle/0007_message_templates.sql` - Migration file
- `apps/backend/src/scripts/seed-default-messages.ts` - Seed script for 50 default messages
- `apps/backend/src/routes/messages.routes.ts` - Public GET endpoints (no auth on read)
- `apps/frontend/app/dashboard/kudos/page.tsx` - Dynamic message loading and dropdown

**Benefits:**
- Messages are now maintainable in database instead of code
- System supports organization-wide message customization (foundation for Phase 2)
- API batch endpoint reduces network traffic by ~80%
- Dynamic message selection based on template + recipient type

---

### Phase 2 🏗️ IN PROGRESS (Hidden UI)
**Custom Template Background Images + Infrastructure**

**What was implemented:**
- Added `backgroundImageBlob` field to `customTemplates` table (base64 image storage)
- Backend API accepts and stores custom background images (max 2MB recommended)
- Frontend image upload handler with validation (file type, size checks)
- Image upload UI in custom template dialog with preview and remove functionality
- Image generator updated with:
  - Logo rendering support (circular frame at top-center)
  - Background image rendering with 90% opacity dark overlay
  - Smart text coloring (white text on dark overlay, dark text on gradient backgrounds)
- Full backward compatibility: custom templates without images use original gradient style

**Files modified/created:**
- `apps/backend/src/db/schema.ts` - Added backgroundImageBlob field to customTemplates
- `apps/backend/drizzle/0008_custom_template_images.sql` - Migration file
- `apps/backend/src/routes/custom-templates.routes.ts` - API accepts backgroundImageBlob
- `apps/frontend/app/dashboard/kudos/page.tsx` - Image upload UI, form state management
- `apps/frontend/lib/image-generator.ts` - Logo and background image rendering

**Current Status:**
- ✅ Backend infrastructure complete
- ✅ Database schema ready
- ✅ Frontend image upload complete
- ✅ Image rendering with overlay functional
- ❌ UI hidden from dashboard (awaiting Phase 3 UX decisions)

**Why UI is hidden:**
- Custom template feature requires design decisions (dynamic naming, champion-style rendering)
- Users need to complete Phase 2 testing before Phase 3 development
- Backend API and image generator are production-ready for future use

---

### MVP1 Updates ✅ COMPLETED (March 2026)
**Shout Out UX & Recipient Selector Improvements**

**Shout Out — Generate & Download Flow**
- Renamed "Publish Shout Out" button to **"Generate"** — matches Kudos Cards behaviour
- Clicking Generate now downloads the card as a PNG (same flow as Kudos)
- Card is saved to the database and appears in **My Card History**
- Success modal updated: "Shout Out Generated!" with accurate description
- "Go to Feed" renamed to **"Go to Card History"** linking to `/dashboard/my-cards`

**Recipient Selector — Outlook-style Token Input**
- Replaced combobox dropdown with an **inline token input** (chips inside the field)
- Recipients appear as removable chips directly in the input — identical to Outlook's To field
- Type → suggestions dropdown appears; navigate with arrow keys; `Enter`/`,`/`;` to add
- `Backspace` on empty input removes the last chip
- **Paste support**: paste comma/semicolon/newline-separated names or emails — each token is resolved against Azure AD in parallel; matched users become real directory chips, unmatched fall back to manual chips
- Handles `"Name <email@co.com>"` format pasted from email clients
- Individual mode locks to 1 chip; Team mode is unlimited
- Applies to both **Kudos Cards** and **Shout Outs** (shared component)

**Graph API Search Fix**
- Search now matches **both `displayName` AND `mail`/`userPrincipalName`**
- Email input (`@` detected) searches `mail` and `userPrincipalName` fields specifically
- Uses `URLSearchParams` for proper query encoding
- Minimum search length reduced from 3 to 2 characters

**Files modified:**
- `apps/frontend/app/dashboard/shout-out/page.tsx` — Generate button, download, success modal
- `apps/frontend/components/recipient-selector.tsx` — Outlook-style token input rebuild
- `apps/frontend/lib/graph-service.ts` — Multi-field search with email detection

---

### Phase 3 🔄 PLANNED
**Custom Template Full Feature Implementation**

**To be decided:**
1. **Dynamic Template Naming** - Should custom templates display as "{Name} Champion"?
2. **Custom Message Management** - UI for users to create custom messages per template
3. **Custom Template Styling** - Champion-style rendering vs simple background images vs both
4. **Permission Model** - Who can create/share/edit custom templates?
5. **Public Template Marketplace** - Share templates org-wide?

**Proposed tasks:**
- Re-enable custom template UI on dashboard
- Add message management dialog for custom templates
- Implement template versioning or editing capabilities
- Add template preview/testing before generating cards
- Create admin interface for managing org-wide templates

---

## Database Schema Summary

### Core Tables (Kudos System)
- `custom_templates` — User-created reward templates (with backgroundImageBlob field - Phase 2)
- `messageTemplates` — System-wide default messages (Phase 1)
- `customTemplateMessages` — Template-specific custom messages (Phase 1, Phase 2-ready)
- `recognitionEvents` — Generated kudos cards, stored metadata

### Other Tables
- `users`, `tenants` — Auth and organization management
- `userLearningProfiles`, `learningContent`, etc. — Tech growth module

---

## Known Issues & TODOs

### Current Build Issues
- TypeScript errors in unrelated files (`analytics`, `learning`, `download` pages) - pre-existing, not in kudos changes
- Frontend build requires cache cleanup due to artifact permissions - not code-related

### Phase 2 Testing Checklist
Before enabling custom template feature:
- [ ] Run `npm run db:push` to apply migration 0008
- [ ] Create custom template without background image (verify gradient style)
- [ ] Create custom template with background image (verify image renders)
- [ ] Regenerate card with same template (verify background image persists)
- [ ] Test text readability with different background images
- [ ] Verify existing system templates still work as before

### Future Enhancements
- [ ] Logo upload for company branding (currently logoBlob is infrastructure-only)
- [ ] Template marketplace for sharing across organization
- [ ] Advanced image editing (crop, filters, overlays)
- [ ] Template usage analytics
- [ ] Custom template versioning and rollback

### Intelligence & Talent Features (Planned)
The **Intelligence** section and **Talent Search** are currently hidden from the sidebar and dashboard hub. They are planned for a future release.

**Talent Search**
- Natural language search to find employees by skills, role, department, or expertise
- Powered by Azure AD directory + AI semantic search
- Route: `/dashboard/talent-search`
- Backend endpoint: not yet built

To re-enable when ready:
1. Remove the hidden comment in `apps/frontend/components/ui/app-sidebar.tsx` and restore the Intelligence section
2. Remove the hidden comment in `apps/frontend/app/dashboard/page.tsx` and restore the Growth & Intelligence section
3. Build the `/dashboard/talent-search` page and corresponding backend API
