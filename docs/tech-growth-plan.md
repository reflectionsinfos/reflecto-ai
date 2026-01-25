# Tech Growth Plan - AI-Powered Learning System

## Overview

An AI-driven micro-learning platform that delivers personalized 2-minute lessons, exercises, and quizzes directly to employees via Teams/Email. The system adapts to each user's tech stack, projects, and learning goals.

## Architecture

### Backend Components

#### 1. Database Schema (`apps/backend/src/db/schema.ts`)

- **`user_learning_profiles`**: Stores user's tech stack, projects, domain, learning goals
- **`learning_content`**: AI-generated lessons, exercises, and quiz questions
- **`user_learning_progress`**: Tracks daily lesson delivery, quiz scores, exercise submissions
- **`user_rewards`**: Gamification data (points, streaks, badges, levels)

#### 2. AI Learning Service (`apps/backend/src/services/AILearningService.ts`)

- **`generateLesson()`**: Uses Google Gemini 1.5 Flash to create personalized 2-min lessons
- **`evaluateQuiz()`**: AI-powered quiz grading with personalized feedback
- **`suggestNextTopic()`**: Adaptive topic selection based on progress
- **Model**: Gemini 1.5 Flash (fast, cost-effective, native JSON mode)

#### 3. Learning Service (`apps/backend/src/services/LearningService.ts`)

- **`upsertProfile()`**: Create/update user learning profile
- **`generateDailyLesson()`**: Orchestrates lesson generation and delivery
- **`submitQuiz()`**: Handles quiz submission and rewards calculation
- **`updateRewards()`**: Manages points, streaks, badges, and levels

#### 4. API Routes (`apps/backend/src/routes/learning.routes.ts`)

- `GET /api/learning/profile` - Fetch user profile
- `POST /api/learning/profile` - Create/update profile
- `POST /api/learning/generate-lesson` - Trigger lesson generation
- `POST /api/learning/submit-quiz` - Submit quiz answers
- `GET /api/learning/stats` - Get user stats (points, streaks, badges)

### Frontend Components

#### 1. Learning Page (`apps/frontend/app/dashboard/learning/page.tsx`)

- **Onboarding Flow**: Tech stack selection, project input, learning goals
- **Dashboard**: Stats cards (points, streak, lessons completed, level)
- **Badges Display**: Visual representation of earned achievements
- **Profile Management**: View and edit learning preferences

#### 2. Navigation Updates

- **Sidebar**: Renamed "Tech Radar" → "My Learning Path"
- **Hub Page**: Updated growth apps section

## User Journey

### Day 1: Onboarding

1. User navigates to "My Learning Path"
2. Fills onboarding form:
   - Current projects (e.g., "Customer Portal, Migration")
   - Tech stack (React, Node.js, PostgreSQL)
   - Domain (FinTech)
   - Learning goals ("Master React Hooks, Learn Docker")
   - Delivery preference (Teams/Email)
3. Clicks "Start My Learning Journey"

### Day 2: First Lesson

1. User clicks "Generate Today's Lesson" (or automated via cron)
2. AI generates personalized content:
   - 2-min lesson on "React Custom Hooks"
   - 1 hands-on exercise with hints
   - 3-5 quiz questions
3. Lesson delivered via Teams/Email

### Day 3: Quiz & Feedback

1. User completes quiz
2. AI evaluates answers and provides feedback
3. User earns points (10 for 80%+, 7 for 60-79%, 5 for <60%)
4. Bonus +5 points for completing exercise
5. Streak counter increments

### Day 7: First Badge

1. User completes 7 consecutive days
2. Earns "Week Warrior" badge
3. Notification sent via Teams/Email

## Gamification System

### Points

- Quiz score 80%+: **10 points**
- Quiz score 60-79%: **7 points**
- Quiz score <60%: **5 points**
- Exercise completion: **+5 bonus**

### Levels

- Level = `floor(totalPoints / 50) + 1`
- Example: 150 points = Level 4

### Badges

- **Week Warrior**: 7-day streak
- **Century Club**: 100 total points
- **React Master**: Complete 10 React lessons (future)
- **Code Ninja**: 30-day streak (future)

### Streaks

- Consecutive days of lesson completion
- Breaks if >1 day gap
- Longest streak tracked separately

## AI Prompts

### Lesson Generation

