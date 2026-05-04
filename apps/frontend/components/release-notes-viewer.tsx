"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Code2, FileText, GitBranch, GitCommit, Package, Users, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type ReleaseNoteEntry = {
  release: string
  releaseNumber?: string
  build?: string
  date?: string
  branch?: string
  commit?: string
  customer?: string | null
  developer?: string | null
  files?: string[]
}

type ReleaseNotesManifest = {
  latest?: string | null
  current?: ReleaseNoteEntry | null
  releases?: ReleaseNoteEntry[]
}

type NoteView = {
  label: string
  icon: LucideIcon
  url: string
}

type ReleaseNotesViewerProps = {
  compact?: boolean
}

export function ReleaseNotesViewer({ compact = false }: ReleaseNotesViewerProps) {
  const [manifest, setManifest] = useState<ReleaseNotesManifest | null>(null)
  const [selectedRelease, setSelectedRelease] = useState<string>("")
  const [selectedUrl, setSelectedUrl] = useState<string>("")
  const [error, setError] = useState<string>("")

  useEffect(() => {
    let mounted = true

    async function loadManifest() {
      try {
        const response = await fetch("/release-notes/manifest.json", { cache: "no-store" })
        if (!response.ok) throw new Error("Release notes manifest is not available.")

        const data = (await response.json()) as ReleaseNotesManifest
        if (!mounted) return

        setManifest(data)
        const initial = data.current?.release || data.latest || data.releases?.[0]?.release || ""
        setSelectedRelease(initial)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : "Release notes could not be loaded.")
      }
    }

    loadManifest()
    return () => {
      mounted = false
    }
  }, [])

  const releases = manifest?.releases || []
  const latestRelease = manifest?.current?.release || manifest?.latest
  const activeRelease = releases.find((r) => r.release === selectedRelease) ?? releases[0]

  const noteViews = useMemo<NoteView[]>(() => {
    if (!activeRelease) return []
    const views: NoteView[] = []
    if (activeRelease.customer) views.push({ label: "Customer", icon: Users, url: activeRelease.customer })
    if (activeRelease.developer) views.push({ label: "Developer", icon: Code2, url: activeRelease.developer })
    const knownUrls = new Set(views.map((v) => v.url))
    for (const fileUrl of activeRelease.files ?? []) {
      if (!knownUrls.has(fileUrl)) {
        views.push({ label: `File ${views.length + 1}`, icon: FileText, url: fileUrl })
      }
    }
    return views
  }, [activeRelease])

  useEffect(() => {
    setSelectedUrl(noteViews[0]?.url ?? "")
  }, [noteViews])

  const emptyClass = cn(
    "flex items-center justify-center",
    compact ? "h-full" : "min-h-[400px] rounded-lg border",
  )

  if (error) {
    return (
      <div className={emptyClass}>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (releases.length === 0) {
    return (
      <div className={emptyClass}>
        <p className="text-sm text-muted-foreground">No release notes have been published yet.</p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex overflow-hidden",
        compact ? "h-full" : "h-[calc(100vh-12rem)] min-h-[500px] rounded-lg border",
      )}
    >
      {/* ── Left sidebar: deployment list ─────────────────────────── */}
      <div className="flex w-52 shrink-0 flex-col border-r bg-muted/20">
        <div className="border-b px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Deployments
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {releases.map((release) => {
            const isActive = release.release === activeRelease?.release
            const isLatest = release.release === latestRelease
            const releaseDate = release.date ? new Date(release.date) : null

            return (
              <button
                key={release.release}
                type="button"
                onClick={() => setSelectedRelease(release.release)}
                className={cn(
                  "w-full border-b border-l-2 px-3 py-2.5 text-left transition-colors",
                  isActive
                    ? "border-l-primary bg-primary/10"
                    : "border-l-transparent hover:bg-muted/50",
                )}
              >
                <div className="mb-0.5 flex items-center gap-1.5">
                  <span className={cn("text-sm font-semibold", isActive && "text-primary")}>
                    {release.releaseNumber || release.release}
                  </span>
                  {isLatest && (
                    <Badge className="h-4 px-1 text-[9px] font-bold leading-none">LATEST</Badge>
                  )}
                </div>
                {release.commit && (
                  <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                    <GitCommit className="h-2.5 w-2.5 shrink-0" />
                    {release.commit}
                  </div>
                )}
                {releaseDate && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {releaseDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    {" · "}
                    {releaseDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Right content area ─────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Metadata bar */}
        {activeRelease && (
          <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b bg-card/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-base font-bold">
                {activeRelease.releaseNumber || activeRelease.release}
              </span>
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {activeRelease.date && (
                <Badge variant="secondary" className="h-6 gap-1 text-xs">
                  <CalendarDays className="h-3 w-3" />
                  {new Date(activeRelease.date).toLocaleString()}
                </Badge>
              )}
              {activeRelease.branch && (
                <Badge variant="outline" className="h-6 max-w-xs gap-1 text-xs">
                  <GitBranch className="h-3 w-3 shrink-0" />
                  <span className="truncate">{activeRelease.branch}</span>
                </Badge>
              )}
              {activeRelease.commit && (
                <Badge variant="outline" className="h-6 gap-1 font-mono text-xs">
                  <GitCommit className="h-3 w-3 shrink-0" />
                  {activeRelease.commit}
                </Badge>
              )}
            </div>
            {activeRelease.build && (
              <span className="ml-auto text-xs text-muted-foreground">
                Build: {activeRelease.build}
              </span>
            )}
          </div>
        )}

        {/* Tab bar */}
        {noteViews.length > 0 && (
          <div className="flex shrink-0 border-b bg-card/30 px-3">
            {noteViews.map((view) => (
              <button
                key={view.url}
                type="button"
                onClick={() => setSelectedUrl(view.url)}
                className={cn(
                  "-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm transition-colors",
                  selectedUrl === view.url
                    ? "border-primary font-medium text-primary"
                    : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground",
                )}
              >
                <view.icon className="h-3.5 w-3.5" />
                {view.label}
              </button>
            ))}
          </div>
        )}

        {/* Content iframe */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {/* TODO: Before exposing to external users, ensure generated HTML is sanitized. */}
          {selectedUrl ? (
            <iframe
              title="Release notes"
              src={selectedUrl}
              sandbox=""
              className="h-full w-full border-0 bg-white"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No release notes available for this deployment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
