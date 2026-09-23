"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { BellPlus, Check, Loader2 } from "lucide-react"
import { watchTopActors } from "@/app/app/modules/adversaries/relevance-actions"

export function WatchAllButton({ slugs }: { slugs: string[] }) {
  const [pending, start] = useTransition()
  const [done, setDone] = useState<number | null>(null)
  const router = useRouter()

  function run() {
    start(async () => {
      const res = await watchTopActors(slugs)
      setDone(res.added)
      if (res.ok) router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending || slugs.length === 0}
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-glow/40 bg-glow/10 px-3.5 text-sm font-medium text-glow transition-colors hover:bg-glow/20 disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : done !== null ? <Check className="size-4" /> : <BellPlus className="size-4" />}
      {done !== null ? `Watching ${done}` : `Watch top ${Math.min(slugs.length, 10)}`}
    </button>
  )
}
