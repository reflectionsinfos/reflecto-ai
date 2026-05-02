"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarDays, Code2, FileText, Users, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ReleaseNoteEntry = {
  release: string
  date?: string
  branch?: string
  commit?: string
  customer?: string | null
  developer?: string | null
  files?: string[]
}

type ReleaseNotesManifest = {
  latest?: string | null
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
        if (!response.ok) {
          throw new Error("Release notes manifest is not available.")
        }

        const data = (await response.json()) as ReleaseNotesManifest
        if (!mounted) return

        setManifest(data)
        const initialRelease = data.latest || data.releases?.[0]?.release || ""
        setSelectedRelease(initialRelease)
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
  const activeRelease = releases.find((release) => release.release === selectedRelease) || releases[0]

  const noteViews = useMemo<NoteView[]>(() => {
    if (!activeRelease) return []

    const views: NoteView[] = []
    if (activeRelease.customer) {
      views.push({ label: "Customer", icon: Users, url: activeRelease.customer })
    }
    if (activeRelease.developer) {
      views.push({ label: "Developer", icon: Code2, url: activeRelease.developer })
    }

    const knownUrls = new Set(views.map((view) => view.url))
    for (const fileUrl of activeRelease.files || []) {
      if (!knownUrls.has(fileUrl)) {
        views.push({ label: `File ${views.length + 1}`, icon: FileText, url: fileUrl })
      }
    }

    return views
  }, [activeRelease])

  useEffect(() => {
    setSelectedUrl(noteViews[0]?.url || "")
  }, [noteViews])

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">{error}</CardContent>
      </Card>
    )
  }

  if (releases.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          No release notes have been published yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Release</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {releases.map((release) => (
              <Button
                key={release.release}
                variant={release.release === activeRelease?.release ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedRelease(release.release)}
              >
                {release.release}
              </Button>
            ))}
          </div>

          {activeRelease ? (
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {activeRelease.date ? (
                <Badge variant="secondary" className="gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(activeRelease.date).toLocaleString()}
                </Badge>
              ) : null}
              {activeRelease.branch ? <Badge variant="outline">{activeRelease.branch}</Badge> : null}
              {activeRelease.commit ? <Badge variant="outline">{activeRelease.commit}</Badge> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {noteViews.map((view) => (
          <Button
            key={view.url}
            variant={selectedUrl === view.url ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedUrl(view.url)}
          >
            <view.icon className="mr-2 h-4 w-4" />
            {view.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {/* TODO: Before these notes are exposed outside internal users, ensure generated
             HTML is sanitized and does not reveal sensitive internal information. */}
          {selectedUrl ? (
            <iframe
              title="Release notes"
              src={selectedUrl}
              sandbox=""
              className={`w-full rounded-md border-0 bg-white ${compact ? "h-[72vh] min-h-[520px]" : "h-[calc(100vh-20rem)] min-h-[560px]"}`}
            />
          ) : (
            <div className="p-8 text-sm text-muted-foreground">
              No HTML release note files were found for this release.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
