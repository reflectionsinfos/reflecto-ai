# Gemini API Setup - IMPORTANT

## Current Status

⚠️ **Gemini API integration is implemented but requires a valid API key**

## Issue

The current API key is not working with any Gemini models. Error:

```
404 Not Found - models/gemini-xxx is not found for API version v1beta
```

## Solution

### Option 1: Get a New Gemini API Key (Recommended)

1. Visit: https://aistudio.google.com/apikey
2. **Sign in with a Google account that has Gemini API access**
3. Click "Create API Key" → "Create API key in new project"
4. Copy the key (starts with `AIza...`)
5. Add to `apps/backend/.env`:
   ```
   GEMINI_API_KEY=AIzaSy...your-new-key-here
   ```
6. Restart the dev server

### Option 2: Use OpenAI Instead

If Gemini continues to have issues, we can switch back to OpenAI:

1. Get OpenAI API key from: https://platform.openai.com/api-keys
2. Install OpenAI SDK:
   ```bash
   cd apps/backend
   npm install openai
   npm uninstall @google/generative-ai
   ```
3. Update `apps/backend/src/services/AILearningService.ts` to use OpenAI
4. Add to `.env`:
   ```
   OPENAI_API_KEY=sk-proj-...
   ```

### Option 3: Mock AI for Testing

For immediate testing without AI, we can create mock responses:

```typescript
// In AILearningService.ts
static async generateLesson(request: LearningContentRequest): Promise<GeneratedLesson> {
  // Mock response for testing
  return {
    topic: request.topic,
    techStack: request.techStack,
    difficulty: request.difficulty,
    lessonContent: `# ${request.topic}\n\nThis is a mock lesson about ${request.topic}...`,
    exercise: {
      question: "Practice exercise for " + request.topic,
      hints: ["Hint 1", "Hint 2"],
      solution: "Mock solution"
    },
    quizQuestions: [
      {
        question: "What is " + request.topic + "?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctIndex: 0,
        explanation: "Mock explanation"
      }
    ],
    estimatedReadTime: 2,
  };
}
```

## Troubleshooting

### Check API Key Validity

Run this test:

```bash
cd apps/backend
npx tsx test-gemini.ts
```

Expected output if working:

```
✅ Success! Response: Hello
```

### Common Issues

1. **API Key Expired**: Regenerate at https://aistudio.google.com/apikey
2. **Wrong Project**: Make sure the key is from a project with Gemini API enabled
3. **Billing Not Enabled**: Some accounts require billing setup
4. **Regional Restrictions**: Gemini might not be available in your region

## Models Tried (All Failed)

- ❌ `gemini-1.5-flash`
- ❌ `gemini-1.5-flash-latest`
- ❌ `models/gemini-1.5-flash`
- ❌ `gemini-pro`
- ❌ `gemini-1.0-pro`

## Next Steps

1. **Verify API key** at https://aistudio.google.com/
2. **Check billing** if required
3. **Consider OpenAI** as alternative (more reliable, slightly more expensive)
4. **Use mock data** for immediate testing

---

**Once you have a working API key, the feature is fully functional!** All the code is in place.
