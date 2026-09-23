"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { CATEGORY_KEYS, REGION_KEYS } from "@/lib/adversaries/meta"
import { cn } from "@/lib/utils"

type FilterValue = { q: string; region: string; category: string }

const selectClass =
  "h-11 rounded-lg border border-ink/10 bg-navy-900/70 px-3 font-mono text-[13px] text-ink outline-none transition-colors focus-visible:border-glow/60 focus-visible:ring-3 focus-visible:ring-glow/20"

export function AdversaryFilterBar({
  value,
  resultCount,
}: {
  value: FilterValue
  resultCount: number
}) {
  const router = useRouter()
  const queryRef = useRef<HTMLInputElement>(null)

  function apply(next: Partial<FilterValue>) {
    const merged = { ...value, ...next }
    const params = new URLSearchParams()
    if (merged.q.trim()) params.set("q", merged.q.trim())
    if (merged.region) params.set("region", merged.region)
    if (merged.category) params.set("category", merged.category)
    const query = params.toString()
    router.push(`/app/modules/adversaries${query ? `?${query}` : ""}`)
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
          aria-label="Search threat actors"
          placeholder="Search actor, alias or malware family…"
          className="h-11 w-full rounded-lg border border-ink/10 bg-navy-900/70 pr-24 pl-11 font-mono text-[13px] text-ink outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground/60 focus-visible:border-glow/60 focus-visible:ring-3 focus-visible:ring-glow/20"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase">
          {resultCount} hits
        </span>
      </div>
      <div className="flex gap-3">
        <select
          value={value.region}
          onChange={(event) => apply({ region: event.target.value })}
          aria-label="Filter by origin region"
          className={cn(selectClass, "min-w-0 flex-1 lg:w-40 lg:flex-none")}
        >
          <option value="">All regions</option>
          {REGION_KEYS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={value.category}
          onChange={(event) => apply({ category: event.target.value })}
          aria-label="Filter by type"
          className={cn(selectClass, "min-w-0 flex-1 lg:w-36 lg:flex-none")}
        >
          <option value="">All types</option>
          {CATEGORY_KEYS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
    </form>
  )
}
