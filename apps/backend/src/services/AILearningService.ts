import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface LearningContentRequest {
  topic: string;
  techStack: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  userContext?: string; // Optional: user's current projects/goals
}

export interface GeneratedLesson {
  topic: string;
  techStack: string;
  difficulty: string;
  lessonContent: string; // Markdown
  exercise: {
    question: string;
    hints: string[];
    solution?: string;
  };
  quizQuestions: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
  estimatedReadTime: number;
}

export class AILearningService {
  /**
   * Generate a 2-minute lesson with exercise and quiz using Gemini
   */
  static async generateLesson(request: LearningContentRequest): Promise<GeneratedLesson> {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash", // Latest Gemini 2.0 model
      generationConfig: {
        temperature: 0.7,
      }
    });

    const prompt = `You are an expert technical educator creating micro-learning content.
Generate a concise, engaging 2-minute lesson on the given topic.

Requirements:
- Lesson: 200-300 words, markdown format, practical focus
- Include 1 code example if applicable
- Exercise: 1 hands-on task with 2-3 hints
- Quiz: 3-5 multiple-choice questions testing understanding
- Tone: Conversational but professional
- Difficulty: ${request.difficulty}

Topic: "${request.topic}" for ${request.techStack}
${request.userContext ? `User context: ${request.userContext}` : ""}

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "lessonContent": "markdown content here with code examples",
  "exercise": {
    "question": "practical hands-on task",
    "hints": ["hint 1", "hint 2", "hint 3"],
    "solution": "optional solution code or explanation"
  },
  "quizQuestions": [
    {
      "question": "quiz question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "detailed explanation of why this is correct"
    }
  ]
}`;

    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      let text = response.text();
      
      // Remove markdown code blocks if present
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Parse JSON response
      const content = JSON.parse(text);

      return {
        topic: request.topic,
        techStack: request.techStack,
        difficulty: request.difficulty,
        lessonContent: content.lessonContent,
        exercise: content.exercise,
        quizQuestions: content.quizQuestions,
        estimatedReadTime: 2,
      };
    } catch (error) {
      console.error("Gemini lesson generation failed:", error);
      throw new Error("Failed to generate lesson content");
    }
  }

  /**
   * Evaluate user's quiz answers and provide feedback using Gemini
   */
  static async evaluateQuiz(
    quizQuestions: any[],
    userAnswers: number[],
    exerciseSubmission?: string
  ): Promise<{ score: number; feedback: string; pointsEarned: number }> {
    let correctCount = 0;
    quizQuestions.forEach((q, i) => {
      if (userAnswers[i] === q.correctIndex) correctCount++;
    });

    const score = Math.round((correctCount / quizQuestions.length) * 100);
    
    // Generate personalized feedback using Gemini
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 150,
      }
    });

    const feedbackPrompt = `User scored ${score}% on a technical quiz (${correctCount}/${quizQuestions.length} correct).
${exerciseSubmission ? `They also submitted this exercise:\n${exerciseSubmission.substring(0, 500)}` : ""}

Provide encouraging, constructive feedback in 2-3 sentences. Be specific about what they did well and what to focus on next. Keep it motivational and actionable.`;

    try {
      const result = await model.generateContent(feedbackPrompt);
      const feedback = result.response.text();
      
      // Points calculation
      let pointsEarned = score >= 80 ? 10 : score >= 60 ? 7 : 5;
      if (exerciseSubmission) pointsEarned += 5; // Bonus for completing exercise

      return { score, feedback, pointsEarned };
    } catch (error) {
      console.error("Gemini feedback generation failed:", error);
      return {
        score,
        feedback: `You scored ${score}%! ${score >= 80 ? "Excellent work!" : "Keep learning!"}`,
        pointsEarned: score >= 60 ? 10 : 5,
      };
    }
  }

  /**
   * Generate next topic suggestion based on user's progress using Gemini
   */
  static async suggestNextTopic(
    techStack: string,
    completedTopics: string[],
    userGoals?: string
  ): Promise<string> {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 30,
      }
    });

    const prompt = `User is learning ${techStack}.
Completed topics: ${completedTopics.length > 0 ? completedTopics.join(", ") : "None yet"}
${userGoals ? `Learning goals: ${userGoals}` : ""}

Suggest the next logical topic to learn. Return ONLY the topic name (3-7 words, no explanation).`;

    try {
      const result = await model.generateContent(prompt);
      const topic = result.response.text().trim();
      
      // Clean up any extra formatting
      return topic.replace(/['"]/g, "").substring(0, 100);
    } catch (error) {
      console.error("Gemini topic suggestion failed:", error);
      return "Advanced Concepts";
    }
  }
}
