# Code Review: Kudos Card Enhancements (branch `mvp1`)

**Reviewer:** Claude Code  
**Date:** 2026-04-29  
**Scope:** Commits on `mvp1` not yet in `main`, focused on the kudos card enhancement work: database-backed messages, custom templates, live preview, AI message assistant, and recognition event persistence.

---

## Overview

This branch delivers a substantial MVP-1 feature set:

- **Phase 1** – Kudos messages migrated from frontend hard-code to a `message_templates` DB table with a seed script.
- **Phase 2** – Custom template builder (UI hidden behind `{false && ...}`) with `custom_templates` and `custom_template_messages` tables and CRUD APIs.
- **Live preview** – Canvas-rendered card preview updated on a 800 ms debounce.
- **AI message assistant** – Gemini 2.0 Flash generates short recognition messages on demand.
- **Recognition persistence** – Cards saved to a unified `recognition_events` table; `CardStorageManager` migrated from localStorage to the backend API.
- **Outlook-style recipient selector** – Azure AD Graph search for individual and team recipients.

The architecture direction is sound. The concerns below are things to address before the next production deploy or before the Phase 2 UI is unhidden.

---

## Critical Issues

### 1. Demo-token bypass is not environment-gated

**File:** [apps/backend/src/middleware/auth.ts:56-65](apps/backend/src/middleware/auth.ts#L56-L65)

```ts
if (authHeader === 'Bearer demo-token') {
    req.user = { oid: 'demo-user-id', ... };
    return next();
}
```

Any request with the literal string `Bearer demo-token` bypasses Azure AD validation in **production**. This must be gated:

```ts
if (process.env.NODE_ENV !== 'production' && authHeader === 'Bearer demo-token') {
```

### 2. `validateIssuer: false` and PII logging enabled

**File:** [apps/backend/src/middleware/auth.ts:19-20](apps/backend/src/middleware/auth.ts#L19-L20)

- `validateIssuer: false` disables token issuer verification, accepting tokens from any Azure AD tenant. Set to `true` and configure the expected issuer explicitly.
- `loggingNoPII: false` causes `passport-azure-ad` to log user emails and names to stdout. Should be `true` in production.

### 3. `...req.body` spread without validation in recognition POST

**File:** [apps/backend/src/routes/recognition.routes.ts:56-59](apps/backend/src/routes/recognition.routes.ts#L56-L59)

```ts
const eventData = {
    ...req.body,         // ← unvalidated spread
    senderId: senderId,
};
```

A client can inject arbitrary fields (`type`, `privacyLevel`, `senderId` override attempt). Extract only the fields you trust:

```ts
const { type, recipients, imageBlob, metadata, privacyLevel } = req.body;
const eventData = { type, recipients, imageBlob, metadata, privacyLevel, senderId };
```

---

## Security Concerns

### 4. No input validation on message text or order range

**File:** [apps/backend/src/routes/messages.routes.ts:126-200](apps/backend/src/routes/messages.routes.ts#L126-L200)

`POST /api/messages` accepts `text` and `order` without length limits or range constraints. The `messageCategory` value is used in a DB query but only validated after the fact with `isMessageCategory`. Add schema validation (zod or express-validator) at the route entry point before any DB interaction.

### 5. No rate limiting on the AI generation endpoint

**File:** [apps/backend/src/routes/ai.routes.ts](apps/backend/src/routes/ai.routes.ts)

The Gemini generation endpoint has no rate limiting. A logged-in user can spam it indefinitely, running up API costs. Add per-user rate limiting (e.g., express-rate-limit keyed on `req.user.email`).

---

## Code Quality Issues

### 6. 1260-line monolithic page component

**File:** [apps/frontend/app/dashboard/kudos/page.tsx](apps/frontend/app/dashboard/kudos/page.tsx)

The entire kudos page — template selection, form handling, preview, modals, custom template CRUD, and message fetching — lives in one component with 20+ state variables. Suggested decomposition:

| Component | Responsibility |
|---|---|
| `TemplateSelector` | Built-in + custom template grid |
| `RecipientForm` | `RecipientSelector` + image upload |
| `MessageForm` | Pre-generated dropdown + AI assistant + textarea |
| `CardPreview` | Live canvas preview + full-screen modal |
| `SuccessModal` | Post-generate actions |
| `TemplateSwitchDialog` | Confirmation dialog |
| `useKudosForm` hook | All form state + handlers |

### 7. Pervasive `any` typing loses type safety

**File:** [apps/frontend/app/dashboard/kudos/page.tsx:151,174,175,177,695](apps/frontend/app/dashboard/kudos/page.tsx#L151)

```ts
const [selectedTemplate, setSelectedTemplate] = useState<any>(templates[0])
const [pendingTemplate, setPendingTemplate] = useState<any | null>(null)
const [generatedCardData, setGeneratedCardData] = useState<any>(null)
```

Define a `Template` discriminated union and use it throughout:

```ts
type BuiltinTemplate = { _isCustom?: false; id: string; name: string; ... }
type CustomTemplate  = { _isCustom: true; _savedId: string; id: string; name: string; ... }
type Template = BuiltinTemplate | CustomTemplate
```

### 8. Dead code: custom template UI wrapped in `{false && ...}`

**Files:**  
[apps/frontend/app/dashboard/kudos/page.tsx:776](apps/frontend/app/dashboard/kudos/page.tsx#L776)  
[apps/frontend/app/dashboard/kudos/page.tsx:1108](apps/frontend/app/dashboard/kudos/page.tsx#L1108)

The entire custom template section is gated with `{false && (...)}`. All related state (`savedCustomTemplates`, `showCustomDialog`, `isSavingTemplate`, `customForm`, `customFormErrors`, `deletingTemplateId`) and their `useEffect` fetch still run. Either:

- Use a feature flag constant (`const CUSTOM_TEMPLATES_ENABLED = false`) so it's clear this is intentional, and move the dead state inside a conditional, or
- Fully remove the code until Phase 3 begins.

### 9. Double thumbnail generation (wasted computation)

**File:** [apps/frontend/app/dashboard/kudos/page.tsx:578-597](apps/frontend/app/dashboard/kudos/page.tsx#L578-L597)

`thumbnailBase64` is computed via `toBlob → URL.createObjectURL` (line 579-583) and immediately discarded. Then `realThumbnailBase64` repeats the same `toBlob → FileReader` operation (lines 586-596). Remove the first block entirely; only the `FileReader` path is used.

### 10. Memory leak: `previewImageUrl` not revoked on unmount

**File:** [apps/frontend/app/dashboard/kudos/page.tsx:366-374](apps/frontend/app/dashboard/kudos/page.tsx#L366-L374)

```ts
const url = URL.createObjectURL(blob)
setPreviewImageUrl((prev) => {
    if (prev) URL.revokeObjectURL(prev)
    return url
})
```

The previous URL is revoked correctly on the next preview, but if the component unmounts with an active `previewImageUrl`, the object URL is leaked. Add a cleanup in the `useEffect`:

```ts
return () => {
    if (previewImageUrl) URL.revokeObjectURL(previewImageUrl)
}
```

### 11. `generateLivePreview` missing from `useEffect` dependency array

**File:** [apps/frontend/app/dashboard/kudos/page.tsx:382-393](apps/frontend/app/dashboard/kudos/page.tsx#L382-L393)

The debounce `useEffect` calls `generateLivePreview` but does not include it in its dependency array. Memoize `generateLivePreview` with `useCallback` (with the appropriate deps) and add it to the array, or move the function body inline.

### 12. Raw `fetch()` mixed with `apiClient`

**File:** [apps/frontend/app/dashboard/kudos/page.tsx:223,237](apps/frontend/app/dashboard/kudos/page.tsx#L223-L237)

```ts
const res = await fetch(`/api/messages/all`)          // raw fetch
const res = await fetch(`/api/messages/template/...`) // raw fetch
```

These calls bypass the `apiClient`, which handles auth token injection and base-URL configuration. Replace with `apiClient.get(...)`.

### 13. `window.location.href` instead of Next.js router

**File:** [apps/frontend/app/dashboard/kudos/page.tsx:729](apps/frontend/app/dashboard/kudos/page.tsx#L729)

```ts
window.location.href = "/dashboard/my-cards"
```

This causes a full page reload. Use `useRouter` from `next/navigation`:

```ts
const router = useRouter()
// ...
router.push("/dashboard/my-cards")
```

### 14. Stale comment on creator name field

**File:** [apps/frontend/app/dashboard/kudos/page.tsx:959-961](apps/frontend/app/dashboard/kudos/page.tsx#L959-L961)

```
"This field is automatically populated from your login. Will be dynamic once SSO is implemented."
```

Azure AD SSO is already implemented. This comment is misleading and should be removed.

---

## Database / Backend Design Issues

### 15. Boolean columns stored as `varchar`

**File:** [apps/backend/src/db/schema.ts:127,153,154](apps/backend/src/db/schema.ts#L127)

```ts
isActive: varchar("is_active", { length: 10 }).default('true'),
lessonViewed: varchar("lesson_viewed", { length: 10 }).default('false'),
exerciseCompleted: varchar("exercise_completed", { length: 10 }).default('false'),
```

These should be `boolean` columns. Storing `'true'`/`'false'` as strings requires string-comparison workarounds everywhere in queries and breaks type inference.

### 16. Missing indexes on query-critical columns

**File:** [apps/backend/src/db/schema.ts](apps/backend/src/db/schema.ts)

No explicit indexes are defined for:

- `messageTemplates.templateId` — queried in every message fetch
- `customTemplateMessages.customTemplateId` — queried per custom template
- `recognitionEvents.senderId` — queried in "my cards" view

Add Drizzle index definitions for these columns.

### 17. Background images stored as base64 in DB

**File:** [apps/backend/src/db/schema.ts:33](apps/backend/src/db/schema.ts#L33)

```ts
backgroundImageBlob: text("background_image_blob"),
```

Storing base64-encoded images as DB text bloats row size, slows every query that reads the `customTemplates` table, and bypasses CDN caching. Upload images to Azure Blob Storage (or similar) and store only the URL.

The same concern applies to `recognitionEvents.imageBlob` — full-resolution card PNGs stored as base64 in a DB column will rapidly cause storage and performance issues.

### 18. Seed script creates duplicates on re-run

**File:** [apps/backend/src/scripts/seed-default-messages.ts:121](apps/backend/src/scripts/seed-default-messages.ts#L121)

```ts
await db.insert(messageTemplates).values(valuesToInsert);
```

Running the seed twice inserts duplicate rows. Use upsert semantics:

```ts
await db.insert(messageTemplates)
    .values(valuesToInsert)
    .onConflictDoNothing(); // or onConflictDoUpdate with a unique constraint
```

Add a unique constraint on `(templateId, messageCategory, order)`.

### 19. No pagination on recognition events endpoints

**File:** [apps/backend/src/routes/recognition.routes.ts:139,95](apps/backend/src/routes/recognition.routes.ts#L139)

`GET /api/recognition` and `GET /api/recognition/sent/me` return all records with no `LIMIT`. Add `limit` and `offset` query parameters.

### 20. Template type detection via UUID regex is fragile

**File:** [apps/backend/src/routes/messages.routes.ts:73](apps/backend/src/routes/messages.routes.ts#L73)

```ts
const isCustomTemplate = /^[0-9a-f]{8}-.../.test(templateId);
```

Routing logic between system and custom templates is determined by whether the `templateId` looks like a UUID. This is implicit coupling. An explicit `type` query parameter or a route split (e.g., `/api/messages/system/:id` vs `/api/messages/custom/:id`) would be cleaner and eliminates the regex dependency.

### 21. N+1 message fetch for custom templates

**File:** [apps/frontend/app/dashboard/kudos/page.tsx:236-248](apps/frontend/app/dashboard/kudos/page.tsx#L236-L248)

```ts
for (const template of savedCustomTemplates) {
    const res = await fetch(`/api/messages/template/${template.id}`)
    // ...
}
```

Each custom template triggers a separate sequential API call. Extend the `/api/messages/all` batch endpoint to include the current user's custom template messages in the same response.

### 22. `creatorName` hardcoded as `"User"` in card mapping

**File:** [apps/frontend/lib/card-storage.ts:23](apps/frontend/lib/card-storage.ts#L23)

```ts
creatorName: "User", // Backend doesn't always return creator name?
```

The recognition event should include the sender's name in `metadata` when saved (it's available at generation time on the frontend). The backend `recognitionEvents` table has a `senderId` FK to `users`; the `GET /sent/me` endpoint should join on `users.name` to return the real name.

---

## Minor / Style Issues

- **`_isCustom` and `_savedId` field naming** ([kudos/page.tsx:89-91](apps/frontend/app/dashboard/kudos/page.tsx#L89)): Underscore-prefixed fields on plain objects are an informal "internal" convention. Prefer a proper discriminated union type (see item 7).

- **`updateData: any` in messages PUT** ([messages.routes.ts:259,289](apps/backend/src/routes/messages.routes.ts#L259)): Type the update payload explicitly instead of accumulating into an `any` object.

- **`req: any, res` parameter types** throughout backend routes: Express provides `Request` and `Response` generics. Using `req: any` loses the type for `req.user` claims; create a typed interface extending `Request`.

- **`logDownload` is a no-op** ([card-storage.ts:101](apps/frontend/lib/card-storage.ts#L101)): Either implement or remove. Empty methods create confusion about expected behavior.

- **Success modal has two "Close" actions** ([kudos/page.tsx:1042-1051](apps/frontend/app/dashboard/kudos/page.tsx#L1042)): "Create Another" and "Close" both call `handleCreateAnother`. "Close" should close the modal without resetting the form, or the button should be removed.

---

## Summary Table

| Priority | Count | Examples |
|---|---|---|
| Critical (security) | 3 | Demo-token bypass, issuer validation off, req.body spread |
| High (correctness / perf) | 5 | Memory leak, N+1 fetch, no pagination, duplicate seed, base64 in DB |
| Medium (maintainability) | 8 | Monolith component, any types, dead code, double thumbnail, raw fetch |
| Low (style) | 6 | Boolean-as-varchar, missing indexes, no-op method, stale comment |

The most urgent items before the next production deploy are **items 1–5**. The component decomposition (#6) and type safety (#7) are the highest-value refactors for long-term maintainability.
