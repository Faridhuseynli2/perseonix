"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

const OPTIONS: { value: string; label: string }[] = [
  { value: "30d", label: "Last 30 Days" },
  { value: "6m", label: "Last 6 Months" },
  { value: "1y", label: "Last 1 Year" },
  { value: "all", label: "All Time" },
]

export function RangeTabs({ value }: { value: string }) {
  const router = useRouter()
  const params = useSearchParams()

  function select(next: string) {
    const p = new URLSearchParams(params.toString())
    p.set("range", next)
    router.push(`/app/modules/ransomware?${p.toString()}`, { scroll: false })
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-ink/[0.08] bg-navy-900/60 p-1">
      {OPTIONS.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => select(o.value)}
            aria-pressed={active}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-sev-critical text-white shadow-sm"
                : "text-muted-foreground hover:bg-ink/[0.04] hover:text-ink"
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
