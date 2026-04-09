# Reflecto-AI — Complete AI Feature Roadmap

> This document consolidates all planned and proposed AI enhancements into a single source of truth.
> It covers two categories: (A) Multimodal Ceremony Experience features, and (B) AI Intelligence &
> Engagement features. Features are reviewed for feasibility, cost, effort, and priority.

---

## Master Priority Matrix

| # | Feature | Category | Effort | Priority | Status |
|---|---|---|---|---|---|
| M1 | Smart Recognition Assistant | Multimodal | — | — | **Already Shipped** |
| M2 | AI-Generated Digital Badges | Multimodal | Medium | **High** | Recommended next |
| M3 | Personalized Achievement Soundtracks | Multimodal | Medium | Medium | After M2 |
| M4 | Cinematic Award Reveals | Multimodal | High | Low-Medium | After M3 |
| M5 | Sensory Achievement Celebration | Multimodal | Low | **High** | Depends on M2–M4 |
| A1 | Tone & Sentiment Coach | AI/UX | Low | **High** | Quick Win |
| A2 | Proactive Recognition Nudges | AI/Engagement | Medium | **Very High** | MVP2 |
| A3 | Analytics Narrative Summary | AI/Insights | Low | **High** | Quick Win |
| A4 | Manager Weekly Digest | AI/Retention | Medium | High | MVP2 |
| A5 | Smart Template Auto-Selection | AI/UX | Low | Medium | Quick Win |
| A6 | Auto-Recipient Suggestion | AI/UX | Medium | High | MVP2 |
| A7 | Learning Path Auto-Generation | AI/Growth | Medium | High | MVP3 |
| A8 | Recognition Gap Detection | AI/HR Intel | Medium | **Very High** | MVP3 |
| A9 | Talent Intelligence Search | AI/Strategic | High | **Very High** | MVP4 |
| A10 | AI-Powered Onboarding Assistant | AI/Engagement | Medium | High | MVP4 |

---

# Part A — Multimodal Ceremony Experience

---

## M1: Smart Recognition Assistant

### Proposal
AI helper that drafts polished recognition messages from a few notes, in the user's chosen tone.

### Recommendation: Already Implemented — No New Work Required

This feature is **fully shipped**. `AIAssistantService.generateMessage()` uses Gemini 2.0 Flash to
generate tone-aware messages (Professional, Casual, Funny, Inspiring) for all three recognition
types (Kudos, Shout Out, Spot Award) with character limits enforced at the prompt level.
The `AiMessageAssistant` dialog component is live on the Kudos and Shout Out pages.

**What to do instead:**
- Add a discoverable onboarding tooltip or empty-state prompt so first-time users find it
- Wire it into Feature M5 (Sensory Celebration) as the message step
- Update product docs to reflect this as a shipped, live capability

**Current API:** `POST /api/ai/generate-message`
**Current service:** `apps/backend/src/services/AIAssistantService.ts`

---

## M2: AI-Generated Digital Badges

### What It Is
Unique, one-of-a-kind digital badge artwork generated per recognition event — no two badges
look identical. A permanent digital asset displayed on the recipient's profile.

### Recommendation: Build First — Highest Multimodal ROI

Image generation is fast (~5–8s), cost-effective (~$0.03/image), and produces a persistent
verifiable digital asset. Clear visual uniqueness, no latency UX problems, and works standalone
without needing video or audio infrastructure.

### Technical Correction
The proposal mentions "Gemini 3 Flash Image" — this model does not exist publicly. Correct options:

| Option | Model | Quality | Latency | Cost/image |
|---|---|---|---|---|
| **Recommended** | **Imagen 3** (Vertex AI) | Highest | ~5–8s | ~$0.03–0.04 |
| Alternative | Gemini 2.0 Flash (image gen mode) | Good | ~3–6s | Lower |

Imagen 3 is Google's purpose-built image model and produces higher quality results for detailed
digital art than Gemini's image generation mode.

### Prompt Strategy
```
Generate a digital badge/trophy icon for a professional recognition award.
Category: {category}  (e.g. "Leadership", "Innovation", "Mentorship")
Style: flat vector art, vibrant colors, clean and premium feel, 512x512
Mood: {mood}  (e.g. energetic, prestigious, warm)
Do not include any text. The icon should feel unique and collectible.
```

