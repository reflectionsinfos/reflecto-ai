# Tech Growth Plan - Quick Setup Guide

## ✅ What's Changed: OpenAI → Google Gemini

We've switched from OpenAI to **Google Gemini 1.5 Flash** for:

- **3-5x cost reduction** (~$10-20/month vs $50-100/month)
- **Faster response times**
- **Native JSON mode** (more reliable structured output)
- **Better multilingual support**

## 🚀 Setup Steps

### 1. Get Your Gemini API Key

1. Visit: https://aistudio.google.com/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

### 2. Add to Backend Environment

```bash
# apps/backend/.env
GEMINI_API_KEY=AIzaSy...your-key-here
DATABASE_URL=postgresql://...
```

### 3. Run Database Migrations

```bash
cd apps/backend
npm run db:generate
npm run db:push
```

### 4. Test the System

1. Start the dev server (if not already running):

   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:3000/dashboard/learning`

3. Complete the onboarding form:
   - Select tech stack (e.g., React, Node.js)
   - Add learning goals
   - Choose delivery method

4. Click "Generate Today's Lesson"

5. Check backend logs - you should see:

   ```
   Gemini lesson generation...
   ✅ Lesson generated successfully
   ```

6. Verify in database:
   ```sql
   SELECT * FROM "reflecto-ai-2".learning_content ORDER BY generated_at DESC LIMIT 1;
   SELECT * FROM "reflecto-ai-2".user_learning_progress ORDER BY delivered_at DESC LIMIT 1;
   ```

## 📊 What Gets Generated

### Sample Lesson Output

```json
{
  "topic": "React Custom Hooks",
  "techStack": "React",
  "difficulty": "intermediate",
  "lessonContent": "# React Custom Hooks\n\nCustom hooks are...",
  "exercise": {
    "question": "Create a useLocalStorage hook...",
    "hints": ["Start with useState", "Use useEffect for sync"],
    "solution": "function useLocalStorage(key, initial) { ... }"
  },
  "quizQuestions": [
    {
      "question": "What naming convention must custom hooks follow?",
      "options": [
        "start with 'use'",
        "end with 'Hook'",
        "all lowercase",
        "no convention"
      ],
      "correctIndex": 0,
      "explanation": "Custom hooks must start with 'use' to follow React conventions..."
    }
  ]
}
```

## 🎮 Gamification Features

### Points System

- **Quiz 80%+**: 10 points
- **Quiz 60-79%**: 7 points
- **Quiz <60%**: 5 points
- **Exercise completed**: +5 bonus

### Badges (Auto-awarded)

- **Week Warrior**: 7-day streak
- **Century Club**: 100 total points
- More badges coming in Phase 2!

### Levels

- Level = `floor(totalPoints / 50) + 1`
- Example: 150 points = Level 4

## 🔍 Troubleshooting

### "Failed to generate lesson content"

- **Check**: Is `GEMINI_API_KEY` set in `.env`?
- **Check**: Is the API key valid? Test at https://aistudio.google.com/
- **Check**: Backend logs for detailed error

### "User profile not set up"

- **Fix**: Complete the onboarding form first
- **Check**: Database has entry in `user_learning_profiles`

### Empty stats dashboard

- **Fix**: Generate at least one lesson
- **Check**: `user_rewards` table has entry for your user

## 📈 Cost Comparison

| Provider          | Model         | Cost (100 users/month) |
| ----------------- | ------------- | ---------------------- |
| OpenAI            | GPT-4o-mini   | ~$50-100               |
| **Google Gemini** | **1.5 Flash** | **~$10-20**            |

**Savings**: ~70-80% 💰

## 🎯 Next Steps

### Phase 2: Automated Delivery

- [ ] Set up cron job for daily 9 AM generation
- [ ] Integrate Teams Bot for in-app delivery
- [ ] Add email templates (SendGrid)

### Phase 3: Enhanced Features

- [ ] Adaptive difficulty (based on quiz scores)
- [ ] Peer challenges
- [ ] Manager dashboard
- [ ] Integration with project management tools

## 🆘 Support

If you encounter issues:

1. Check backend logs: `npm run dev` output
2. Verify database schema: `npm run db:studio`
3. Test API directly: Use Postman with endpoints from `tech-growth-plan.md`

---

**Status**: ✅ Ready to Use!

**API Key**: Get yours at https://aistudio.google.com/apikey
