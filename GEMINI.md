# Kudos App - Gemini Context

## Project Overview

This project is a web-based "Kudos Card" generator and management platform. It allows employees to recognize their peers by creating personalized appreciation cards using predefined templates. It includes features for card generation (canvas-based), local storage persistence, and an admin dashboard for analytics.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI (via shadcn/ui), Lucide React (icons)
- **State/Form**: React Hook Form, Zod
- **Persistence**: Local Storage (Simulation), Google Sheets integration (Logging)
- **Deployment**: Vercel (Ready)

## Key Features

1.  **Authentication**:
    - Simple dummy authentication in `app/page.tsx`.
    - Roles: `admin`, `user`.
    - Credentials: `admin@kudoscard.com` / `password123`.

2.  **Dashboard (Create Card)**:
    - Path: `app/dashboard/page.tsx`.
    - Select from 5 templates (Customer Centricity, Agility, etc.).
    - Form: Recipient Name, Message (with presets), Image Upload.
    - Functionality: Generates an image using HTML Canvas (`lib/image-generator.ts`).

3.  **My Cards**:
    - Path: `app/dashboard/my-cards/page.tsx`.
    - View created cards.
    - Admins see all cards; Users see their own.
    - Options: Download, Delete.

4.  **Analytics (Admin Only)**:
    - Path: `app/dashboard/analytics/page.tsx`.
    - charts: Total cards, active users, template popularity.
    - Recent activity feed.

## Project Structure

- `app/`: Next.js App Router pages.
- `components/ui/`: Reusable UI components.
- `lib/`: Utilities (`auth.ts`, `card-storage.ts`, `image-generator.ts`).
- `public/`: Static assets (images).

## Data Flow

- Data is primarily stored in `localStorage` via `lib/card-storage.ts`.
- No real backend database currently exists.
- "Logging" to Google Sheets is implemented in `lib/google-sheets.ts` (likely client-side fetch).

## Known Constraints

- **Persistence**: Data is lost if local storage is cleared.
- **Auth**: Hardcoded, insecure.
- **Image Gen**: Client-side canvas, may vary by device.
- **Upload**: constrained to 5MB, stored as Base64/Blob in local storage (potential storage limit issues).
