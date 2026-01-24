# ReflectoAI: Talent Intelligence Platform Design

**Date:** 2026-01-25
**Status:** Approved

## 1. Executive Summary

ReflectoAI is evolving from a simple "Kudos Card Generator" into a comprehensive **Employee Engagement & Talent Intelligence Platform**. The goal is twofold:

1.  **Engagement:** Provide a suite of creative tools (Shout Outs, Birthday Posters, Business Cards) to foster a culture of recognition.
2.  **Intelligence:** Leverage the data from these interactions to build a "Vector-Based Talent Graph" that allows HR/Management to search for competencies (e.g., "Problem Solving", "Customer Focus") using natural language.

---

## 2. User Experience (Frontend)

### 2.1 The Portal Structure (`/dashboard`)

The application will transition to an "App Store" model.

- **The Hub:** The main landing page will feature two distinct sections:
  - **🎨 Creative Studio:** A grid of tools for creating content.
  - **🚀 Growth & Intelligence:** A grid of tools for personal development and insights.
- **Navigation:** A global "Slim Sidebar" will allow users to switch context (e.g., from "Shout Out" to "Tech Radar") without returning to the home screen.

### 2.2 Modules

The "Creative Studio" will headline these applications:

- **Kudos Cards (Existing):** Peer-to-peer appreciation.
- **Shout Out:** Banner-style recognition for teams/departments.
- **Spot Award:** Specific award templates for monetary/formal recognition.
- **Birthday Poster:** Automated or manual poster generation for birthdays.
- **Business Card:** Digital business card generator with dynamic QR codes.

The "Growth & Intelligence" section will headline:

- **Tech Radar:** Personalized news feed based on user skills/projects.
- **My Skills:** A profile view where users can see their inferred competencies.
- **Talent Search (Admin/HR):** The interface for Semantic Search.

---

## 3. Data Architecture (Backend)

### 3.1 The "Unified Recognition" Model

To avoid creating 5 different tables for 5 tools, we will use a polymorphic table.

**Table: `recognition_events`**

```sql
CREATE TABLE recognition_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW(),
  sender_id UUID REFERENCES users(id),
  recipients JSONB, -- Array of User IDs
  type VARCHAR(50), -- ENUM: 'KUDOS', 'SHOUT_OUT', 'SPOT_AWARD', 'BIRTHDAY', 'BUSINESS_CARD'
  metadata JSONB,   -- Stores app-specific data (e.g., template_id, custom_message, qr_payload)
  privacy_level VARCHAR(20) DEFAULT 'PUBLIC'
);
```

### 3.2 The Talent Graph (Intelligence Layer)

We will extend the user profile to capture deep context.

**Table: `user_competencies`**
Tracks "New Age" skills (Architectural Thinking, Problem Finding, etc.) rather than just syntax.

```sql
CREATE TABLE user_competencies (
  user_id UUID REFERENCES users(id),
  competency VARCHAR(100), -- 'Problem Solving', 'Communication'
  level INTEGER,           -- 1-5 Scale
  source VARCHAR(50)       -- 'SELF', 'MANAGER', 'INFERRED'
);
```

**Table: `user_narratives`**
Users continuously add context about their work. This is the primary source for Vector Embedding.

```sql
CREATE TABLE user_narratives (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  content TEXT, -- "I led the migration to Azure for the billing module..."
  embedding VECTOR(1536) -- pgvector column for Semantic Search
);
```

### 3.3 The Evidence Log

To power the intelligence without invasive monitoring, we capture explicit "Signals".
**Table: `evidence_logs`**

- **Type:** `KUDOS`, `SHOUT_OUT`, `NARRATIVE`
- **Content:** The raw text of the recognition or narrative.
- **Vector:** The mathematical representation of that text.

---

## 4. The Intelligence Engine (AI)

### 4.1 Vector Search (`pgvector`)

The core value proposition is "Plain English Search".

1.  **Ingestion:** When a `recognition_event` (Kudos) or `user_narrative` is saved:
    - The backend sends the text to OpenAI/Azure Embedding API.
    - The resulting vector is stored in `evidence_logs` or `user_narratives`.
2.  **Search:** When HR queries _"Find a leader who can handle difficult clients"_:
    - The query is embedded into a vector.
    - Postgres performs a Cosine Similarity search against the `evidence_logs`.
    - The system returns Users who have high-ranking evidence.

### 4.2 Tech Radar (Pub/Sub)

- **Input:** Tech news/articles are ingested.
- **Matching:** The system queries the `user_competencies` to find relevant users.
- **Output:** personalized feed items.

---

## 5. Technical Stack Additions

- **Database:** PostgreSQL with `pgvector` extension.
- **AI:** Azure OpenAI Service (for Embeddings and Summarization).
- **Frontend:** Next.js 15 (App Router) with a new `DashboardLayout` shell.
