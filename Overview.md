# Reflecto-AI — Project Overview

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What Is Reflecto-AI?

**Reflecto-AI** is a full-stack, AI-powered **Talent Intelligence Platform** built as a SaaS product for enterprise teams. It combines peer recognition, public appreciation, and manager-issued awards with an AI-driven personalized tech learning system — all designed to surface employee strengths, accelerate skill development, and create a culture of visible achievement.

The platform is multi-tenant, secured with Azure Active Directory, and targets engineering organizations that want a single place to recognize talent and grow it.

---

## Core Value It Adds

| Problem | How Reflecto-AI Solves It |
|---|---|
| Recognition is informal and invisible | Structured Kudos, Shout Outs, and Spot Awards with AI-assisted message drafting |
| Writing meaningful recognition is hard | AI generates tone-specific, character-limited messages from a single prompt |
| Learning paths are generic, not personalized | AI generates micro-lessons, quizzes, and next-topic suggestions tailored to individual tech stacks and goals |
| Skill levels are self-reported and stale | Inferred skill scores are auto-computed from quiz performance and learning progress |
| Talent is hard to discover | Infrastructure for competency tracking, narratives, and evidence logs — ready for semantic search |

---

## AI-Powered Features

### 1. AI Recognition Message Generator
- **What it does**: Drafts recognition messages for Kudos cards, Shout Outs, and Spot Awards based on recipient name, category, tone, and an optional user draft
- **Tones supported**: Professional, Casual, Funny, Inspiring
- **Character constraints**: 115 chars (Kudos/Spot Award), 400 chars (Shout Out) — enforced in the prompt
- **UX**: Dialog-based `AiMessageAssistant` component with one-click regeneration
- **LLM**: Google Gemini 2.0 Flash (temperature 0.7, max 200 tokens)
- **API**: `POST /api/ai/generate-message`

### 2. AI Personalized Micro-Lesson Generator
- **What it does**: Generates structured 2-minute learning lessons tailored to the user's tech stack, difficulty level, and declared learning goals
- **Lesson structure**: 200–300 word explanation + 1 code example + hands-on exercise with hints + 3–5 quiz questions
- **Output**: Structured JSON with lesson content in Markdown, rendered in-browser via `react-markdown`
- **Difficulty levels**: Beginner, Intermediate, Advanced
- **LLM**: Google Gemini 2.0 Flash (temperature 0.7, structured JSON output)
- **API**: `POST /api/learning/generate-lesson`

### 3. AI Quiz Evaluator & Feedback Engine
- **What it does**: Scores submitted quiz answers, awards points, and generates personalized 2–3 sentence feedback that is motivational and actionable
- **Context fed to AI**: Quiz score, exercise submission (first 500 chars), topic, difficulty
- **LLM**: Google Gemini 2.0 Flash (temperature 0.8 for varied responses, max 150 tokens)
- **API**: `POST /api/learning/submit-quiz`

### 4. AI Next-Topic Suggester
- **What it does**: Recommends the most logical next learning topic based on completed topics, current tech stack, and user goals
- **Output**: Single topic name (3–7 words) — no explanation, feeds directly into lesson generation
- **LLM**: Google Gemini 2.0 Flash (temperature 0.7, max 30 tokens)
- **Internal service**: `AILearningService.suggestNextTopic()`

### 5. Talent Intelligence Infrastructure (Ready, Not Yet Surfaced in UI)
- `userCompetencies` table — competency levels (1–5 scale per domain)
- `userNarratives` table — narrative texts structured as future embedding sources for vector/semantic search
- `evidenceLogs` table — signals from kudos events and narratives for automated skill inference
- `inferredSkills` table — proficiency scores (0–100) auto-populated from learning progress
- Architecture is vector-search ready for a future AI-powered Talent Search feature

---

## LLMs Used

| Model | Provider | Used For | Temp | Max Tokens |
|---|---|---|---|---|
| `gemini-2.0-flash` | Google Gemini | Recognition message generation | 0.7 | 200 |
| `gemini-2.0-flash` | Google Gemini | Micro-lesson generation | 0.7 | Uncapped (JSON) |
| `gemini-2.0-flash` | Google Gemini | Quiz feedback generation | 0.8 | 150 |
| `gemini-2.0-flash` | Google Gemini | Next-topic suggestion | 0.7 | 30 |

**SDK**: `@google/generative-ai` v0.24.1  
**Key**: Managed via `GEMINI_API_KEY` environment variable

---

## Tech Stack

### Frontend

