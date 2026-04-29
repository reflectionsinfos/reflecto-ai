"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningService = void 0;
const db_1 = require("../db");
const schema_1 = require("../db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const AILearningService_1 = require("./AILearningService");
class LearningService {
    /**
     * Create or update user learning profile
     */
    static async upsertProfile(userId, profileData) {
        const existing = await db_1.db
            .select()
            .from(schema_1.userLearningProfiles)
            .where((0, drizzle_orm_1.eq)(schema_1.userLearningProfiles.userId, userId));
        // Set submittedAt if status is PENDING_APPROVAL
        const dataToSave = { ...profileData, updatedAt: new Date() };
        if (profileData.status === 'PENDING_APPROVAL' && !existing.length) {
            dataToSave.submittedAt = new Date();
        }
        if (existing.length > 0) {
            // Update
            const [updated] = await db_1.db
                .update(schema_1.userLearningProfiles)
                .set(dataToSave)
                .where((0, drizzle_orm_1.eq)(schema_1.userLearningProfiles.userId, userId))
                .returning();
            return updated;
        }
        else {
            // Insert
            const [created] = await db_1.db
                .insert(schema_1.userLearningProfiles)
                .values({ userId, ...dataToSave })
                .returning();
            // Also initialize rewards
            await db_1.db.insert(schema_1.userRewards).values({ userId });
            return created;
        }
    }
    /**
     * Get user's learning profile
     */
    static async getProfile(userId) {
        const [profile] = await db_1.db
            .select()
            .from(schema_1.userLearningProfiles)
            .where((0, drizzle_orm_1.eq)(schema_1.userLearningProfiles.userId, userId));
        return profile;
    }
    /**
     * Generate and deliver daily lesson
     */
    static async generateDailyLesson(userId) {
        const profile = await this.getProfile(userId);
        if (!profile || !profile.techStack || profile.techStack.length === 0) {
            throw new Error("User profile not set up");
        }
        // Pick a tech from their stack (rotate or prioritize)
        const techStack = profile.techStack[0]; // Simple: first tech
        // Get completed topics to avoid repetition
        const completedLessons = await db_1.db
            .select()
            .from(schema_1.userLearningProgress)
            .where((0, drizzle_orm_1.eq)(schema_1.userLearningProgress.userId, userId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.userLearningProgress.deliveredAt))
            .limit(10);
        const completedTopics = completedLessons.map(l => l.contentId || "");
        // Suggest next topic
        const topic = await AILearningService_1.AILearningService.suggestNextTopic(techStack, completedTopics, profile.learningGoals || undefined);
        // Generate lesson content
        const lesson = await AILearningService_1.AILearningService.generateLesson({
            topic,
            techStack,
            difficulty: "intermediate", // TODO: Adaptive difficulty
            userContext: profile.learningGoals || undefined,
        });
        // Save to database
        const [savedContent] = await db_1.db
            .insert(schema_1.learningContent)
            .values(lesson)
            .returning();
        // Track delivery
        const [progress] = await db_1.db
            .insert(schema_1.userLearningProgress)
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
    static async submitQuiz(progressId, quizAnswers, exerciseSubmission) {
        // Get progress record
        const [progress] = await db_1.db
            .select()
            .from(schema_1.userLearningProgress)
            .where((0, drizzle_orm_1.eq)(schema_1.userLearningProgress.id, progressId));
        if (!progress)
            throw new Error("Progress record not found");
        // Get lesson content
        const [content] = await db_1.db
            .select()
            .from(schema_1.learningContent)
            .where((0, drizzle_orm_1.eq)(schema_1.learningContent.id, progress.contentId));
        if (!content)
            throw new Error("Content not found");
        // Evaluate using AI
        const evaluation = await AILearningService_1.AILearningService.evaluateQuiz(content.quizQuestions || [], quizAnswers, exerciseSubmission);
        // Update progress
        await db_1.db
            .update(schema_1.userLearningProgress)
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
            .where((0, drizzle_orm_1.eq)(schema_1.userLearningProgress.id, progressId));
        // Update user rewards
        await this.updateRewards(progress.userId, evaluation.pointsEarned);
        return evaluation;
    }
    /**
     * Update user rewards and streaks
     */
    static async updateRewards(userId, pointsEarned) {
        const [rewards] = await db_1.db
            .select()
            .from(schema_1.userRewards)
            .where((0, drizzle_orm_1.eq)(schema_1.userRewards.userId, userId));
        if (!rewards) {
            // Create if doesn't exist
            await db_1.db.insert(schema_1.userRewards).values({
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
        }
        else if (daysDiff > 1) {
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
        await db_1.db
            .update(schema_1.userRewards)
            .set({
            totalPoints: newTotalPoints,
            currentStreak: newStreak,
            longestStreak: newLongestStreak,
            badges: newBadges,
            level: Math.floor(newTotalPoints / 50) + 1,
            lastActivityDate: today,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(schema_1.userRewards.userId, userId));
    }
    /**
     * Get user's learning stats
     */
    static async getUserStats(userId) {
        const [rewards] = await db_1.db
            .select()
            .from(schema_1.userRewards)
            .where((0, drizzle_orm_1.eq)(schema_1.userRewards.userId, userId));
        const completedLessons = await db_1.db
            .select()
            .from(schema_1.userLearningProgress)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.userLearningProgress.userId, userId), (0, drizzle_orm_1.eq)(schema_1.userLearningProgress.exerciseCompleted, "true")));
        return {
            rewards: rewards || { totalPoints: 0, currentStreak: 0, badges: [], level: 1 },
            completedCount: completedLessons.length,
        };
    }
    /**
     * Get recent lessons for a user
     */
    static async getRecentLessons(userId, limit = 5) {
        const { sql } = await Promise.resolve().then(() => __importStar(require("drizzle-orm")));
        const recentProgress = await db_1.db
            .select()
            .from(schema_1.userLearningProgress)
            .where((0, drizzle_orm_1.eq)(schema_1.userLearningProgress.userId, userId))
            .orderBy((0, drizzle_orm_1.desc)(schema_1.userLearningProgress.deliveredAt))
            .limit(limit);
        // Fetch corresponding content for each progress record
        const lessonsWithContent = await Promise.all(recentProgress.map(async (progress) => {
            if (!progress.contentId)
                return { progress, content: null };
            const [content] = await db_1.db
                .select()
                .from(schema_1.learningContent)
                .where((0, drizzle_orm_1.eq)(schema_1.learningContent.id, progress.contentId));
            return { progress, content };
        }));
        return lessonsWithContent;
    }
}
exports.LearningService = LearningService;