### Generation Flow
```
Recognition event created (existing POST /api/recognition)
        ↓
Event saved to DB immediately — recipient notified instantly (no change to existing flow)
        ↓
Async badge generation job queued
        ↓
Imagen 3 API → PNG bytes
        ↓
Upload to Google Cloud Storage → public URL stored in recognitionEvents.badgeImageUrl
        ↓
Push notification to recipient: "Your achievement badge is ready"
        ↓
Badge displayed on recognition card + user profile badge gallery
```

### Database Changes
```sql
ALTER TABLE recognitionEvents ADD COLUMN badgeImageUrl TEXT;
ALTER TABLE recognitionEvents ADD COLUMN badgeStatus TEXT DEFAULT 'pending';
-- badgeStatus: pending | generating | ready | failed
ALTER TABLE users ADD COLUMN badgeGallery JSONB DEFAULT '[]';
```

### New API Endpoints
- `GET /api/recognition/:id/badge` — badge URL + status for a specific event
- `GET /api/users/me/badges` — full badge gallery for current user profile

### New Backend Service
`apps/backend/src/services/BadgeGenerationService.ts`

### Frontend Additions
- Badge gallery section on user profile page
- Badge image shown on received recognition card
- Animated scale/glow reveal on first view (CSS transition, no video required)
- "Regenerate" button (rate-limited: once per event)

### Cost Estimate
~$0.03/image × 500 events/month = **~$15/month per tenant**

### Effort: Medium (3–5 days)

---

## M3: Personalized Achievement Soundtracks

### What It Is
A unique 30-second instrumental music track composed for each recognition event, matching the
emotional tone of the award — energetic for a big win, inspiring for mentorship.

### Recommendation: Build Second — Opt-In, Strong Emotional Impact

Music creates a uniquely powerful emotional response. The critical UX constraint: audio must
**never** auto-play. In corporate environments, auto-playing audio is disruptive and inaccessible.
Done as an explicit user-initiated action, this is a genuine differentiator.

### Technical Stack
**Model:** Lyria (Google DeepMind) via **Vertex AI Music Generation API**

```typescript
import { VertexAI } from '@google-cloud/vertexai';
const vertexAI = new VertexAI({ project: process.env.GCP_PROJECT_ID });
// Lyria endpoint via Vertex AI media generation
```

### Prompt Strategy
```
Generate a 30-second instrumental music track.
Occasion: Employee recognition award — {category}
Energy: {energy}  (e.g. "high energy and celebratory" | "warm and inspiring" | "uplifting")
Style: Modern, positive, no lyrics, suitable for office playback
Format: MP3
```

### Energy Mapping by Award Type
| Award / Category | Energy | Style |
|---|---|---|
| Spot Award | High | Triumphant, percussive, fast tempo |
| Kudos | Medium | Upbeat, warm, melodic |
| Shout Out | Medium-High | Ensemble feel, celebratory |
| Mentorship | Low-Medium | Inspiring, strings, building progression |
| Innovation | High | Electronic, forward-moving, bright |
| Leadership | Medium | Confident, orchestral, building |

### Generation Flow (Async — Same Pattern as Badges)
```
Recognition event created
        ↓
Async soundtrack job queued
        ↓
Lyria API → MP3 bytes
        ↓
Upload to GCS → URL stored in recognitionEvents.soundtrackUrl
        ↓
Available in recipient's celebration view as a play button
```

### Database Changes
```sql
ALTER TABLE recognitionEvents ADD COLUMN soundtrackUrl TEXT;
ALTER TABLE recognitionEvents ADD COLUMN soundtrackStatus TEXT DEFAULT 'pending';
```

### New API Endpoint
`GET /api/recognition/:id/soundtrack`

### UX Rules (Non-Negotiable)
- **Never auto-play** — always user-initiated via an explicit play button
- Show a waveform visualizer (static or animated) while playing
- Add a user preference toggle: "Enable achievement soundtracks" (default: off)
- Graceful fallback: if generation fails, recognition event is unaffected

### Cost Estimate
~$0.07/track × 500 events/month = **~$35/month per tenant**
Consider making soundtracks an admin-enabled premium feature toggle per tenant.

