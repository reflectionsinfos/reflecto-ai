"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Rocket, Target, Award, TrendingUp, BookOpen, Zap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { apiClient } from "@/lib/api-client"

const TECH_OPTIONS = [
  "React", "Node.js", "TypeScript", "Python", "Java", "C#",
  "PostgreSQL", "MongoDB", "Docker", "Kubernetes", "AWS", "Azure",
  "GraphQL", "REST APIs", "Microservices", "Machine Learning",
  "DevOps", "CI/CD", "Git", "Agile"
]

const DOMAIN_OPTIONS = [
  "FinTech", "Healthcare", "E-Commerce", "EdTech", "SaaS",
  "Enterprise Software", "Mobile Apps", "Web Development", "Data Science"
]

export default function LearningPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [hasProfile, setHasProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [recentLessons, setRecentLessons] = useState<any[]>([])
  
  // Onboarding form state
  const [formData, setFormData] = useState({
    currentProjects: "",
    techStack: [] as string[],
    domain: "",
    learningGoals: "",
    organizationalPriorities: "",
    preferredDelivery: "teams"
  })

  useEffect(() => {
    loadProfile()
    loadStats()
    loadRecentLessons()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await apiClient.get("/learning/profile")
      if (data && (data as any).userId) {
        setProfile(data)
        setHasProfile(true)
      }
    } catch (error) {
      console.error("Failed to load profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await apiClient.get("/learning/stats")
      setStats(data)
    } catch (error) {
      console.error("Failed to load stats:", error)
    }
  }

  const loadRecentLessons = async () => {
    try {
      const data = await apiClient.get("/learning/recent-lessons")
      setRecentLessons(data as any[])
    } catch (error) {
      console.error("Failed to load recent lessons:", error)
    }
  }

  const handleTechToggle = (tech: string) => {
    setFormData(prev => ({
      ...prev,
      techStack: prev.techStack.includes(tech)
        ? prev.techStack.filter(t => t !== tech)
        : [...prev.techStack, tech]
    }))
  }

  const handleSubmit = async () => {
    if (formData.techStack.length === 0) {
      toast({ title: "Missing Info", description: "Please select at least one technology", variant: "destructive" })
      return
    }

    try {
      const payload = {
        currentProjects: formData.currentProjects.split(",").map(p => p.trim()).filter(Boolean),
        techStack: formData.techStack,
        domain: formData.domain,
        learningGoals: formData.learningGoals,
        organizationalPriorities: formData.organizationalPriorities.split(",").map(p => p.trim()).filter(Boolean),
        preferredDelivery: formData.preferredDelivery,
        status: 'PENDING_APPROVAL'
        // submittedAt will be set by backend
      }

      await apiClient.post("/learning/profile", payload)
      
      toast({ 
        title: "Submitted for Approval!", 
        description: "Your manager will review your learning plan shortly 📨" 
      })
      setHasProfile(true)
      loadProfile()
      loadStats()
    } catch (error) {
      toast({ title: "Error", description: "Failed to save profile", variant: "destructive" })
    }
  }

  const handleGenerateLesson = async () => {
    try {
      toast({ title: "Generating...", description: "AI is creating your personalized lesson" })
      await apiClient.post("/learning/generate-lesson", {})
      toast({ title: "Lesson Ready!", description: "Check your Teams/Email for today's lesson" })
      loadStats()
    } catch (error: any) {
      toast({ 
        title: "Generation Failed", 
        description: error.response?.data?.error || "Please set up your profile first", 
        variant: "destructive" 
      })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  }

  // Onboarding Flow
  if (!hasProfile) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-8">
          <Rocket className="w-16 h-16 mx-auto mb-4 text-purple-500" />
          <h1 className="text-3xl font-bold mb-2">Welcome to Your Learning Path</h1>
          <p className="text-muted-foreground">
            Let's personalize your AI-powered learning experience
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Setup Your Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Current Projects (comma-separated)</Label>
              <Input 
                placeholder="e.g. Migration Project, Customer Portal"
                value={formData.currentProjects}
                onChange={e => setFormData({...formData, currentProjects: e.target.value})}
              />
            </div>

            <div>
              <Label>Tech Stack (select all that apply)</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {TECH_OPTIONS.map(tech => (
                  <Badge
                    key={tech}
                    variant={formData.techStack.includes(tech) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleTechToggle(tech)}
                  >
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Domain / Industry</Label>
              <select
                className="w-full p-2 border rounded-md"
                value={formData.domain}
                onChange={e => setFormData({...formData, domain: e.target.value})}
              >
                <option value="">Select domain...</option>
                {DOMAIN_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <Label>Learning Goals (Next 1-3 months)</Label>
              <Textarea 
                placeholder="e.g. Master React Hooks, Learn Docker, Improve TypeScript skills"
                value={formData.learningGoals}
                onChange={e => setFormData({...formData, learningGoals: e.target.value})}
                className="h-24"
              />
            </div>

            <div>
              <Label>Organizational Priorities</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Align your learning with company/department focus areas
              </p>
              <Textarea 
                placeholder="e.g. Cloud Migration, Microservices Architecture, AI/ML Integration"
                value={formData.organizationalPriorities || ""}
                onChange={e => setFormData({...formData, organizationalPriorities: e.target.value})}
                className="h-20"
              />
            </div>

            <div>
              <Label>Preferred Delivery</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="delivery" 
                    value="teams"
                    checked={formData.preferredDelivery === "teams"}
                    onChange={e => setFormData({...formData, preferredDelivery: e.target.value})}
                  />
                  Microsoft Teams
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="delivery" 
                    value="email"
                    checked={formData.preferredDelivery === "email"}
                    onChange={e => setFormData({...formData, preferredDelivery: e.target.value})}
                  />
                  Email
                </label>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                📋 <strong>Manager Approval Required</strong>
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Your learning plan will be sent to your manager for review and approval to ensure alignment with organizational goals.
              </p>
            </div>

            <Button className="w-full" onClick={handleSubmit}>
              Submit for Manager Approval
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Dashboard View
  return (
    <div className="max-w-7xl mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Learning Path</h1>
          <p className="text-muted-foreground">AI-powered micro-learning tailored for you</p>
        </div>
        <Button onClick={handleGenerateLesson} disabled={profile?.status !== 'APPROVED'}>
          <Zap className="w-4 h-4 mr-2" />
          Generate Today's Lesson
        </Button>
      </div>

      {/* Approval Status Banner */}
      {profile?.status === 'PENDING_APPROVAL' && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 dark:text-yellow-400 text-2xl">⏳</div>
            <div>
              <p className="font-semibold text-yellow-900 dark:text-yellow-100">Awaiting Manager Approval</p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Your learning plan has been submitted and is pending review by your manager.
                You'll be notified once it's approved.
              </p>
            </div>
          </div>
        </div>
      )}

      {profile?.status === 'APPROVED' && (
        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-green-600 dark:text-green-400 text-2xl">✅</div>
            <div>
              <p className="font-semibold text-green-900 dark:text-green-100">Learning Plan Approved</p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Your manager has approved your learning path. Start generating lessons to begin your journey!
                {profile.approvedAt && ` (Approved on ${new Date(profile.approvedAt).toLocaleDateString()})`}
              </p>
            </div>
          </div>
        </div>
      )}

      {profile?.status === 'REVISION_REQUESTED' && (
        <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-orange-600 dark:text-orange-400 text-2xl">📝</div>
            <div className="flex-1">
              <p className="font-semibold text-orange-900 dark:text-orange-100">Revision Requested</p>
              <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                Your manager has requested changes to your learning plan:
              </p>
              {profile.revisionComments && (
                <div className="mt-2 bg-white dark:bg-gray-900 rounded p-3 text-sm">
                  <p className="font-medium text-orange-900 dark:text-orange-100 mb-1">Manager's Feedback:</p>
                  <p className="text-orange-800 dark:text-orange-200">{profile.revisionComments}</p>
                </div>
              )}
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setHasProfile(false)}>
                Revise Learning Plan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <Award className="w-8 h-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{stats?.rewards?.totalPoints || 0}</p>
              <p className="text-sm text-muted-foreground">Total Points</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <TrendingUp className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats?.rewards?.currentStreak || 0}</p>
              <p className="text-sm text-muted-foreground">Day Streak</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <BookOpen className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{stats?.completedCount || 0}</p>
              <p className="text-sm text-muted-foreground">Lessons Completed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <Target className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">Level {stats?.rewards?.level || 1}</p>
              <p className="text-sm text-muted-foreground">Current Level</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges */}
      {stats?.rewards?.badges && stats.rewards.badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {stats.rewards.badges.map((badge: any) => (
                <div key={badge.id} className="flex items-center gap-2 bg-accent p-3 rounded-lg">
                  <Award className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="font-semibold text-sm">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(badge.earnedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills Acquired */}
      {profile?.techStack && profile.techStack.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              Skills Acquired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Based on your learning journey and completed lessons
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.techStack.map((skill: string) => {
                // Calculate proficiency based on completed lessons (mock for now)
                const lessonsCompleted = stats?.completedCount || 0;
                const proficiency = Math.min(100, (lessonsCompleted * 10) + 20);
                const level = proficiency >= 80 ? "Expert" : proficiency >= 50 ? "Intermediate" : "Beginner";
                
                return (
                  <div key={skill} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{skill}</h4>
                      <Badge variant={proficiency >= 80 ? "default" : "secondary"}>
                        {level}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Proficiency</span>
                        <span>{proficiency}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${proficiency}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {lessonsCompleted > 0 
                          ? `${lessonsCompleted} lessons completed` 
                          : "Start learning to build proficiency"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Your Learning Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Tech Stack</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {profile?.techStack?.map((tech: string) => (
                <Badge key={tech} variant="secondary">{tech}</Badge>
              ))}
            </div>
          </div>
          
          <div>
            <Label className="text-muted-foreground">Learning Goals</Label>
            <p className="mt-1">{profile?.learningGoals || "Not set"}</p>
          </div>

          <Button variant="outline" onClick={() => setHasProfile(false)}>
            Edit Profile
          </Button>
        </CardContent>
      </Card>

      {/* Recent Lessons */}
      {recentLessons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-500" />
              Recent Lessons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLessons.map((lesson: any) => (
                <div 
                  key={lesson.progress.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold">{lesson.content?.topic || "Lesson"}</h4>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {lesson.content?.techStack}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {lesson.content?.difficulty}
                      </Badge>
                      {lesson.progress.completedAt && (
                        <Badge className="text-xs bg-green-500">
                          ✓ Completed
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Delivered {new Date(lesson.progress.deliveredAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button 
                    variant={lesson.progress.completedAt ? "outline" : "default"}
                    size="sm"
                    onClick={() => window.location.href = `/dashboard/learning/lesson?id=${lesson.progress.id}`}
                  >
                    {lesson.progress.completedAt ? "Review" : "Start Lesson"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
