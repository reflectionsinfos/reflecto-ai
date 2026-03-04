# ReflectoAI — AI Feature Enhancement Roadmap

> This document outlines high-ROI AI/LLM opportunities across the ReflectoAI platform, prioritised by impact and implementation effort. All features leverage existing infrastructure (Gemini API, Azure AD, PostgreSQL) with minimal net-new dependencies.

---

## Priority Matrix

| # | Feature | Effort | ROI | Category |
|---|---|---|---|---|
| 1 | Tone & Sentiment Coach | Low | High | Quick Win |
| 2 | Proactive Recognition Nudges | Medium | Very High | Engagement |
| 3 | Analytics Narrative Summary | Low | High | Insights |
| 4 | Manager Weekly Digest | Medium | High | Retention |
| 5 | Smart Template Auto-Selection | Low | Medium | UX |
| 6 | Auto-Recipient Suggestion | Medium | High | UX |
| 7 | Learning Path Auto-Generation | Medium | High | Growth |
| 8 | Recognition Gap Detection | Medium | Very High | HR Intelligence |
| 9 | Talent Intelligence Search | High | Very High | Strategic |
| 10 | AI-Powered Onboarding Assistant | Medium | High | Engagement |

---

## Feature Specifications

---

### 1. Tone & Sentiment Coach

**What it does:**
As a user types their Kudos or Shout Out message, AI analyses the text in real time and provides a quality score with actionable suggestions — without blocking the user.

**User experience:**
- A small indicator appears below the message box (e.g. "Generic ·  Try mentioning a specific behaviour or project")
- Suggestions replace themselves as the message improves
- Shows a green "Looks great!" when the message is specific and warm

**Why it matters:**
Generic recognition ("Good job!") has low psychological impact. This nudges users toward meaningful, specific messages — improving recipient experience without forcing them.

**Implementation:**
- Debounced call to Gemini after 500ms of inactivity
- Prompt: *"Rate this recognition message for specificity and warmth on a scale of 1–3. Return JSON: { score: number, feedback: string }. Message: {text}"*
- Frontend: inline feedback component below Textarea in Kudos and Shout Out pages
- Backend: new `POST /api/ai/message-coach` endpoint
- No DB storage required

**Files to modify:**
- `apps/backend/src/routes/ai.routes.ts`
- `apps/backend/src/services/AIAssistantService.ts`
- `apps/frontend/app/dashboard/kudos/page.tsx`
- `apps/frontend/app/dashboard/shout-out/page.tsx`

---

### 2. Proactive Recognition Nudges

**What it does:**
The app monitors signals from Azure AD (work anniversaries, birthdays, role changes) and recognition history (time since last kudos sent/received) and surfaces timely, contextual nudges on the dashboard.

**User experience:**
- Dashboard shows a "Recognition Suggestions" section: *"John's 3-year work anniversary is tomorrow — send a kudos?"*
- One-click pre-fills the Kudos form with recipient and a suggested message
- Dismissable per suggestion

**Why it matters:**
Most employees intend to recognise colleagues but forget. This converts intent into action. Work anniversaries and milestones are the highest-engagement recognition moments.

**Implementation:**
- Azure AD `GET /users/{id}` returns `hireDate`, `birthday` fields (if populated)
- Scheduled job or on-login check: pull Azure AD signals for the logged-in user's team
- Gemini generates a pre-drafted message per signal
- Store nudge state (dismissed/sent) in a `recognitionNudges` table
- Frontend: card component on dashboard hub page

**New backend:**
- `recognitionNudges` DB table: `id, userId, recipientId, triggerType, message, dismissedAt, sentAt`
- `GET /api/nudges` — returns active nudges for the current user
- `POST /api/nudges/:id/dismiss`

---

### 3. Analytics Narrative Summary

**What it does:**
Instead of showing raw charts, AI generates a plain-English paragraph summarising recognition trends for the current period, with flagged anomalies and suggested actions.

**User experience:**
- Analytics page opens with an AI-written summary at the top:
  > *"Recognition activity was down 18% this month compared to February. The Engineering team sent the most kudos (12), while the Sales team sent none. 4 employees have not received any recognition in over 60 days — consider reaching out."*
- Refreshes monthly or on demand

**Why it matters:**
HR managers and team leads lack time to interpret charts. A narrative summary turns data into decisions in 10 seconds.

