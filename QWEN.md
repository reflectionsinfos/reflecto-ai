# ReflectoAI — Project Context for Qwen

## Project Overview

**ReflectoAI** is an AI-powered HR recognition and talent development platform built as a monorepo with:
- **Frontend**: Next.js 15 (App Router) Web Application
- **Backend**: Express.js API Service
- **Database**: PostgreSQL via Drizzle ORM
- **AI Integration**: Google Gemini for message generation & learning assistant
- **Auth**: Azure Active Directory (MSAL client, Passport-Azure-AD server)

## Monorepo Structure

```
reflecto-ai/
├── apps/
│   ├── frontend/          # Next.js 15 App
│   ├── backend/           # Express.js API
│   └── infra/             # Nginx configs (prod/staging)
├── .vscode/               # Workspace settings
├── docker-compose*.yml    # Docker configs
└── deployment.md          # Production deployment guide
```

**Note**: No `packages/` directory exists yet (shared libs not extracted).

## Key Commands

### Root (Turbo)
```bash
npm run dev      # Run all apps in dev mode
npm run build    # Build all apps
npm run lint     # Lint all apps
```

### Frontend (`apps/frontend/`)
```bash
npm run dev      # Next.js dev server (port 3000)
npm run build    # Next.js build
npm run lint     # ESLint
```

### Backend (`apps/backend/`)
```bash
npm run dev            # TSX watch mode (port 4000)
npm run build          # TypeScript compile
npm run db:push        # Push Drizzle schema to DB
npm run db:generate    # Generate Drizzle migrations
npm run db:studio      # Open Drizzle Studio
npm run seed           # Seed database
```

### Docker
```bash
docker-compose up -d --build              # Full stack (with DB)
docker-compose -f docker-compose.prod.yml up -d --build  # Production (host DB)
```

## Tech Stack Details

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4, Radix UI / Shadcn components
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Auth**: @azure/msal-react, @azure/msal-browser
- **State**: React 19 hooks

### Backend
- **Framework**: Express.js 5
- **Language**: TypeScript 5
- **Database**: Drizzle ORM 0.45 + PostgreSQL
- **AI**: @google/generative-ai
- **Auth**: Passport + passport-azure-ad
- **Tokens**: jsonwebtoken, jwt-decode
- **Docs**: Swagger UI

### Infrastructure
- **Container**: Docker Compose
- **Web Server**: Nginx (reverse proxy)
- **Deployment**: Remote server `192.168.117.114`

## Environment Variables

### Backend (`apps/backend/.env`)
```env
PORT=4000
DATABASE_URL=postgresql://user:pass@host:5432/dbname
AZURE_CLIENT_ID=...
AZURE_TENANT_ID=...
GEMINI_API_KEY=...
```

### Frontend (`apps/frontend/.env.local` / `.env.production`)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000  # or /api for prod
AZURE_AD_CLIENT_ID=...
AZURE_AD_TENANT_ID=...
```

## API Routes

| Route | Service | Description |
|---|---|---|
| `/api/recognition` | RecognitionService | Kudos, shout-outs, spot awards |
| `/api/ai` | AIAssistantService | Gemini message generation |
| `/api/learning` | AILearningService, LearningService | Tech growth plans, lessons |
| `/api/users` | user.service | User management |
| `/api/tenants` | tenant.service | Tenant/org management |

## Backend Services

- **AIAssistantService.ts** — Gemini message drafting
- **AILearningService.ts** — AI learning recommendations
- **LearningService.ts** — Learning path management
- **RecognitionService.ts** — Kudos/shout-out/awards logic
- **tenant.service.ts** — Multi-tenant operations
- **user.service.ts** — User CRUD operations

## Frontend Routes

- `/dashboard/kudos` — Send kudos cards
- `/dashboard/shout-out` — Team shout-outs
- `/dashboard/spot-awards` — Admin spot awards
- `/dashboard/learning` — Tech growth plans
- `/dashboard/analytics` — Dashboard analytics
- `/dashboard/my-cards` — View received cards
- `/download/[token]` — Download shareable card

## Authentication Flow

1. **Frontend**: MSAL (Microsoft Authentication Library) for Azure AD
2. **Backend**: Passport-Azure-AD strategy
3. **Middleware**: `requireAdmin` for role-based access
4. **Multi-tenant**: Tenant isolation via user context

## Database

- **ORM**: Drizzle ORM with migrations
- **Migrations**: Stored in `apps/backend/drizzle/`
- **Config**: `drizzle.config.ts` in both frontend & backend
- **Schema**: Defined in backend, frontend has types

## Deployment Notes

- **Production Server**: `192.168.117.114`
- **Domains**: 
  - `reflecto-ai.onreflections.com`
  - `samiksha-ai.onreflections.com`
- **Nginx Config**: `apps/infra/*.conf`
- **Credentials**: Stored securely (see deployment.md)
- **TLS**: Backend app registration handles auth redirects

## Development Conventions

- **Code Style**: TypeScript strict mode
- **Component Naming**: PascalCase for components, kebab-case for files
- **API Pattern**: Routes → Controllers → Services → DB
- **UI Components**: Shadcn/Radix primitives in `components/ui/`
- **Imports**: Absolute paths from `app/` and `components/`

## Common Tasks

### Adding a new feature
1. Create route in `apps/backend/src/routes/`
2. Add service in `apps/backend/src/services/`
3. Create frontend page in `apps/frontend/app/dashboard/`
4. Add components in `apps/frontend/components/`

### Database changes
1. Update schema in backend
2. Run `npm run db:generate` for migration
3. Run `npm run db:push` to apply (dev)
4. Migrations auto-apply in prod

### Testing API
- Postman collection: `apps/backend/postman-collection/`
- Swagger UI: Available at runtime (configured in backend)

## Important Files

- `deployment.md` — Production deployment guide
- `docker-compose.prod.yml` — Production Docker config
- `apps/infra/reflecto-prod-app.conf` — Nginx config
- `apps/backend/drizzle/` — Database migrations
- `.vscode/reflecto-ai.code-workspace` — VS Code workspace
