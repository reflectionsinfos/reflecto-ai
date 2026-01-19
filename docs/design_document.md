# Design Document

## Architecture Overview

The application is a client-side heavy Next.js application using the App Router. It relies on `localStorage` for data persistence, making it effectively a Single Page Application (SPA) in behavior regarding data.

### Components

#### 1. Pages (`app/`)

- **`page.tsx` (Login)**: Entry point. Manages auth state locally and redirects.
- **`dashboard/page.tsx` (Creator)**: Core feature. Orchestrates state for the multi-step creation process (Template -> Details -> Preview -> Success).
- **`dashboard/analytics/page.tsx`**: Visualization layer. Computes metrics on-the-fly from stored data.
- **`dashboard/my-cards/page.tsx`**: List view. Filters and renders `StoredCard` objects.

#### 2. Models & Data

- **`StoredCard`**:
  ```typescript
  interface StoredCard {
    id: string;
    recipientName: string;
    creatorName: string;
    creatorEmail: string;
    template: string;
    message: string;
    createdAt: string;
    thumbnailUrl: string; // Base64 string
    cardData: any; // Re-hydration data
  }
  ```
- **Storage**: `lib/card-storage.ts` manages CRUD operations against `localStorage`.

#### 3. Image Generation (`lib/image-generator.ts`)

- Uses HTML5 Canvas API.
- Draws template background, overlay images, text, and user-uploaded photos composited together.
- Exports as Blob/Base64 for download or storage.

#### 4. UI Library

- **Shadcn/UI**: Provides accessible primitives (Cards, Inputs, Dialogs).
- **Tailwind CSS**: Utility-first styling for layout and themes.

### Data Flow

1.  **User logs in** -> Auth state saved to `localStorage`.
2.  **User creates card** ->
    - Input validated.
    - Canvas draws image.
    - Data + Thumbnail saved to `localStorage`.
3.  **User views history** -> `localStorage` queried and filtered.
4.  **Admin views analytics** -> `localStorage` queried, aggregated in memory.

### Security & Limitations

- **Auth**: Completely verify client-side. No real security.
- **Storage**: Limited by browser quota (Local Storage usually ~5-10MB). Storing images as Base64 quickly hits this limit.
- **Performance**: Large number of cards will slow down the "database" queries (JSON parsing huge strings).
