"use client"

import { ReleaseNotesViewer } from "@/components/release-notes-viewer"

export default function ReleaseNotesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Release Notes</h1>
        <p className="text-muted-foreground">
          Review the latest customer and developer release notes.
        </p>
      </div>

      <ReleaseNotesViewer />
    </div>
  )
}
