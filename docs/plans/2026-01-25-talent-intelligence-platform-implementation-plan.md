# Talent Intelligence Platform Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform ReflectoAI into a multi-app platform with a unified Dashboard, "Shout Out" module, and underlying Vector Search intelligence.

**Architecture:**

- **Frontend:** Next.js App Router with a Shared Shell (Sidebar/Nav) and independent App Modules (Kudos, ShoutOut).
- **Backend:** Express/Node.js with Drizzle ORM.
- **Data:** PostgreSQL + pgvector for semantic search.

**Tech Stack:** Next.js 15, Tailwind, Drizzle ORM, OpenAI Embeddings (Azure), pgvector.

---

## Phase 1: Database & Backend Foundation

### Task 1.1: Database Schema & Migration

**Files:**

- Create: `apps/backend/src/db/migrations/000X_talent_intelligence.sql`
- Modify: `apps/backend/src/db/schema.ts`

**Step 1: Define Schema in Drizzle**
Define `recognitionEvents`, `userNarratives`, `userCompetencies`, `evidenceLogs`.
**Crucial:** Do NOT include legacy `kudos_cards` or `kudos_history`. Map their fields to `recognitionEvents.metadata` to ensure a clean, unified schema.

**Step 2: Generate Migration**
Run `npm run generate` in backend.

**Step 3: Apply & Verify**
Run migration against local DB. Verify tables exist.

### Task 1.2: Recognition Service

**Files:**

- Create: `apps/backend/src/services/RecognitionService.ts`
- Create: `apps/backend/src/routes/recognition.routes.ts`
- Modify: `apps/backend/src/app.ts`

**Step 1: Create Service**
Implement `createEvent(data)` that saves to `recognition_events`.

**Step 2: Create Endpoints**
`POST /api/recognition` (Polymorphic creation).
`GET /api/recognition/user/:id` (Get all events for a user).

**Step 3: Register Routes**
Mount at `/api/recognition`.

---

## Phase 2: Frontend "App Store" Shell

### Task 2.1: Dashboard Layout (The Shell)

**Files:**

- Create: `apps/frontend/app/dashboard/layout-shell.tsx`
- Modify: `apps/frontend/app/dashboard/layout.tsx`
- Create: `apps/frontend/components/ui/app-sidebar.tsx`

**Step 1: Create Sidebar**
Implement a slim sidebar with icons: Home (Hub), Kudos, Shout Out, Tech Radar.

**Step 2: Authenticated Shell**
Ensure `DashboardLayout` wraps children with this Sidebar and the existing TopBar.

### Task 2.2: The Hub (Landing Page)

**Files:**

- Modify: `apps/frontend/app/dashboard/page.tsx`
- Move: `apps/frontend/app/dashboard/page.tsx` logic -> `apps/frontend/app/dashboard/kudos/page.tsx` (Refactoring)

**Step 1: Refactor Kudos**
Move the current "Create Kudos" page to a dedicated `/dashboard/kudos` route. Update imports (api-client, etc.).

**Step 2: Build The App Grid**
Create the new `/dashboard` landing page.
Display two grids: "Creative Studio" and "Growth".
Cards should link to `/dashboard/kudos`, `/dashboard/shout-out`, etc.

---

## Phase 3: "Shout Out" Module (Proof of Concept)

### Task 3.1: Shout Out UI

**Files:**

- Create: `apps/frontend/app/dashboard/shout-out/page.tsx`
- Create: `apps/frontend/components/shout-out/shout-out-form.tsx`
- Create: `apps/frontend/components/shout-out/shout-out-canvas.tsx`

**Step 1: Scaffolding**
Create the page structure similar to Kudos but with "Shout Out" specific fields (Banner Title, Team Name).

**Step 2: Canvas Generation**
Implement a simple canvas that renders a "Notification Banner" style image.

**Step 3: Integration**
Connect to `POST /api/recognition` with `type: 'SHOUT_OUT'`.

---

## Phase 4: Intelligence Layer (Backend)

### Task 4.1: Vector Service Setup

**Files:**

- Create: `apps/backend/src/services/VectorService.ts`
- Create: `apps/backend/src/lib/openai.ts`

**Step 1: Configuration**
Install `openai` SDK. Configure Azure OpenAI credentials.

**Step 2: Embedding Logic**
Implement `generateEmbedding(text)` that returns a vector.

### Task 4.2: Evidence Ingestion

**Files:**

- Modify: `apps/backend/src/services/RecognitionService.ts`
- Modify: `apps/backend/src/services/NarrativeService.ts` (Create new)

**Step 1: Hook into Recognition**
When a `recognition_event` is created, asynchronously call `VectorService` and save to `evidence_logs`.

---

## Execute

Plan complete.