**Implementation:**
- Aggregate recognition stats from `recognitionEvents` table
- Pass stats summary to Gemini: *"Summarise these recognition stats for an HR manager in 3–4 sentences. Highlight concerns and positive trends. Stats: {JSON}"*
- Cache result for 24 hours
- Backend: `GET /api/analytics/narrative`
- Frontend: summary card above charts on Analytics page

---

### 4. Manager Weekly Digest

**What it does:**
Every Monday, managers receive an in-app notification (and optional email) with an AI-generated summary of their team's recognition activity from the past week.

**User experience:**
In-app notification panel shows:
> *"This week: 3 kudos sent by your team, 5 received. Sarah hasn't been recognised in 45 days — she shipped the authentication module last week. Tap to send a kudos."*

**Why it matters:**
Managers are the biggest lever for employee engagement. Giving them a weekly pulse with zero effort dramatically increases recognition frequency.

**Implementation:**
- Scheduled job (cron, Monday 9am) per manager
- Pull team recognition data from DB + Azure AD org chart
- Gemini generates personalised digest copy
- Store in `managerDigests` table; mark as read on view
- Optional: integrate with email via SendGrid/SMTP

**New backend:**
- `managerDigests` DB table: `id, managerId, weekOf, content, readAt`
- `GET /api/digests/latest` — returns current user's latest digest
- Cron job in `apps/backend/src/jobs/weekly-digest.ts`

---

### 5. Smart Template Auto-Selection

**What it does:**
When a user starts typing a Kudos message or headline, AI silently detects the intent and auto-switches to the most appropriate card template and category.

**User experience:**
- User types: *"Congrats on completing the AWS certification!"*
- Template switches to "Learning & Growth" and category to "Individual"
- A subtle toast: *"Switched to Learning template — looks like a milestone!"*
- User can override manually

**Why it matters:**
Users currently have to think about which template to pick. This removes cognitive overhead and ensures the card's visual style matches the message sentiment.

**Implementation:**
- Debounced Gemini call: *"Classify this recognition message. Return JSON: { templateId: string, category: 'individual'|'team', confidence: number }. Options: {templates}. Message: {text}"*
- Only auto-switch if confidence > 0.8
- Backend: extend `POST /api/ai/message-coach` or new `POST /api/ai/classify-message`

---

### 6. Auto-Recipient Suggestion

**What it does:**
When a user types a Shout Out headline or Kudos context, AI suggests relevant recipients by cross-referencing Azure AD departments, job titles, and recent activity patterns.

**User experience:**
- User types headline: *"Amazing work on the Q3 product launch!"*
- AI suggests: *"Add the Product team? (8 members)"* as a chip suggestion
- User can accept, modify, or ignore

**Why it matters:**
Users often know the context but forget specific names, especially for team-wide recognition. This bridges the gap.

**Implementation:**
- Extract keywords from headline/message via Gemini
- Match keywords against Azure AD department names, job titles, group memberships
- Suggest top-matching individual or group
- Frontend: suggestion pill below recipient field

---

### 7. Learning Path Auto-Generation

**What it does:**
A manager or employee inputs a goal (e.g. *"Become a senior cloud engineer in 12 months"*) and AI generates a complete Tech Growth Plan with recommended lessons, milestones, timelines, and success criteria.

**User experience:**
- On Tech Growth Plan page: *"Describe your goal in plain English"* input
- AI generates: structured plan with phases, lesson recommendations, monthly checkpoints
- Manager reviews and approves with one click
- Plan syncs to existing `userLearningProfiles` table

**Why it matters:**
Creating learning plans manually is time-consuming and inconsistent. AI can produce a well-structured plan in seconds that managers just need to approve — turning a 30-minute task into a 2-minute one.

**Implementation:**
- Gemini prompt: *"Generate a 12-month learning plan for an employee with goal: '{goal}'. Return JSON with phases, milestones, and recommended lesson topics."*
- Map recommended topics to existing `learningContent` records
- Backend: `POST /api/learning/generate-plan`
- Frontend: new "Generate with AI" button on Tech Growth Plan page

---

### 8. Recognition Gap Detection (HR Dashboard)

**What it does:**
AI continuously analyses recognition patterns across the organisation and surfaces equity and engagement risks to HR admins.

**Insights surfaced:**
- Teams/departments with zero recognition in N days
- Individuals who send a lot but receive little (or vice versa)
- Remote vs. office recognition disparity
- Recognition concentration (e.g. 80% of kudos going to 20% of people)
- Month-over-month trend anomalies