### Effort: Medium (3–5 days)

---

## M4: Cinematic Award Reveals

### What It Is
A 5-second AI-generated cinematic video that unveils the achievement, with visuals themed to
the award category — created using Google's Veo video generation model.

### Recommendation: Build Last — Highest Impact, Highest Complexity

This is the most visually impressive feature but comes with real engineering constraints:
generation latency (45–120 seconds), cost (~$0.30/video), and storage. These are solvable,
but require careful async architecture and a cost mitigation strategy before going live.

### Technical Stack
**Model:** **Veo 3** (Google DeepMind) via Google Cloud Vertex AI Video Generation API

### Critical Architecture Rule: Never Block on Generation

Veo 3 takes 45–120 seconds to generate. This must **always** be asynchronous:

```
User sends recognition → Event saved + recipient notified IMMEDIATELY (no change)
                                 ↓
                    Background job: generate_video(eventId, category)
                                 ↓
                         [45–120 seconds later]
                                 ↓
                    Veo 3 returns video → Upload to GCS
                    recognitionEvents.videoUrl set, videoStatus = 'ready'
                                 ↓
                    WebSocket/SSE push: "Your cinematic reveal is ready"
                                 ↓
                    Recipient opens celebration view — video plays
```

### Prompt Strategy
```
Create a 5-second cinematic reveal video for a professional achievement.
Theme: {category}  (e.g. "Leadership", "Innovation", "Teamwork")
Style: Cinematic, high-definition, abstract or symbolic visuals — no people, no text, no logos
Mood: {mood} — triumphant / inspiring / energetic / warm
End frame: Subtle sparkle or glow effect suitable for text overlay
```

### Category-to-Visual Mapping
| Category | Suggested Visual |
|---|---|
| Leadership | Rising sun, mountain peak, compass |
| Innovation | Circuit patterns, light beams, geometric morphing |
| Teamwork | Interlocking shapes, synchronized movement |
| Mentorship | Candle flame, growing plant, passing of light |
| Excellence | Gold particle burst, podium illumination |
| Customer Focus | Ripple effect, bridge, expanding circles |

### Database Changes
```sql
ALTER TABLE recognitionEvents ADD COLUMN videoUrl TEXT;
ALTER TABLE recognitionEvents ADD COLUMN videoStatus TEXT DEFAULT 'pending';
-- videoStatus: pending | generating | ready | failed
```

### New Endpoints
- `GET /api/recognition/:id/video-status` — polled by frontend
- Webhook receiver from Veo API on completion

### Cost Mitigation Strategies
1. **Category-level caching:** Generate 3–5 video variants per award category monthly.
   Assign randomly per event. Reduces cost by ~80%.
2. **Admin toggle:** Video reveals off by default; admins enable per tenant.
3. **Budget cap:** GCP billing alerts at $X/month per tenant; auto-disable if exceeded.

### Cost Estimate
~$0.06/event (with caching) × 500 events/month = **~$30/month per tenant (cached)**
Without caching: ~$150/month — requires the caching strategy before launch.

### Effort: High (1–2 weeks)
Vertex AI Veo 3 integration, async polling, video storage + CDN, WebSocket notification, admin toggle.

---

## M5: Sensory Achievement Celebration

### What It Is
A synchronized full-screen experience that plays the video, music, and recognition message
together when the recipient first opens a new award.

### Recommendation: Build as the Orchestration Layer — Low Effort, High UX Impact

This is not a standalone AI feature — it is the **presentation layer** tying M2, M3, and M4 together.
Build it progressively: it enhances with each asset that becomes available.

### Progressive Enhancement Levels
```
Level 1 (Today):         Badge placeholder + message + confetti animation
Level 2 (After M2):      Unique AI badge reveal + message + confetti
Level 3 (After M3):      AI badge + audio play button + message + confetti
Level 4 (After M4):      Full cinematic video + audio + AI badge + message
```

### Orchestration API
**New endpoint:** `GET /api/recognition/:id/celebration`

```typescript
async function buildCelebrationPayload(eventId: string) {
  const event = await getRecognitionEvent(eventId);
  return {
    message: event.message,
    senderName: event.senderName,
    category: event.category,
    badgeUrl: event.badgeImageUrl ?? null,
    soundtrackUrl: event.soundtrackUrl ?? null,
    videoUrl: event.videoStatus === 'ready' ? event.videoUrl : null,
    confetti: true,
  };
}
```

