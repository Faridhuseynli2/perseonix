"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { BellPlus, BellRing, Check, Loader2 } from "lucide-react"
import {
  addRansomwareWatch,
  removeRansomwareWatchByFacets,
} from "@/app/app/modules/ransomware/actions"
import type { WatchInput } from "@/lib/ransomware/watch"
import { cn } from "@/lib/utils"

export function RansomwareWatchButton({
  facets,
  initialWatching,
  idleLabel = "Watch",
  size = "md",
}: {
  facets: WatchInput
  initialWatching: boolean
  idleLabel?: string
  size?: "sm" | "md"
}) {
  const [watching, setWatching] = useState(initialWatching)
  const [hover, setHover] = useState(false)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function toggle() {
    setError(null)
    const next = !watching
    setWatching(next)
    start(async () => {
      const res = next ? await addRansomwareWatch(facets) : await removeRansomwareWatchByFacets(facets)
      if (!res.ok) {
        setWatching(!next)
        setError("Restart the dev server once to enable watchlists, then retry.")
        return
      }
      router.refresh()
    })
  }

  const h = size === "sm" ? "h-8 text-xs" : "h-9 text-sm"

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={toggle}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        disabled={pending}
        aria-pressed={watching}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-3.5 font-medium transition-colors disabled:opacity-70",
          h,
          watching
            ? "border border-sev-critical/40 bg-sev-critical/10 text-sev-critical hover:bg-sev-critical/20"
            : "bg-sev-critical text-white hover:bg-sev-critical/90"
        )}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : watching ? (
          hover ? <BellPlus className="size-4 rotate-45" /> : <Check className="size-4" />
        ) : (
          <BellPlus className="size-4" />
        )}
        {watching ? (hover ? "Unwatch" : "Watching") : idleLabel}
        {watching && !hover && !pending && <BellRing className="size-3.5 opacity-70" />}
      </button>
      {error && <span className="max-w-[15rem] text-right text-[11px] text-alert">{error}</span>}
    </div>
  )
}