```
System: You are an expert technical educator creating micro-learning content.
Generate a concise, engaging 2-minute lesson on the given topic.

Requirements:
- Lesson: 200-300 words, markdown format, practical focus
- Include 1 code example if applicable
- Exercise: 1 hands-on task with 2-3 hints
- Quiz: 3-5 multiple-choice questions testing understanding
- Tone: Conversational but professional
- Difficulty: [beginner/intermediate/advanced]

User: Create a lesson on: "React Hooks" for React
User context: Learning goals - Master React fundamentals
```

### Feedback Generation

```
User scored 80% on a quiz (4/5 correct).
They also submitted this exercise: [code snippet]

Provide encouraging, constructive feedback in 2-3 sentences.
Be specific about what they did well and what to focus on next.
```

## Future Enhancements

### Phase 2: Teams Bot Integration

- Interactive adaptive cards
- In-chat quiz responses
- Real-time feedback
- Daily reminders

### Phase 3: Advanced Intelligence

- **Adaptive Difficulty**: Adjust based on quiz performance
- **Skill Graph**: Visualize learning progress over time
- **Peer Challenges**: Compete with colleagues on same topic
- **Manager Dashboard**: Team learning analytics

### Phase 4: Integrations

- **Certification Platforms**: Link to Coursera, Udemy, Pluralsight
- **Code Review Integration**: Suggest lessons based on PR feedback
- **Project Alignment**: Auto-detect tech stack from project repos
- **Auto-Kudos**: Send recognition for learning milestones

## Configuration

### Environment Variables (Backend)

```env
GEMINI_API_KEY=AIza...
DATABASE_URL=postgresql://...
```

### Cost Estimate (100 users)

- **Google Gemini API**: ~$10-20/month (Gemini 1.5 Flash - much cheaper!)
- **Azure Bot Service**: ~$10/month (if Teams integration)
- **Email (SendGrid)**: Free tier
- **Total**: ~$20-30/month

## API Examples

### Create Profile

```bash
POST /api/learning/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "currentProjects": ["Customer Portal", "Migration"],
  "techStack": ["React", "Node.js", "PostgreSQL"],
  "domain": "FinTech",
  "learningGoals": "Master React Hooks, Learn Docker",
  "preferredDelivery": "teams"
}
```

### Generate Lesson

```bash
POST /api/learning/generate-lesson
Authorization: Bearer {token}

Response:
{
  "content": {
    "id": "uuid",
    "topic": "React Custom Hooks",
    "lessonContent": "# React Custom Hooks\n\n...",
    "exercise": { ... },
    "quizQuestions": [ ... ]
  },
  "progress": {
    "id": "uuid",
    "deliveredAt": "2026-01-25T10:00:00Z"
  }
}
```

### Submit Quiz

```bash
POST /api/learning/submit-quiz
Authorization: Bearer {token}
Content-Type: application/json

{
  "progressId": "uuid",
  "quizAnswers": [0, 2, 1, 3, 0],
  "exerciseSubmission": "function useLocalStorage() { ... }"
}

Response:
{
  "score": 80,
  "feedback": "Great job! You nailed the basics...",
  "pointsEarned": 15
}
```

## Success Metrics

### Engagement

- **Daily Active Users**: % of enrolled users completing lessons
- **7-Day Retention**: % still active after 1 week
- **30-Day Retention**: % still active after 1 month

### Learning Outcomes

- **Average Quiz Score**: Track improvement over time
- **Completion Rate**: % of delivered lessons completed
- **Skill Application**: Are learned skills used in projects?

### Satisfaction

- **NPS Score**: After 1 month of usage
- **Feedback Quality**: User ratings of AI-generated content

## Database Migrations

Run these commands to apply schema changes:

```bash
cd apps/backend
npm run db:generate
npm run db:push
```

## Testing

### Manual Testing Flow

1. Navigate to `/dashboard/learning`
2. Complete onboarding form
3. Click "Generate Today's Lesson"
4. Check backend logs for AI generation
5. Verify lesson appears in database
6. Submit quiz via API or future UI
7. Check stats update (points, streak)

### API Testing (Postman/cURL)

See API Examples section above.

---

**Status**: ✅ Backend Complete | ✅ Frontend Onboarding Complete | 🚧 Teams/Email Delivery Pending

**Next Steps**:

1. Set up Google Gemini API key in backend `.env` (get from https://aistudio.google.com/apikey)
2. Test lesson generation
3. Implement Teams Bot (Phase 2)
4. Set up daily cron job for automated delivery