### Frontend Celebration Sequence
```
Page /dashboard/recognition/:id/celebrate loads
         ↓
If videoUrl exists → play full-screen video (muted)
Else              → fade-in category gradient background
         ↓
At 3s mark (or video end):
    AI badge appears with scale + glow animation
         ↓
    Sender name + message text (typewriter effect)
         ↓
    "Play your soundtrack" button appears (if soundtrackUrl exists)
         ↓
    Confetti burst
         ↓
    Share to profile / Download badge / Done CTAs
```

### Database Change
```sql
ALTER TABLE recognitionEvents ADD COLUMN celebrationViewedAt TIMESTAMP;
-- Ensures the full-screen experience only triggers once
```

### Effort: Low–Medium (2–3 days)

---

## Recommended Multimodal Build Sequence

```
Phase 0 — No Code (This Week)
└── M1: Make Smart Recognition Assistant discoverable via UI tooltip/onboarding

Phase 1 — Visual Foundation (Weeks 1–2)
├── M2: AI-Generated Digital Badges (Imagen 3)
└── M5: Celebration Layer 2 (badge reveal + confetti)

Phase 2 — Audio Layer (Weeks 3–4)
├── M3: Personalized Achievement Soundtracks (Lyria)
└── M5: Celebration Layer 3 (add audio play button)

Phase 3 — Cinematic Layer (Weeks 5–7)
├── M4: Cinematic Award Reveals (Veo 3, with category caching)
└── M5: Celebration Layer 4 (full orchestrated experience)
```

---

## New Infrastructure Required for Multimodal Features

| Component | Purpose |
|---|---|
| Google Cloud Vertex AI | Imagen 3 (badges), Lyria (audio), Veo 3 (video) |
| Google Cloud Storage bucket | Persist generated images, audio, video |
| CDN (GCS public URLs or Cloud CDN) | Fast asset delivery globally |
| Async job queue | Non-blocking generation (BullMQ on Redis, or DB-backed queue) |
| WebSocket or Server-Sent Events | Notify frontend when async assets are ready |
| GCP billing alerts | Cost monitoring per tenant |

---

## Multimodal Cost Summary (Per Tenant, 500 Events/Month)

| Feature | Model | Cost/Event | Monthly |
|---|---|---|---|
| Digital Badges | Imagen 3 | ~$0.03 | ~$15 |
| Soundtracks | Lyria | ~$0.07 | ~$35 |
| Cinematic Reveals (cached) | Veo 3 | ~$0.06 | ~$30 |
| Recognition Messages | Gemini 2.0 Flash | ~$0.001 | ~$0.50 |
| **Total multimodal** | | | **~$80/month** |

---

---

# Part B — AI Intelligence & Engagement Features

> Originally documented in `ai-features-roadmap.md`. Reproduced and integrated here for completeness.

---

## A1: Tone & Sentiment Coach

**What it does:**
As a user types a Kudos or Shout Out message, AI analyses the text in real time and provides a
quality score with actionable suggestions — without blocking the submit flow.

**User experience:**
- Small indicator below the message box: *"Generic — try mentioning a specific behaviour or project"*
- Updates as the message improves; shows "Looks great!" when specific and warm

**Why it matters:**
Generic recognition ("Good job!") has low psychological impact. This nudges users toward meaningful,
specific messages without forcing them.

**Implementation:**
- Debounced Gemini call after 500ms inactivity
- Prompt: *"Rate this recognition message for specificity and warmth 1–3. Return JSON: { score, feedback }"*
- New endpoint: `POST /api/ai/message-coach`
- Frontend: inline feedback below Textarea on Kudos and Shout Out pages

**Effort:** Low | **Priority:** High (Quick Win)

---

## A2: Proactive Recognition Nudges

**What it does:**
Monitors Azure AD signals (work anniversaries, role changes) and recognition history (time since
last kudos sent/received) and surfaces timely nudges on the dashboard.

**User experience:**
- Dashboard card: *"John's 3-year anniversary is tomorrow — send a kudos?"*
- One-click pre-fills the Kudos form with recipient and a suggested message
- Dismissable per suggestion