| Category | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| UI Components | Radix UI + Shadcn/ui |
| Styling | Tailwind CSS 4.1, tailwind-merge, tailwindcss-animate |
| Auth | Azure MSAL v5 (`@azure/msal-browser`, `@azure/msal-react`) |
| Forms | react-hook-form + Zod validation |
| Charts | Recharts 2.15 |
| Markdown Rendering | react-markdown 10 |
| Date Utilities | date-fns 4 |
| Icons | lucide-react |
| Carousel | embla-carousel-react |
| Analytics | @vercel/analytics |
| Theming | next-themes (dark mode) |
| Notifications | sonner (toasts) |

### Backend

| Category | Technology |
|---|---|
| Framework | Express.js 5 |
| Language | TypeScript 5 |
| Runtime | Node.js (tsx for dev, tsc build for prod) |
| ORM | Drizzle ORM 0.45 with Drizzle Kit migrations |
| Database | PostgreSQL 16 (via `pg` driver) |
| Auth Middleware | Passport.js + passport-azure-ad (Bearer token strategy) |
| AI SDK | @google/generative-ai 0.24 |
| API Docs | Swagger (swagger-jsdoc + swagger-ui-express, OpenAPI 3.0) |
| Environment | dotenv |

### Database Schema (PostgreSQL)

| Table | Purpose |
|---|---|
| `users` | User profiles, roles (user/admin), tenant membership |
| `tenants` | Multi-tenant organization records |
| `recognitionEvents` | All Kudos, Shout Outs, Spot Awards with metadata |
| `customTemplates` | User/admin-created card templates with background images |
| `messageTemplates` | System and custom recognition message templates (50+ defaults) |
| `userLearningProfiles` | Tech stack, goals, approval status (DRAFT → PENDING → APPROVED) |
| `learningContent` | AI-generated lessons: topic, markdown content, exercises, quiz questions |
| `userLearningProgress` | Per-day tracking: quiz answers, scores, AI feedback, points earned |
| `userRewards` | Gamification: total points, streak count, badges, level |
| `inferredSkills` | Auto-scored proficiency levels (0–100) from learning data |
| `userCompetencies` | Manual or inferred competency ratings (1–5) |
| `userNarratives` | Text narratives as future vector embedding sources |
| `evidenceLogs` | Evidence signals from kudos and narratives for skill inference |

### Infrastructure & DevOps

| Component | Technology |
|---|---|
| Monorepo | Turborepo (parallel builds, unified dev scripts) |
| Containerization | Docker + Docker Compose (local & prod configs) |
| Reverse Proxy | Nginx |
| Cloud Auth | Azure Active Directory (2-app registration model: SPA + API) |
| Build | tsc (backend), Next.js build (frontend) |

---

## Architecture Summary

```
Browser (Next.js 15)
    │  Azure MSAL Bearer Token
    ▼
Express.js 5 API (TypeScript)
    │
    ├── Passport.js Azure AD Middleware
    ├── AIAssistantService  ──► Google Gemini 2.0 Flash
    ├── AILearningService   ──► Google Gemini 2.0 Flash
    ├── LearningService (orchestration)
    ├── RecognitionService
    └── Drizzle ORM ──► PostgreSQL (multi-tenant schema)
```

**Prompt Engineering Pattern**:
- Structured JSON output enforced via prompt instructions (no function calling)
- Markdown code block stripping via regex before JSON.parse
- Graceful fallback on Gemini failure (default feedback text returned)
- Hard character constraints embedded in prompts, not just post-processed

---

## Resume Positioning

> **Reflecto-AI** — AI-Powered Talent Intelligence Platform  
> *Full-stack SaaS | Next.js 15, Express.js 5, PostgreSQL, Google Gemini 2.0 Flash, Azure AD, Docker*

- Architected and built an end-to-end multi-tenant SaaS platform combining employee recognition workflows with AI-driven personalized learning
- Integrated **Google Gemini 2.0 Flash** for four distinct AI features: recognition message generation (tone-aware, character-constrained), micro-lesson generation (structured JSON output), quiz feedback evaluation, and intelligent next-topic suggestion
- Designed talent intelligence data model with inference-ready tables for competencies, skill scores, and narratives — laying groundwork for AI-powered semantic talent search
- Implemented enterprise authentication using **Azure Active Directory** (MSAL v5) with role-based access control and multi-tenant data isolation
- Built gamification system (points, streaks, badges) driven by AI-evaluated learning performance
- Used **Drizzle ORM** with typed migrations on PostgreSQL, **Turborepo** for monorepo orchestration, and **Docker Compose** for containerized deployment
