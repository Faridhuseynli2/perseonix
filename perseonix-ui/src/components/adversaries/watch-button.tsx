"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { BellPlus, BellRing, Check, Loader2 } from "lucide-react"
import { followActor, unfollowActor } from "@/app/app/modules/adversaries/actions"
import { cn } from "@/lib/utils"

export function WatchButton({
  slug,
  name,
  initialWatching,
}: {
  slug: string
  name?: string
  initialWatching: boolean
}) {
  const [watching, setWatching] = useState(initialWatching)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [hover, setHover] = useState(false)
  const router = useRouter()

  function toggle() {
    setError(null)
    const next = !watching
    setWatching(next) // optimistic
    startTransition(async () => {
      const result = next ? await followActor(slug, name) : await unfollowActor(slug)
      if (!result.ok) {
        setWatching(!next) // revert
        setError(result.error ?? "Something went wrong.")
        return
      }
      router.refresh()
    })
  }

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
          "inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-sm font-medium transition-colors disabled:opacity-70",
          watching
            ? "border border-glow/40 bg-glow/10 text-glow hover:border-sev-critical/40 hover:bg-sev-critical/10 hover:text-alert"
            : "bg-brand text-white hover:bg-brand/90"
        )}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : watching ? (
          hover ? null : <Check className="size-4" />
        ) : (
          <BellPlus className="size-4" />
        )}
        {watching ? (hover ? "Unwatch" : "Watching") : "Watch actor"}
        {watching && !hover && !pending && <BellRing className="size-3.5 opacity-70" />}
      </button>
      {error ? (
        <span className="max-w-[16rem] text-right text-[11px] text-alert">{error}</span>
      ) : watching ? (
        <span className="text-[11px] text-muted-foreground/70">Alerts on in your bell</span>
      ) : (
        <span className="text-[11px] text-muted-foreground/70">Follow for activity alerts</span>
      )}
    </div>
  )
}
