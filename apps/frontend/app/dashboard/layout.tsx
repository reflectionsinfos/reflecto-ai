"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Award, LogOut, Home, FileText, BarChart3 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth" // Use new hook

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  
  // Use Azure Auth Hook
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  
  // Determine admin status from Azure user roles (or default to false for now)
  // You might map specific Azure AD roles here later
  const userIsAdmin = user?.role === "admin" 

  useEffect(() => {
    // Only redirect if we are done loading and NOT authenticated
    if (!isLoading && !isAuthenticated) {
        router.push("/")
    }
  }, [isLoading, isAuthenticated, router])

  const handleLogout = () => {
    logout()
  }

  const isActivePath = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(path)
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <Award className="w-8 h-8 text-primary-foreground animate-pulse" />
          </div>
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/80 backdrop-blur-md border-b border-border px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-md">
              <Award className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Kudos Card</h1>
              <p className="text-sm text-muted-foreground">Employee Recognition Platform</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard">
              <Button
                variant="ghost"
                size="sm"
                className={`${
                  isActivePath("/dashboard")
                    ? "text-primary bg-primary/10 hover:bg-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>
            </Link>

            <Link href="/dashboard/my-cards">
              <Button
                variant="ghost"
                size="sm"
                className={`${
                  isActivePath("/dashboard/my-cards")
                    ? "text-primary bg-primary/10 hover:bg-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <FileText className="w-4 h-4 mr-2" />
                {userIsAdmin ? "Cards" : "My Cards"}
              </Button>
            </Link>

            {userIsAdmin && (
              <Link href="/dashboard/analytics">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${
                    isActivePath("/dashboard/analytics")
                      ? "text-primary bg-primary/10 hover:bg-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-sm font-medium text-foreground">{user?.name || "User"}</span>
              {userIsAdmin && <div className="text-xs text-primary font-medium">Admin</div>}
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-border hover:bg-muted bg-transparent"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
