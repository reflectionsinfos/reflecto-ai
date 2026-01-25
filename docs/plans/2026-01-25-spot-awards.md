# Spot Awards Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an admin-only Spot Awards feature for HR to create premium recognition posters with golden trophy design, supporting up to 8 recipient photos and rich text formatting.

**Architecture:** Extends existing recognition system using `recognitionEvents` table with type `SPOT_AWARD`. Implements database-based role management (no Azure AD changes). Reuses image generation patterns from Kudos Cards.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, HTML Canvas API, Drizzle ORM, Express.js

---

## Phase 1: Role Management Infrastructure

### Task 1.1: Fix User Role Persistence

**Files:**

- Modify: `apps/backend/src/db/utils.ts:23-30`

**Changes:**

```typescript
// Only set default role for NEW users
if (!dbUser) {
  console.log(`ensureUserAndTenant: Creating user ${userObj.email}...`);
  const newUsers = await db
    .insert(users)
    .values({
      email: userObj.email,
      name: userObj.name,
      role: "user", // Default for new users only
      tenantId: tenant.id,
    })
    .returning();
  dbUser = newUsers[0];
}
// Remove any code that updates role for existing users
```

**Test:** Login as existing user, verify role doesn't change to "user"

**Commit:** `git commit -m "fix: preserve existing user roles on login"`

---

### Task 1.2: Create GET /api/users/me Endpoint

**Files:**

- Modify: `apps/backend/src/routes/user.routes.ts`
- Modify: `apps/backend/src/controllers/user.controller.ts`

**Add to routes:**

```typescript
router.get("/me", authenticate(), userController.getCurrentUser);
```

**Add to controller:**

```typescript
async getCurrentUser(req: any, res: any) {
    try {
        const email = req.user.email;
        const [user] = await db.select().from(users).where(eq(users.email, email));

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            tenantId: user.tenantId
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user' });
    }
}
```

**Test:** `curl http://localhost:4000/api/users/me -H "Authorization: Bearer <token>"`

**Commit:** `git commit -m "feat: add GET /api/users/me endpoint"`

---

### Task 1.3: Create Admin Middleware

**Files:**

- Create: `apps/backend/src/middleware/requireAdmin.ts`

**Code:**

```typescript
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export const requireAdmin = () => async (req: any, res: any, next: any) => {
  try {
    const email = req.user?.email;
    if (!email) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.dbUser = user;
    next();
  } catch (error) {
    res.status(500).json({ error: "Authorization check failed" });
  }
};
```

**Commit:** `git commit -m "feat: add requireAdmin middleware"`

---

### Task 1.4: Update Frontend useAuth Hook

**Files:**

- Modify: `apps/frontend/hooks/use-auth.tsx:21-44`

**Changes:**

```typescript
useEffect(() => {
  if (inProgress === "none" && accounts.length > 0) {
    const account = accounts[0];

    // Set active account
    if (!instance.getActiveAccount()) {
      instance.setActiveAccount(account);
    }

    // Fetch user role from backend
    const fetchUserRole = async () => {
      try {
        const tokenResponse = await instance.acquireTokenSilent({
          ...loginRequest,
          account: account,
        });

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/me`,
          {
            headers: {
              Authorization: `Bearer ${tokenResponse.accessToken}`,
            },
          },
        );

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Fallback to basic user
          setUser({
            id: account.localAccountId,
            name: account.name || "User",
            email: account.username,
            role: "user",
          });
        }
      } catch (err) {
        console.error("Failed to fetch user role", err);
        setUser({
          id: account.localAccountId,
          name: account.name || "User",
          email: account.username,
          role: "user",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserRole();
  } else if (inProgress === "none" && accounts.length === 0) {
    setUser(null);
    setIsLoading(false);
  }
}, [accounts, inProgress, instance]);
```

**Commit:** `git commit -m "feat: fetch user role from backend in useAuth"`

---

## Phase 2: Navigation & Routing

### Task 2.1: Add Spot Awards to Sidebar

**Files:**

- Modify: `apps/frontend/components/ui/app-sidebar.tsx:6,29-54`

**Changes:**

```typescript
// Add Trophy import
import { Trophy } from "lucide-react"

// In AppSidebar component, add useAuth
import { useAuth } from "@/hooks/use-auth"

export function AppSidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  const apps = [
    // ... existing items
    ...(user?.role === 'admin' ? [{
      name: "Spot Awards",
      icon: Trophy,
      href: "/dashboard/spot-awards",
      color: "text-amber-500",
    }] : [])
  ]
```

**Test:** Login as admin, verify "Spot Awards" appears in sidebar

**Commit:** `git commit -m "feat: add Spot Awards to sidebar for admins"`

---

### Task 2.2: Create Spot Awards Page

**Files:**

- Create: `apps/frontend/app/dashboard/spot-awards/page.tsx`

**Code:**

```typescript
"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Trophy } from "lucide-react"

export default function SpotAwardsPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user?.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  if (isLoading || user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Trophy className="w-8 h-8 text-amber-500" />
          Spot Awards
        </h1>
        <p className="text-muted-foreground mt-2">
          Create professional award posters to recognize exceptional achievements
        </p>
      </div>

      <div className="bg-card rounded-lg border p-6">
        <p className="text-center text-muted-foreground">
          Spot Awards Creator - Coming Soon
        </p>
      </div>
    </div>
  )
}
```

**Test:** Navigate to `/dashboard/spot-awards` as admin

**Commit:** `git commit -m "feat: create spot awards page with admin protection"`

---

## Phase 3: Spot Awards UI (Continued in next steps...)

**Remaining Tasks:**

- Task 3.1: Photo upload component
- Task 3.2: Form inputs (category, message)
- Task 3.3: Live preview canvas
- Task 3.4: Image generation logic
- Task 3.5: Backend API endpoints
- Task 3.6: Download functionality

---

**Next:** Implement Phase 3 components incrementally with testing at each step.
