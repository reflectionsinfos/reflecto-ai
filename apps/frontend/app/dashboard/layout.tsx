"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Award, LogOut, ShieldAlert } from "lucide-react"
import { useAuth } from "@/hooks/use-auth" // Use new hook
import { AppSidebar } from "@/components/ui/app-sidebar"
import { ReleaseNotesViewer } from "@/components/release-notes-viewer"

type ReleaseNotesManifest = {
  current?: {
    releaseNumber?: string
    date?: string
  } | null
  latest?: string | null
  releases?: Array<{
    release?: string
    releaseNumber?: string
    date?: string
  }>
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false)
  const [releaseNumber, setReleaseNumber] = useState("Release --")
  
  // Use Azure Auth Hook
  const { user, isAuthenticated, isLoading, error, logout } = useAuth()
  
  // Determine admin status from Azure user roles (or default to false for now)
  // You might map specific Azure AD roles here later
  const userIsAdmin = user?.role === "admin" 

  useEffect(() => {
    // Only redirect if we are done loading and NOT authenticated
    if (!isLoading && !isAuthenticated) {
        router.push("/")
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    let mounted = true

    async function loadReleaseNumber() {
      try {
        const response = await fetch("/release-notes/manifest.json", { cache: "no-store" })
        if (!response.ok) return

        const data = (await response.json()) as ReleaseNotesManifest
        const currentRelease =
          data.current ||
          data.releases?.find((release) => release.release === data.latest) ||
          data.releases?.[0]

        if (!mounted || !currentRelease) return

        if (currentRelease.releaseNumber) {
          setReleaseNumber(currentRelease.releaseNumber)
        } else if (currentRelease.date) {
          const date = new Date(currentRelease.date)
          if (!Number.isNaN(date.getTime())) {
            setReleaseNumber(date.toISOString().slice(0, 10).replace(/-/g, "."))
          }
        }
      } catch {
        // Keep the placeholder when release metadata is not published yet.
      }
    }

    loadReleaseNumber()
    return () => {
      mounted = false
    }
  }, [])

  const handleLogout = () => {
    logout()
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Dialog open>
          <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-destructive" />
                </div>
                <DialogTitle>Authentication Failed</DialogTitle>
              </div>
              <DialogDescription className="text-sm leading-relaxed">
                We couldn&apos;t verify your identity with the server. This is usually caused by a
                misconfigured Azure AD app registration or an expired session.
                <span className="block mt-3 font-mono text-xs bg-muted rounded px-2 py-1.5 text-muted-foreground break-all">
                  {error.message}
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => router.push("/")}>
                Go to Login
              </Button>
              <Button variant="destructive" size="sm" onClick={logout}>
                Sign out of Microsoft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
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
        <div className="max-w-[1920px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center shadow-md">
                <Award className="w-5 h-5 text-primary-foreground" />
              </div>
            </Link>
            <div>
              <Link href="/dashboard" className="text-xl font-bold text-foreground">
                Reflecto
              </Link>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="block text-sm text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setReleaseNotesOpen(true)}
                  >
                    {releaseNumber}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Release Info</TooltipContent>
              </Tooltip>
            </div>
          </div>

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
      
      <div className="flex">
         <AppSidebar />
         <main className="flex-1 lg:pl-64 p-6">
            <div className="max-w-7xl mx-auto">
             {children}
            </div>
         </main>
      </div>

      <Dialog open={releaseNotesOpen} onOpenChange={setReleaseNotesOpen}>
        <DialogContent className="flex h-[92vh] w-[95vw] max-w-[1600px] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-5 py-3 pr-14">
            <div className="flex items-center gap-2.5">
              <DialogTitle>Release Info</DialogTitle>
              {releaseNumber !== "Release --" && (
                <Badge variant="secondary" className="px-2 font-mono text-sm">
                  {releaseNumber}
                </Badge>
              )}
            </div>
            <DialogDescription>
              Browse deployments and review customer or developer release notes.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden">
            <ReleaseNotesViewer compact />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