**User experience:**
- Admin-only "Insights" panel on Analytics page
- Each insight has a recommended action with a one-click shortcut
- Exportable as a PDF report

**Why it matters:**
Recognition equity is a real DEI metric. Companies that can demonstrate fair recognition distribution have stronger retention and inclusion scores. This turns ReflectoAI into a strategic HR tool, not just a card generator.

**Implementation:**
- Aggregate queries on `recognitionEvents` table
- Gemini interprets stats and generates insight copy
- Backend: `GET /api/analytics/insights` (admin-only)
- Frontend: new Insights tab on Analytics page

---

### 9. Talent Intelligence Search

**What it does:**
A natural language search engine that lets managers and HR find employees by skills, expertise, certifications, availability, or project history — pulling from Azure AD profiles and Tech Growth Plan data.

**Example queries:**
- *"Who in Engineering has Kubernetes experience and is available for a new project?"*
- *"Find someone with Python expertise who completed a data science course recently"*
- *"Which team members have leadership training and less than 2 active projects?"*

**User experience:**
- Dedicated `/dashboard/talent-search` page (currently planned/hidden)
- Natural language search bar
- Results show employee cards with matched skills highlighted
- One-click to send a kudos or assign to a project

**Why it matters:**
This is the highest strategic-value feature — it repositions ReflectoAI from a recognition tool to a full Talent Intelligence Platform. It directly addresses resource allocation, skills gap analysis, and internal mobility.

**Implementation:**
- Azure AD `GET /users` with `$select=skills,jobTitle,department` (requires HR data population)
- Tech Growth Plan data from `userLearningProfiles` and `learningContent`
- Gemini extracts intent and entities from natural language query
- Filter/rank Azure AD results against extracted criteria
- Backend: `POST /api/talent/search`
- Frontend: new page at `/dashboard/talent-search`

**Note:** Re-enable sidebar Intelligence section once page is built (see README for instructions).

---

### 10. AI-Powered Onboarding Assistant

**What it does:**
New employees get a conversational AI guide for their first 30/60/90 days — answering questions about the organisation, suggesting who to meet, recommending learning content, and prompting them to introduce themselves via a Shout Out.

**User experience:**
- Appears as a chat widget for users whose account is < 90 days old
- *"Hi Alex! Welcome to Acme Corp. I see you're in the Engineering team. Want me to suggest 3 people to connect with this week?"*
- Suggests relevant Kudos to send to their onboarding buddy
- Recommends learning paths based on their role

**Why it matters:**
Time-to-productivity for new hires is a major cost. An AI guide that surfaces the right people, content, and recognition moments at the right time dramatically improves onboarding experience.

**Implementation:**
- Track account creation date via Azure AD `createdDateTime`
- Gemini-powered chat with org context injected into system prompt
- Conversation history stored in `onboardingChats` table
- Frontend: floating chat widget (role-aware, auto-hides after 90 days)

---

## Implementation Sequence (Recommended)

```
Phase A (MVP2 — Quick Wins, 2–3 weeks)
├── Tone & Sentiment Coach          ← uses existing Gemini + AI endpoint
├── Smart Template Auto-Selection   ← low effort, high UX impact
└── Analytics Narrative Summary     ← existing data, new Gemini call

Phase B (MVP3 — Engagement, 3–4 weeks)
├── Proactive Recognition Nudges    ← Azure AD signals + new DB table
├── Manager Weekly Digest           ← cron job + Gemini copy generation
└── Auto-Recipient Suggestion       ← Azure AD groups + keyword matching

Phase C (MVP4 — Strategic, 4–6 weeks)
├── Learning Path Auto-Generation   ← extends existing Tech Growth module
├── Recognition Gap Detection       ← analytics queries + insight copy
├── Talent Intelligence Search      ← re-enables hidden feature with full backend
└── AI Onboarding Assistant         ← new chat widget + conversation store
```

---

## Technical Foundation Required

| Requirement | Status |
|---|---|
| Gemini API integration | ✅ Done |
| Azure AD / Graph API | ✅ Done |
| PostgreSQL + Drizzle ORM | ✅ Done |
| Recognition event data store | ✅ Done |
| Tech Growth Plan data store | ✅ Done |
| Cron job runner | ❌ Not yet set up |
| Email delivery (digests) | ❌ Not yet set up |
| Azure AD HR fields (hireDate, skills) | ⚠️ Depends on org's AD population |

---

*Document created: March 2026*
*Author: ReflectoAI Engineering*
