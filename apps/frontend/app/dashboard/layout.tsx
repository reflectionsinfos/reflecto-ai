"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Award, FileText, LogOut, ShieldAlert } from "lucide-react"
import { useAuth } from "@/hooks/use-auth" // Use new hook
import { AppSidebar } from "@/components/ui/app-sidebar"
import { ReleaseNotesViewer } from "@/components/release-notes-viewer"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false)
  
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
                <div>
                <h1 className="text-xl font-bold text-foreground">Reflecto</h1>
                <p className="text-sm text-muted-foreground">Talent Intelligence Platform</p>
                </div>
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  aria-label="Release Notes"
                  onClick={() => setReleaseNotesOpen(true)}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Release Notes</TooltipContent>
            </Tooltip>
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
        <DialogContent className="flex max-h-[92vh] w-[calc(100vw-2rem)] max-w-[1200px] flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Release Notes</DialogTitle>
            <DialogDescription>
              Review the latest customer and developer release notes.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto pr-1">
            <ReleaseNotesViewer compact />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
