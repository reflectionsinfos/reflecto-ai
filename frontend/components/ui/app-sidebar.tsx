"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Award,
  Megaphone,
  User,
  Search,
  Settings,
  Image as ImageIcon,
  PartyPopper,
  Briefcase,
  Trophy
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/hooks/use-auth"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function AppSidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()

  const apps = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      href: "/dashboard",
      color: "text-sky-500",
    },
    {
      name: "Kudos Cards",
      icon: Award,
      href: "/dashboard/kudos",
      color: "text-yellow-500",
    },
    {
      name: "Shout Outs",
      icon: Megaphone,
      href: "/dashboard/shout-out",
      color: "text-orange-500",
    },
    ...(user?.role === 'admin' ? [{
      name: "Spot Awards",
      icon: Trophy,
      href: "/dashboard/spot-awards",
      color: "text-amber-500",
    }] : []),
    {
      name: "My Card History",
      icon: ImageIcon,
      href: "/dashboard/my-cards",
      color: "text-pink-500",
    },
  ]

  const intelligence = [
    {
      name: "Talent Search",
      icon: Search,
      href: "/dashboard/talent-search",
      color: "text-blue-500",
      comingSoon: true
    },
  ]

  return (
    <div className={cn("pb-12 w-64 border-r bg-card h-screen fixed left-0 top-16 z-30 hidden lg:block", className)}>
      <ScrollArea className="h-full py-6">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-xs font-semibold tracking-tight text-muted-foreground uppercase">
            Apps
          </h2>
          <div className="space-y-1">
            {apps.map((app) => (
              <Button
                key={app.name}
                variant={pathname === app.href ? "secondary" : "ghost"}
                className="w-full justify-start font-normal"
                asChild
              >
                <Link href={app.href}>
                  <app.icon className={cn("mr-2 h-4 w-4", app.color)} />
                  {app.name}
                </Link>
              </Button>
            ))}
          </div>
        </div>
        
        {/* Intelligence section hidden — Talent Search planned for future release */}
      </ScrollArea>
    </div>
  )
}
