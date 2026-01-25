# Spot Awards Feature - Testing Guide

## 🎯 What's Been Implemented

### Phase 1: Role Management (✅ Complete)

- ✅ Backend: GET /api/users/me endpoint
- ✅ Backend: requireAdmin() middleware
- ✅ Frontend: useAuth hook now fetches role from backend
- ✅ Database: Role persistence already correct

### Phase 2: Navigation & Basic UI (✅ Complete)

- ✅ Sidebar: "Spot Awards" menu item (admin-only)
- ✅ Route: /dashboard/spot-awards page with access protection
- ✅ UI: Basic page layout with Trophy icon

---

## 🧪 Testing Instructions

### Step 1: Make Yourself an Admin

Run this SQL query to grant yourself admin access:

```sql
UPDATE "reflecto-ai-2".users
SET role = 'admin'
WHERE email = 'your-email@company.com';
```

Replace `your-email@company.com` with your actual email address.

### Step 2: Restart the Dev Server

The backend should automatically pick up the changes, but restart to be sure:

```bash
# Stop the current dev server (Ctrl+C)
npm run dev
```

### Step 3: Test the Features

#### Test 1: Role Fetch on Login

1. Open browser DevTools → Network tab
2. Refresh the page or log in
3. Look for a request to `/api/users/me`
4. Verify the response includes `"role": "admin"`

**Expected Result:**

```json
{
  "id": "...",
  "email": "your-email@company.com",
  "name": "Your Name",
  "role": "admin",
  "tenantId": "..."
}
```

#### Test 2: Sidebar Navigation

1. Log in as admin
2. Check the sidebar under "Apps" section
3. You should see "Spot Awards" with a golden trophy icon

**Expected Result:**

- Dashboard
- Kudos Cards
- Shout Outs
- **Spot Awards** ← New (golden trophy icon)
- My Posters

#### Test 3: Access Protection

1. Click on "Spot Awards" in the sidebar
2. You should be redirected to `/dashboard/spot-awards`
3. Page should display:
   - Title: "Spot Awards" with trophy icon
   - Subtitle: "Create professional award posters..."
   - Placeholder: "Spot Awards Creator - Coming Soon"

**Expected Result:**

- Page loads successfully
- No redirect to /dashboard
- Clean UI with proper styling

#### Test 4: Non-Admin Access (Optional)

1. Update another user's role to 'user' in the database
2. Log in as that user
3. "Spot Awards" should NOT appear in sidebar
4. Navigating to `/dashboard/spot-awards` manually should redirect to `/dashboard`

---

## 🐛 Troubleshooting

### Issue: "Spot Awards" doesn't appear in sidebar

**Solution:**

- Verify your role in database: `SELECT email, role FROM "reflecto-ai-2".users WHERE email = 'your-email@company.com';`
- Check browser console for errors
- Verify `/api/users/me` returns `"role": "admin"`

### Issue: 401 Unauthorized on /api/users/me

**Solution:**

- Check that you're logged in with Azure AD
- Verify the Authorization header is being sent
- Check backend logs for authentication errors

### Issue: Page shows "Loading..." forever

**Solution:**

- Check browser console for errors
- Verify useAuth hook is working
- Check that NEXT_PUBLIC_API_URL is set correctly

---

## 📝 Files Changed

### Backend

- `apps/backend/src/routes/user.routes.ts` - Added GET /me endpoint
- `apps/backend/src/controllers/user.controller.ts` - Added getCurrentUser method
- `apps/backend/src/middleware/requireAdmin.ts` - New admin middleware (created)

### Frontend

- `apps/frontend/hooks/use-auth.tsx` - Fetches role from backend
- `apps/frontend/components/ui/app-sidebar.tsx` - Added Spot Awards menu item
- `apps/frontend/app/dashboard/spot-awards/page.tsx` - New page (created)

---

## ✅ Verification Checklist

- [ ] SQL update executed successfully
- [ ] Dev server restarted
- [ ] `/api/users/me` returns correct role
- [ ] "Spot Awards" appears in sidebar (admin only)
- [ ] Can navigate to `/dashboard/spot-awards`
- [ ] Page displays correctly
- [ ] Non-admin users don't see the menu item

---

## 🚀 Next Steps (After Testing)

Once you confirm everything works:

1. **Commit the changes:**

   ```bash
   git add .
   git commit -m "feat: add spot awards role management and navigation"
   ```

2. **Continue with Phase 3:**
   - Photo upload component
   - Form inputs (category, message)
   - Live preview canvas
   - Image generation
   - Backend API for saving awards

Let me know if you encounter any issues during testing!