**Why it matters:**
Most employees intend to recognise colleagues but forget. This converts intent into action.

**Implementation:**
- Azure AD `GET /users/{id}` — pulls `hireDate`, `birthday` (if org populates them)
- On-login check + optional cron job
- New DB table: `recognitionNudges (id, userId, recipientId, triggerType, message, dismissedAt, sentAt)`
- New endpoints: `GET /api/nudges`, `POST /api/nudges/:id/dismiss`

**Effort:** Medium | **Priority:** Very High

---

## A3: Analytics Narrative Summary

**What it does:**
Instead of raw charts, AI generates a plain-English paragraph summarising recognition trends for
the current period, with anomalies and suggested actions.

**Example output:**
> *"Recognition was down 18% this month. Engineering sent the most kudos (12); Sales sent none.
> 4 employees have not received recognition in 60+ days — consider reaching out."*

**Implementation:**
- Aggregate stats from `recognitionEvents` table
- Pass stats JSON to Gemini: *"Summarise for an HR manager in 3–4 sentences. Highlight concerns."*
- Cache result 24 hours
- New endpoint: `GET /api/analytics/narrative`
- Frontend: summary card above charts on Analytics page

**Effort:** Low | **Priority:** High (Quick Win)

---

## A4: Manager Weekly Digest

**What it does:**
Every Monday, managers receive an in-app notification with an AI-generated summary of their team's
recognition activity from the past week, including missed recognition opportunities.

**Example output:**
> *"This week: 3 kudos sent by your team, 5 received. Sarah hasn't been recognised in 45 days —
> she shipped the auth module last week. Tap to send a kudos."*

**Implementation:**
- Cron job (Monday 9am) per manager
- Pull team recognition data + Azure AD org chart
- Gemini generates personalised digest copy
- New DB table: `managerDigests (id, managerId, weekOf, content, readAt)`
- New endpoints: `GET /api/digests/latest`
- Optional: SendGrid/SMTP email delivery

**Effort:** Medium | **Priority:** High

---

## A5: Smart Template Auto-Selection

**What it does:**
As a user starts typing a message, AI silently detects intent and auto-switches to the most
appropriate card template and category.

**Example:**
- User types: *"Congrats on completing the AWS certification!"*
- Template switches to "Learning & Growth", toast: *"Switched to Learning template"*
- User can override manually

**Implementation:**
- Debounced Gemini call: *"Classify this message. Return JSON: { templateId, category, confidence }"*
- Auto-switch only if confidence > 0.8
- New endpoint: `POST /api/ai/classify-message`

**Effort:** Low | **Priority:** Medium

---

## A6: Auto-Recipient Suggestion

**What it does:**
When a user types a Shout Out headline, AI suggests relevant recipients by cross-referencing Azure
AD departments, job titles, and recent activity patterns.

**Example:**
- User types: *"Amazing work on the Q3 product launch!"*
- AI suggests: *"Add the Product team? (8 members)"*

**Implementation:**
- Extract keywords from message via Gemini
- Match against Azure AD department names, job titles, group memberships
- Frontend: suggestion chip below recipient field

**Effort:** Medium | **Priority:** High

---

## A7: Learning Path Auto-Generation

**What it does:**
An employee inputs a plain-English goal and AI generates a complete Tech Growth Plan — phases,
lesson recommendations, milestones, and timelines — for manager review and approval.

**Example:**
- Input: *"Become a senior cloud engineer in 12 months"*
- Output: Structured 12-month plan with phases, recommended lesson topics, monthly checkpoints

**Implementation:**
- Gemini prompt returns structured JSON plan
- Maps recommended topics to existing `learningContent` records
- New endpoint: `POST /api/learning/generate-plan`
- Frontend: "Generate with AI" button on Tech Growth Plan page
- Syncs to existing `userLearningProfiles` approval workflow

**Effort:** Medium | **Priority:** High

---

## A8: Recognition Gap Detection (HR Dashboard)

**What it does:**
AI continuously analyses recognition patterns and surfaces equity and engagement risks to HR admins.

**Insights surfaced:**
- Teams with zero recognition in N days
- Individuals who send a lot but receive little (or vice versa)
- Recognition concentration (e.g. 80% of kudos going to 20% of people)
- Month-over-month anomalies
- Remote vs. in-office recognition disparity

