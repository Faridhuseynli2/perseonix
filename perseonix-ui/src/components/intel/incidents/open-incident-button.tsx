"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Siren } from "lucide-react"
import { openIncidentFromArticleAction } from "@/app/app/modules/intel/news/incidents/actions"
import { cn } from "@/lib/utils"

/** "Open incident" — escalates a Threat-News article into an incident case. */
export function OpenIncidentButton({ articleId, className }: { articleId: string; className?: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function open() {
    setError(null)
    start(async () => {
      const res = await openIncidentFromArticleAction(articleId)
      if (!res.ok || !res.incidentId) {
        setError(res.error ?? "Could not open an incident.")
        return
      }
      router.push(`/app/modules/intel/news/incidents/${res.incidentId}`)
    })
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={open}
        disabled={pending}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/12 bg-ink/[0.03] px-4 text-sm font-medium text-foreground/90 transition-colors hover:bg-ink/[0.07] hover:text-ink disabled:opacity-50",
          className
        )}
      >
        <Siren className="size-4 text-sev-high" />
        {pending ? "Opening…" : "Open incident"}
      </button>
      {error && <p className="text-xs text-sev-critical">{error}</p>}
    </div>
  )
}
