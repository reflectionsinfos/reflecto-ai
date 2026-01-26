# ReflectoAI

A futuristic, AI-powered HR recognition platform for generating and managing Kudos cards. Now featuring Google Gemini integration for smart message drafting.

## Project Structure (Monorepo)

- **`apps/frontend`**: Next.js 15 Web Application (React, Tailwind, Shadcn UI).
- **`apps/backend`**: Node.js/Express Service (Drizzle ORM, PostgreSQL).
- **`packages/`**: Shared libraries (if applicable).

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Radix UI.
- **Backend**: Express.js, TypeScript.
- **Database**: PostgreSQL (via Drizzle ORM).
- **Authentication**: Azure Active Directory (MSAL on client, Passport-Azure-AD on server).
- **Deployment**: Docker Compose, Nginx.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- Docker & Docker Compose (for containerized DB/App)
- PostgreSQL (if running locally without Docker)

### Environment Configuration

Ensure you have the necessary `.env` files in `apps/frontend` and `apps/backend`. Refer to `deployment.md` for production values, or use localhost defaults for development.

### Installation

```bash
npm install
```

### Running the App

To start **both** the Frontend and Backend simultaneously (using Turbo/concurrently):

```bash
npm run dev
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend**: [http://localhost:4000](http://localhost:4000) (API)

### Database Management

The backend uses Drizzle ORM.

```bash
# Push schema changes (from apps/backend)
npm run db:push

# Seed database
npm run seed
```

## Docker Deployment

For detailed production deployment instructions, see [deployment.md](./deployment.md).

```bash
# Build and start all services (Frontend, Backend, DB)
docker-compose up -d --build
```
