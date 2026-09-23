"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, RefreshCw, TriangleAlert } from "lucide-react"
import { refreshRansomware, type RefreshResult } from "@/app/app/modules/ransomware/actions"
import { cn } from "@/lib/utils"

export function RefreshButton() {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<RefreshResult | null>(null)
  const router = useRouter()

  function run() {
    setResult(null)
    startTransition(async () => {
      const r = await refreshRansomware()
      setResult(r)
      if (r.ok) router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex h-9 items-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-70"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        {pending ? "Refreshing…" : "Refresh data"}
      </button>
      {result && (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px]",
            result.ok ? "text-ok" : "text-alert"
          )}
        >
          {result.ok ? (
            <>
              <Check className="size-3" />
              {result.victimsAdded} new · {result.victimsSeen} scanned · {result.groupsSeen} groups
            </>
          ) : (
            <>
              <TriangleAlert className="size-3" />
              {result.message ?? "Refresh failed."}
            </>
          )}
        </span>
      )}
    </div>
  )
}
