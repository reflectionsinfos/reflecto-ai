import { db } from "../db";
import { 
  userLearningProfiles, 
  learningContent, 
  userLearningProgress, 
  userRewards 
} from "../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { AILearningService } from "./AILearningService";

export class LearningService {
  /**
   * Create or update user learning profile
   */
  static async upsertProfile(userId: string, profileData: {
    currentProjects?: string[];
    techStack?: string[];
    domain?: string;
    learningGoals?: string;
    monthlyObjectives?: { month: string; goals: string[] }[];
    preferredDelivery?: string;
    organizationalPriorities?: string[];
    status?: string;
  }) {
    const existing = await db
      .select()
      .from(userLearningProfiles)
      .where(eq(userLearningProfiles.userId, userId));

    // Set submittedAt if status is PENDING_APPROVAL
    const dataToSave: any = { ...profileData, updatedAt: new Date() };
    if (profileData.status === 'PENDING_APPROVAL' && !existing.length) {
      dataToSave.submittedAt = new Date();
    }

    if (existing.length > 0) {
      // Update
      const [updated] = await db
        .update(userLearningProfiles)
        .set(dataToSave)
        .where(eq(userLearningProfiles.userId, userId))
        .returning();
      return updated;
    } else {
      // Insert
      const [created] = await db
        .insert(userLearningProfiles)
        .values({ userId, ...dataToSave })
        .returning();
      
      // Also initialize rewards
      await db.insert(userRewards).values({ userId });
      
      return created;
    }
  }

  /**
   * Get user's learning profile
   */
  static async getProfile(userId: string) {
    const [profile] = await db
      .select()
      .from(userLearningProfiles)
      .where(eq(userLearningProfiles.userId, userId));
    return profile;
  }

  /**
   * Generate and deliver daily lesson
   */
  static async generateDailyLesson(userId: string) {
    const profile = await this.getProfile(userId);
    if (!profile || !profile.techStack || profile.techStack.length === 0) {
      throw new Error("User profile not set up");
    }

    // Pick a tech from their stack (rotate or prioritize)
    const techStack = profile.techStack[0]; // Simple: first tech
    
    // Get completed topics to avoid repetition
    const completedLessons = await db
      .select()
      .from(userLearningProgress)
      .where(eq(userLearningProgress.userId, userId))
      .orderBy(desc(userLearningProgress.deliveredAt))
      .limit(10);

    const completedTopics = completedLessons.map(l => l.contentId || "");

    // Suggest next topic
    const topic = await AILearningService.suggestNextTopic(
      techStack,
      completedTopics,
      profile.learningGoals || undefined
    );

    // Generate lesson content
    const lesson = await AILearningService.generateLesson({
      topic,
      techStack,
      difficulty: "intermediate", // TODO: Adaptive difficulty
      userContext: profile.learningGoals || undefined,
    });

    // Save to database
    const [savedContent] = await db
      .insert(learningContent)
      .values(lesson)
      .returning();

    // Track delivery
    const [progress] = await db
      .insert(userLearningProgress)
      .values({
        userId,
        contentId: savedContent.id,
        deliveryMethod: profile.preferredDelivery || "teams",
      })
      .returning();

    return { content: savedContent, progress };
  }

  /**
   * Submit quiz answers
   */
  static async submitQuiz(
    progressId: string,
    quizAnswers: number[],
    exerciseSubmission?: string
  ) {
    // Get progress record
    const [progress] = await db
      .select()
      .from(userLearningProgress)
      .where(eq(userLearningProgress.id, progressId));

    if (!progress) throw new Error("Progress record not found");

    // Get lesson content
    const [content] = await db
      .select()
      .from(learningContent)
      .where(eq(learningContent.id, progress.contentId!));

    if (!content) throw new Error("Content not found");

    // Evaluate using AI
    const evaluation = await AILearningService.evaluateQuiz(
      content.quizQuestions || [],
      quizAnswers,
      exerciseSubmission
    );

    // Update progress
    await db
      .update(userLearningProgress)
      .set({
        quizAnswers,
        quizScore: evaluation.score,
        exerciseSubmission,
        exerciseCompleted: exerciseSubmission ? "true" : "false",
        quizSubmittedAt: new Date(),
        pointsEarned: evaluation.pointsEarned,
        aiFeedback: evaluation.feedback,
        completedAt: new Date(),
      })
      .where(eq(userLearningProgress.id, progressId));

    // Update user rewards
    await this.updateRewards(progress.userId, evaluation.pointsEarned);

    return evaluation;
  }

  /**
   * Update user rewards and streaks
   */
  static async updateRewards(userId: string, pointsEarned: number) {
    const [rewards] = await db
      .select()
      .from(userRewards)
      .where(eq(userRewards.userId, userId));

    if (!rewards) {
      // Create if doesn't exist
      await db.insert(userRewards).values({
        userId,
        totalPoints: pointsEarned,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: new Date(),
      });
      return;
    }

    // Check streak
    const lastActivity = rewards.lastActivityDate;
    const today = new Date();
    const daysDiff = lastActivity
      ? Math.floor((today.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    let newStreak = rewards.currentStreak || 0;
    if (daysDiff === 1) {
      newStreak += 1; // Consecutive day
    } else if (daysDiff > 1) {
      newStreak = 1; // Streak broken
    }
    // If daysDiff === 0, same day, don't change streak

    const newLongestStreak = Math.max(rewards.longestStreak || 0, newStreak);
    const newTotalPoints = (rewards.totalPoints || 0) + pointsEarned;

    // Check for new badges
    const newBadges = [...(rewards.badges || [])];
    if (newStreak === 7 && !newBadges.find(b => b.id === "7-day-streak")) {
      newBadges.push({ id: "7-day-streak", name: "Week Warrior", earnedAt: new Date().toISOString() });
    }
    if (newTotalPoints >= 100 && !newBadges.find(b => b.id === "century")) {
      newBadges.push({ id: "century", name: "Century Club", earnedAt: new Date().toISOString() });
    }

    await db
      .update(userRewards)
      .set({
        totalPoints: newTotalPoints,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        badges: newBadges,
        level: Math.floor(newTotalPoints / 50) + 1,
        lastActivityDate: today,
        updatedAt: new Date(),
      })
      .where(eq(userRewards.userId, userId));
  }

  /**
   * Get user's learning stats
   */
  static async getUserStats(userId: string) {
    const [rewards] = await db
      .select()
      .from(userRewards)
      .where(eq(userRewards.userId, userId));

    const completedLessons = await db
      .select()
      .from(userLearningProgress)
      .where(
        and(
          eq(userLearningProgress.userId, userId),
          eq(userLearningProgress.exerciseCompleted, "true")
        )
      );

    return {
      rewards: rewards || { totalPoints: 0, currentStreak: 0, badges: [], level: 1 },
      completedCount: completedLessons.length,
    };
  }

  /**
   * Get recent lessons for a user
   */
  static async getRecentLessons(userId: string, limit: number = 5) {
    const { sql } = await import("drizzle-orm");
    
    const recentProgress = await db
      .select()
      .from(userLearningProgress)
      .where(eq(userLearningProgress.userId, userId))
      .orderBy(desc(userLearningProgress.deliveredAt))
      .limit(limit);

    // Fetch corresponding content for each progress record
    const lessonsWithContent = await Promise.all(
      recentProgress.map(async (progress) => {
        if (!progress.contentId) return { progress, content: null };
        
        const [content] = await db
          .select()
          .from(learningContent)
          .where(eq(learningContent.id, progress.contentId));
        
        return { progress, content };
      })
    );

    return lessonsWithContent;
  }
}
