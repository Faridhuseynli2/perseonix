"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FolderPlus } from "lucide-react"
import { openCaseFromDetectionAction } from "@/app/app/modules/brand/cases/actions"

export function OpenCaseButton({ detectionId }: { detectionId: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function open() {
    setError(null)
    start(async () => {
      const res = await openCaseFromDetectionAction(detectionId)
      if (!res.ok || !res.caseId) {
        setError(res.error ?? "Could not open a case.")
        return
      }
      router.push(`/app/modules/brand/cases/${res.caseId}`)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/12 bg-ink/[0.03] px-4 text-sm font-medium text-foreground/90 transition-colors hover:bg-ink/[0.07] hover:text-ink disabled:opacity-50"
      >
        <FolderPlus className="size-4" />
        {pending ? "Opening…" : "Open case"}
      </button>
      {error && <p className="text-xs text-sev-critical">{error}</p>}
    </div>
  )
}
