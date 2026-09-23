"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

type Value = { q: string; vendor: string; year: string }

const selectClass =
  "h-11 rounded-lg border border-ink/10 bg-navy-900/70 px-3 font-mono text-[13px] text-ink outline-none transition-colors focus-visible:border-glow/60 focus-visible:ring-3 focus-visible:ring-glow/20"

export function CampaignFilterBar({
  value,
  vendors,
  resultCount,
}: {
  value: Value
  vendors: string[]
  resultCount: number
}) {
  const router = useRouter()
  const queryRef = useRef<HTMLInputElement>(null)

  function apply(next: Partial<Value>) {
    const merged = { ...value, ...next }
    const params = new URLSearchParams()
    if (merged.q.trim()) params.set("q", merged.q.trim())
    if (merged.vendor) params.set("vendor", merged.vendor)
    if (merged.year) params.set("year", merged.year)
    const query = params.toString()
    router.push(`/app/modules/adversaries/activity${query ? `?${query}` : ""}`)
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        apply({ q: queryRef.current?.value ?? "" })
      }}
      className="flex flex-col gap-3 rounded-xl border border-ink/[0.07] bg-navy-800/60 p-3 lg:flex-row lg:items-center"
    >
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={queryRef}
          name="q"
          defaultValue={value.q}
          autoComplete="off"
          spellCheck={false}
          aria-label="Search reports"
          placeholder="Search reports by title, actor or vendor…"
          className="h-11 w-full rounded-lg border border-ink/10 bg-navy-900/70 pr-24 pl-11 font-mono text-[13px] text-ink outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground/60 focus-visible:border-glow/60 focus-visible:ring-3 focus-visible:ring-glow/20"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase">
          {resultCount} reports
        </span>
      </div>
      <select
        value={value.vendor}
        onChange={(event) => apply({ vendor: event.target.value })}
        aria-label="Filter by source"
        className={cn(selectClass, "lg:w-52")}
      >
        <option value="">All sources</option>
        {vendors.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    </form>
  )
}
