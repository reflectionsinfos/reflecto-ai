"use client"

import Link from "next/link"
import {
  Award,
  Megaphone,
  Radar,
  User,
  Search,
  Image as ImageIcon,
  PartyPopper,
  Briefcase,
  Trophy
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"

export default function HubPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const creativeApps = [
    {
      name: "Kudos Cards",
      description: "Send appreciation cards to peers.",
      icon: Award,
      href: "/dashboard/kudos",
      color: "bg-yellow-500",
      stats: "Most Popular",
    },
    {
      name: "Shout Outs",
      description: "Create team banners and announcements.",
      icon: Megaphone,
      href: "/dashboard/shout-out",
      color: "bg-orange-500",
      stats: "New",
    },
    {
      name: "My Posters",
      description: "View your created and received cards.",
      icon: ImageIcon,
      href: "/dashboard/my-cards", // Using existing route
      color: "bg-pink-500",
    },
    {
      name: "Spot Awards",
      description: "Create professional award posters.",
      icon: Trophy,
      href: "/dashboard/spot-awards",
      color: "bg-amber-500",
      comingSoon: !isAdmin,
      badge: isAdmin ? "Admin Only" : undefined
    },
    {
        name: "Business Card",
        description: "Generate your digital business card.",
        icon: Briefcase,
        href: "#",
        color: "bg-slate-700",
        comingSoon: true,
      },
  ]

  const growthApps = [
    {
      name: "My Learning Path",
      description: "AI-powered daily lessons tailored to your tech stack.",
      icon: Radar,
      href: "/dashboard/learning",
      color: "bg-purple-600",
      comingSoon: false,
    },
    {
      name: "Talent Search",
      description: "Find experts using natural language.",
      icon: Search,
      href: "/dashboard/talent-search",
      color: "bg-indigo-600",
      comingSoon: true,
    },
  ]

  return (
    <div className="space-y-12 py-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Reflecto Hub</h1>
        <p className="text-muted-foreground">
          Your central space for recognition, growth, and insights.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
           <span className="w-1 h-6 bg-primary rounded-full"></span>
           Creative Studio
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creativeApps.map((app) => (
            <Link 
                key={app.name} 
                href={app.comingSoon ? "#" : app.href} 
                className={app.comingSoon ? "cursor-not-allowed" : ""}
            >
              <Card className={`h-full hover:shadow-lg transition-all duration-200 border-border group ${app.comingSoon ? "opacity-60" : "hover:-translate-y-1"}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${app.color} shadow-md`}>
                      <app.icon className="w-6 h-6 text-white" />
                    </div>
                    {/* @ts-ignore */}
                    {app.stats && !app.comingSoon && (
                      <Badge variant="secondary" className="font-normal">
                         {/* @ts-ignore */}
                        {app.stats}
                      </Badge>
                    )}
                    {/* @ts-ignore */}
                    {app.badge && !app.comingSoon && (
                      <Badge variant="secondary" className="font-normal border-amber-500 text-amber-500 bg-amber-50">
                         {/* @ts-ignore */}
                        {app.badge}
                      </Badge>
                    )}
                    {app.comingSoon && (
                        <Badge variant="outline" className="text-muted-foreground">
                            Coming Soon
                        </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                    {app.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {app.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
            Growth & Intelligence
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {growthApps.map((app) => (
            <Link 
                key={app.name} 
                href={app.comingSoon ? "#" : app.href}
                className={app.comingSoon ? "cursor-not-allowed" : ""}
            >
              <Card className={`h-full hover:shadow-lg transition-all duration-200 border-border group ${app.comingSoon ? "opacity-60" : "hover:-translate-y-1"}`}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                     <div className={`p-3 rounded-xl ${app.color} shadow-md`}>
                      <app.icon className="w-6 h-6 text-white" />
                    </div>
                    {app.comingSoon && (
                        <Badge variant="outline" className="text-muted-foreground">
                            Coming Soon
                        </Badge>
                    )}
                  </div>
                  <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                    {app.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {app.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
