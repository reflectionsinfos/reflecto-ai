# ReflectoAI — Talent Intelligence Platform

An AI-powered HR recognition and talent development platform. Built as a monorepo with a Next.js frontend and Express/Node.js backend, featuring Google Gemini integration for smart message drafting, a unified recognition system, and a tech growth learning module.

## Features

### Recognition & Awards
- **Kudos Cards** — peer-to-peer recognition with AI-generated message drafts (Gemini)
- **Shout Outs** — team-wide public appreciation with admin review view
- **Spot Awards** — admin-issued awards with recipient selector and database persistence

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
│   │   │   └── dashboard/
│   │   │       ├── kudos/
│   │   │       ├── shout-out/
│   │   │       ├── spot-awards/
│   │   │       ├── learning/
│   │   │       └── analytics/
│   │   └── components/
│   └── backend/           # Express.js API Service
│       └── src/
│           ├── routes/    # ai, recognition, learning, user, tenant
│           └── services/  # AIAssistantService, AILearningService,
│                          # RecognitionService, LearningService
└── packages/              # Shared libraries
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Radix UI / Shadcn |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL via Drizzle ORM |
| AI | Google Gemini (message generation & learning assistant) |
| Auth | Azure Active Directory (MSAL client, Passport-Azure-AD server) |
| Deployment | Docker Compose, Nginx |

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

```bash
docker-compose up -d --build
```

## API Routes

| Route | Description |
|---|---|
| `/api/recognition` | Kudos, shout-outs, spot awards |
| `/api/ai` | Gemini message generation & AI assistant |
| `/api/learning` | Tech growth plans & lessons |
| `/api/users` | User management |
| `/api/tenants` | Tenant/org management |
