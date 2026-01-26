# ReflectoAI - Project Context

## Project Overview

ReflectoAI is a web-based "Kudos Card" generator and management platform. It allows employees to recognize their peers by creating personalized appreciation cards using predefined templates. The system is built as a monorepo containing a modern Next.js frontend and a robust Express-based backend.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **UI Components**: Radix UI (shadcn/ui), Lucide React
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Azure Active Directory (MSAL for frontend, Passport-Azure-AD for backend validation)
- **Deployment**: Docker, Docker Compose, Nginx

## Key Features

1.  **Authentication**:
    - Integrated with Azure Active Directory.
    - Secure token transmission via Bearer headers.
    - User Identity and Profile photo fetched via Microsoft Graph API.

2.  **Dashboard (Create Card)**:
    - Path: `apps/frontend/app/dashboard/page.tsx`
    - **Templates**: Customer Centricity, Agility, Continuous Improvement, Collaboration, Accountability.
    - **Generation**: Client-side HTML Canvas image generation (`lib/image-generator.ts`).
    - **Features**: Dynamic text scaling, team photo grids (up to 4 images), downloadable PNGs.

3.  **My Cards & Analytics**:
    - **Persistence**: Cards are saved to a PostgreSQL database via the Backend API.
    - **API Integration**: Frontend uses `lib/api-client.ts` to communicate with the Backend.
    - **History**: Users can view cards they created or received (logic handled by backend filtration).

4.  **Admin/Analytics**:
    - Backend endpoints provide statistics on template usage and total cards.

5.  **AI Assistance**:
    - **Message Generation**: Uses Google Gemini API (`gemini-2.0-flash`) to help users write Kudos, Shout Out, and Spot Award messages.
    - **Features**: Generates context-aware, polished messages based on rough drafts or key words.
    - **Integration**: `AiMessageAssistant` component available in all recognition creation flows.

## Project Structure

- **`apps/frontend`**:
  - `app/`: Next.js App Router pages.
  - `lib/`: Utilities (`azure-auth.ts`, `api-client.ts`, `image-generator.ts`).
  - `components/`: UI components.
- **`apps/backend`**:
  - `src/`: Express application source.
  - `src/db/`: Drizzle schema and connection logic.
  - `src/routes/`: API route definitions (`/cards`, `/auth`, etc.).

## Data Flow

1.  **User Login**: Frontend authenticates with Azure AD and acquires an Access Token.
2.  **Card Creation**: User fills form -> Canvas generates image blob -> Frontend sends JSON metadata + Base64 image to Backend.
3.  **Persistence**: Backend validates token -> Saves metadata to Postgres -> Stores image (currently in DB or Filesystem).
4.  **Retrieval**: Frontend requests `/api/cards` -> Backend queries Postgres -> Returns JSON.

## Configuration & Environment

- **Frontend**: Requires `NEXT_PUBLIC_AZURE_CLIENT_ID`, `NEXT_PUBLIC_AZURE_TENANT_ID`, `NEXT_PUBLIC_API_URL`.
- **Backend**: Requires `DATABASE_URL`, `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `GEMINI_API_KEY`.

## Deployment

The application is containerized using Docker.

- `docker-compose.yml`: Development setup.
- `docker-compose.prod.yml`: Production setup (uses existing host Postgres).
- `deployment.md`: Full guide for deploying to the staging server.
