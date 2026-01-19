"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart3, TrendingUp, Users, Award, Calendar, Download, Trash2, Activity, Clock } from "lucide-react"
import { getCurrentUser, isAdmin } from "@/lib/auth"
import { cardStorage, type HistoryEntry } from "@/lib/card-storage"

interface AnalyticsData {
  totalCards: number
  totalCreators: number
  templateCounts: Record<string, number>
  recentActivity: HistoryEntry[]
  totalActions: number
}

interface UserStats {
  email: string
  name: string
  cardCount: number
  lastActivity: string
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [userStats, setUserStats] = useState<UserStats[]>([])
  const [selectedTimeframe, setSelectedTimeframe] = useState<"7d" | "30d" | "all">("30d")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)

    // Redirect non-admins
    if (!user || !isAdmin()) {
      router.push("/dashboard")
      return
    }

    // Load analytics data
    loadAnalyticsData()
  }, [router])

  const loadAnalyticsData = () => {
    setIsLoading(true)
    try {
      const stats = cardStorage.getCardStats()
      setAnalyticsData(stats)

      // Calculate user statistics
      const cards = cardStorage.getAllCards()
      const userMap = new Map<string, UserStats>()

      cards.forEach((card) => {
        const existing = userMap.get(card.creatorEmail)
        if (existing) {
          existing.cardCount++
          if (new Date(card.createdAt) > new Date(existing.lastActivity)) {
            existing.lastActivity = card.createdAt
          }
        } else {
          userMap.set(card.creatorEmail, {
            email: card.creatorEmail,
            name: card.creatorName,
            cardCount: 1,
            lastActivity: card.createdAt,
          })
        }
      })

      const sortedUsers = Array.from(userMap.values()).sort((a, b) => b.cardCount - a.cardCount)

      setUserStats(sortedUsers)
    } catch (error) {
      console.error("Error loading analytics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getFilteredActivity = () => {
    if (!analyticsData) return []

    const now = new Date()
    let cutoffDate = new Date()

    switch (selectedTimeframe) {
      case "7d":
        cutoffDate.setDate(now.getDate() - 7)
        break
      case "30d":
        cutoffDate.setDate(now.getDate() - 30)
        break
      case "all":
        cutoffDate = new Date(0) // Beginning of time
        break
    }

    return analyticsData.recentActivity.filter((activity) => new Date(activity.timestamp) >= cutoffDate)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create":
        return <Award className="w-4 h-4 text-primary" />
      case "delete":
        return <Trash2 className="w-4 h-4 text-destructive" />
      case "download":
        return <Download className="w-4 h-4 text-blue-500" />
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "bg-primary/10 text-primary border-primary/20"
      case "delete":
        return "bg-destructive/10 text-destructive border-destructive/20"
      case "download":
        return "bg-blue-50 text-blue-600 border-blue-200"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  const getMostPopularTemplate = () => {
    if (!analyticsData || Object.keys(analyticsData.templateCounts).length === 0) {
      return { name: "N/A", count: 0 }
    }

    const [name, count] = Object.entries(analyticsData.templateCounts).sort(([, a], [, b]) => b - a)[0]

    return { name, count }
  }

  const getActivityTrend = () => {
    const filteredActivity = getFilteredActivity()
    const createActions = filteredActivity.filter((a) => a.action === "create").length
    const totalActions = filteredActivity.length

    return {
      creations: createActions,
      total: totalActions,
      percentage: totalActions > 0 ? Math.round((createActions / totalActions) * 100) : 0,
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-2"></div>
          <div className="h-4 bg-muted rounded w-96 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Analytics Data</h3>
          <p className="text-muted-foreground">Unable to load analytics data.</p>
        </div>
      </div>
    )
  }

  const mostPopular = getMostPopularTemplate()
  const activityTrend = getActivityTrend()
  const filteredActivity = getFilteredActivity()

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Comprehensive insights into recognition card usage and user activity</p>
      </div>

      {/* Timeframe Filter */}
      <div className="mb-6 flex gap-2">
        <span className="text-sm text-muted-foreground flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Timeframe:
        </span>
        {(["7d", "30d", "all"] as const).map((timeframe) => (
          <Button
            key={timeframe}
            variant={selectedTimeframe === timeframe ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTimeframe(timeframe)}
            className={selectedTimeframe === timeframe ? "bg-primary text-primary-foreground" : ""}
          >
            {timeframe === "7d" ? "Last 7 Days" : timeframe === "30d" ? "Last 30 Days" : "All Time"}
          </Button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cards</CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{analyticsData.totalCards}</div>
            <p className="text-xs text-muted-foreground">Recognition cards created</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{analyticsData.totalCreators}</div>
            <p className="text-xs text-muted-foreground">Users creating cards</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Most Popular</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{mostPopular.count}</div>
            <p className="text-xs text-muted-foreground">{mostPopular.name} cards</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activity Rate</CardTitle>
            <Activity className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activityTrend.percentage}%</div>
            <p className="text-xs text-muted-foreground">Creation vs total actions</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Template Distribution */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Template Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analyticsData.templateCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([template, count]) => {
                  const percentage =
                    analyticsData.totalCards > 0 ? Math.round((count / analyticsData.totalCards) * 100) : 0

                  return (
                    <div key={template} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-foreground">{template}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{count} cards</span>
                          <Badge variant="secondary" className="text-xs">
                            {percentage}%
                          </Badge>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        {/* Top Users */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Top Contributors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userStats.slice(0, 5).map((user, index) => (
                <div key={user.email} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{user.cardCount} cards</p>
                    <p className="text-xs text-muted-foreground">Last: {formatDate(user.lastActivity)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            Recent Activity
            <Badge variant="secondary" className="ml-2">
              {filteredActivity.length} actions
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredActivity.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No activity in selected timeframe</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredActivity.slice(0, 20).map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg">
                  <div className="flex-shrink-0">{getActionIcon(activity.action)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-xs ${getActionColor(activity.action)}`}>
                        {activity.action.toUpperCase()}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">{activity.template}</span>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">{activity.creatorName}</span>
                      {activity.action === "create" && (
                        <span>
                          {" "}
                          created a card for <span className="font-medium">{activity.recipientName}</span>
                        </span>
                      )}
                      {activity.action === "delete" && (
                        <span>
                          {" "}
                          deleted {activity.recipientName}'s card
                          {activity.metadata?.deletedBy && <span> (deleted by {activity.metadata.deletedBy})</span>}
                        </span>
                      )}
                      {activity.action === "download" && (
                        <span>
                          {" "}
                          downloaded {activity.recipientName}'s card
                          {activity.metadata?.downloadedBy && (
                            <span> (downloaded by {activity.metadata.downloadedBy})</span>
                          )}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDate(activity.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
