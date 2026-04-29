# SaaS HR Platform Roadmap: From Prototype to Enterprise AI

**Goal**: Transform the current "Kudos App" into a scalable, multi-tenant HR SaaS platform with embedded AI, using an incremental approach to minimize rework.

## Phase 1: The "Real" Foundation (Weeks 1-2)

_Objective: Replace "toy" parts with production-grade infrastructure. No new features, just architecture._

1.  **Database Integration (Postgres)**
    - **Why**: `localStorage` prevents collaboration and checking analytics.
    - **Action**: Spin up a Postgres database (Docker local, then Cloud).
    - **Tech**: Prisma ORM or Drizzle ORM to manage schema.
2.  **Authentication (NextAuth.js / Auth.js)**
    - **Why**: "Admin" vs "User" needs secure session management.
    - **Action**: Replace hardcoded users with a real auth system.
    - **Strategy**: Start with simple Email/Password, design for Azure AD (SSO) later.
3.  **Data Migration**
    - **Action**: Redesign `StoredCard` into a relational schema: `User`, `Organization`, `KudosCard`, `Template`.

## Phase 2: Multi-Tenancy & SaaS Core (Weeks 3-4)

_Objective: Enable multiple organizations to use the platform simultaneously securely._

1.  **Organization Layer**
    - **Why**: SaaS means Company A cannot see Company B's data.
    - **Action**: Add `organizationId` to every database table.
2.  **User Onboarding**
    - **Action**: "Invite User" flow. Admin invites employees via email.

## Phase 3: AI Intelligence Layer (Weeks 5-8)

_Objective: Embed AI that adds genuine value, not just hype._

1.  **AI Writing Assistant (Generative)**
    - **Feature**: "Help me write this." User types "Thanks for help with the project" -> AI expands to professional praise based on company values.
    - **Tech**: OpenAI API / Anthropic Claude Integration.
2.  **Sentiment Mapping (Analytical)**
    - **Feature**: Analyze the _content_ of kudos to detect team morale trends.
    - **Value**: HR Dashboard showing "Burnout Risk" or "High Engagement Zones."

## Phase 4: Expansion Modules (Incremental)

_Once the core (Kudos) is solid, add modules:_

1.  **Surveys & Pulse Checks**: AI generates questions based on recent team activity.
2.  **Performance Snapshots**: AI summarizes a year's worth of Kudos for performance reviews.

---

## Recommended Immediate Next Steps (The "Zero Rework" Path)

To ensure we don't write code today that we delete tomorrow, we must stop using `localStorage` immediately.

1.  **Setup Database**: Create a `docker-compose.yml` for Postgres (matching your other project).
2.  **Schema Design**: Define the "Source of Truth" in a schema file.
3.  **Refactor**: Modify `lib/card-storage.ts` to call Server Actions (Database) instead of local storage.