**Implementation:**
- Aggregate queries on `recognitionEvents`
- Gemini interprets stats and generates insight copy + recommended action
- New endpoint: `GET /api/analytics/insights` (admin-only)
- Frontend: new Insights tab on Analytics page; exportable PDF report

**Effort:** Medium | **Priority:** Very High

---

## A9: Talent Intelligence Search

**What it does:**
Natural language search that lets managers and HR find employees by skills, certifications,
project history, or availability — pulling from Azure AD and Tech Growth Plan data.

**Example queries:**
- *"Who in Engineering has Kubernetes experience and is available for a new project?"*
- *"Find someone with Python expertise who completed a data science course recently"*

**Implementation:**
- Azure AD `GET /users?$select=skills,jobTitle,department`
- Tech Growth data from `userLearningProfiles` + `learningContent`
- Gemini extracts intent and entities from natural language query
- Filter/rank Azure AD results against extracted criteria
- New endpoint: `POST /api/talent/search`
- New page: `/dashboard/talent-search` (sidebar Intelligence section re-enabled)

**Effort:** High | **Priority:** Very High

---

## A10: AI-Powered Onboarding Assistant

**What it does:**
New employees get a conversational AI guide for their first 30/60/90 days — answering questions,
suggesting who to connect with, recommending learning content, and prompting them to introduce
themselves via a Shout Out.

**Example:**
> *"Hi Alex! Welcome to Acme Corp. I see you're in Engineering. Want me to suggest 3 people to
> connect with this week?"*

**Implementation:**
- Track account creation via Azure AD `createdDateTime`; show to users < 90 days old
- Gemini-powered chat with org context in system prompt
- Conversation history in new `onboardingChats` table
- Frontend: floating chat widget (auto-hides after 90 days)

**Effort:** Medium | **Priority:** High

---

## Recommended Combined Implementation Sequence

```
Phase 0 — No Code (This Week)
└── M1: Improve discoverability of Smart Recognition Assistant (tooltip/onboarding)

Phase A — Quick Wins (Weeks 1–3)
├── A1: Tone & Sentiment Coach
├── A3: Analytics Narrative Summary
└── A5: Smart Template Auto-Selection

Phase B — Multimodal Foundation + Engagement (Weeks 4–7)
├── M2: AI-Generated Digital Badges (Imagen 3)
├── M5: Celebration Layer 2 (badge reveal + confetti)
├── A2: Proactive Recognition Nudges
├── A4: Manager Weekly Digest
└── A6: Auto-Recipient Suggestion

Phase C — Audio + Learning Intelligence (Weeks 8–11)
├── M3: Personalized Achievement Soundtracks (Lyria)
├── M5: Celebration Layer 3 (audio)
├── A7: Learning Path Auto-Generation
└── A8: Recognition Gap Detection

Phase D — Cinematic + Strategic (Weeks 12–16)
├── M4: Cinematic Award Reveals (Veo 3)
├── M5: Celebration Layer 4 (full experience)
├── A9: Talent Intelligence Search
└── A10: AI Onboarding Assistant
```

---

## Technical Foundation Status

| Requirement | Status |
|---|---|
| Gemini API integration | ✅ Done |
| Azure AD / Graph API | ✅ Done |
| PostgreSQL + Drizzle ORM | ✅ Done |
| Recognition event data store | ✅ Done |
| Tech Growth Plan data store | ✅ Done |
| Google Cloud Vertex AI (Imagen 3, Lyria, Veo 3) | ❌ Not yet set up |
| Google Cloud Storage (media assets) | ❌ Not yet set up |
| Async job queue (BullMQ / DB-backed) | ❌ Not yet set up |
| WebSocket / SSE (async asset notifications) | ❌ Not yet set up |
| Cron job runner (digests, nudges) | ❌ Not yet set up |
| Email delivery (digests) | ❌ Not yet set up |
| Azure AD HR fields (hireDate, skills) | ⚠️ Depends on org's AD population |

---

*Document created: April 2026*
*Author: Reflecto-AI Engineering*
*Supersedes: `ai-features-roadmap.md` (text/LLM features now consolidated here)*
