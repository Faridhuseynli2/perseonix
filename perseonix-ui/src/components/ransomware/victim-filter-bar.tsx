"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { countryName } from "@/lib/ransomware/meta"
import { cn } from "@/lib/utils"

type Value = { q: string; country: string; sector: string }

const selectClass =
  "h-11 rounded-lg border border-ink/10 bg-navy-900/70 px-3 font-mono text-[13px] text-ink outline-none transition-colors focus-visible:border-sev-critical/60 focus-visible:ring-3 focus-visible:ring-sev-critical/20"

export function VictimFilterBar({
  value,
  countries,
  sectors,
  resultCount,
}: {
  value: Value
  countries: string[]
  sectors: string[]
  resultCount: number
}) {
  const router = useRouter()
  const queryRef = useRef<HTMLInputElement>(null)

  function apply(next: Partial<Value>) {
    const merged = { ...value, ...next }
    const params = new URLSearchParams()
    if (merged.q.trim()) params.set("q", merged.q.trim())
    if (merged.country) params.set("country", merged.country)
    if (merged.sector) params.set("sector", merged.sector)
    const query = params.toString()
    router.push(`/app/modules/ransomware/victims${query ? `?${query}` : ""}`)
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
          aria-label="Search victims"
          placeholder="Search claimed victims by name…"
          className="h-11 w-full rounded-lg border border-ink/10 bg-navy-900/70 pr-24 pl-11 font-mono text-[13px] text-ink outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground/60 focus-visible:border-sev-critical/60 focus-visible:ring-3 focus-visible:ring-sev-critical/20"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[10px] tracking-wider text-muted-foreground/60 uppercase">
          {resultCount} victims
        </span>
      </div>
      <select
        value={value.sector}
        onChange={(event) => apply({ sector: event.target.value })}
        aria-label="Filter by sector"
        className={cn(selectClass, "lg:w-48")}
      >
        <option value="">All sectors</option>
        {sectors.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        value={value.country}
        onChange={(event) => apply({ country: event.target.value })}
        aria-label="Filter by country"
        className={cn(selectClass, "lg:w-48")}
      >
        <option value="">All countries</option>
        {countries.map((c) => (
          <option key={c} value={c}>
            {countryName(c)}
          </option>
        ))}
      </select>
    </form>
  )
}
