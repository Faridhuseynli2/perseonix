"use client"

import { useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, SlidersHorizontal, X } from "lucide-react"
import type { Option } from "@/lib/ransomware/data"
import { countryName, flagEmoji } from "@/lib/ransomware/meta"
import { cn } from "@/lib/utils"

type Value = { q: string; country: string; group: string; sector: string; range: string }

const WINDOWS = [
  { value: "30d", label: "30D" },
  { value: "6m", label: "6M" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "ALL" },
]

const selectClass =
  "peer h-10 w-full appearance-none rounded-md border border-ink/12 bg-navy-950/60 pr-8 pl-3 font-mono text-[12px] text-ink outline-none transition-colors hover:border-ink/25 focus-visible:border-sev-critical/60 focus-visible:ring-2 focus-visible:ring-sev-critical/20"

export function FilterRail({
  value,
  countries,
  sectors,
  groups,
}: {
  value: Value
  countries: string[]
  sectors: string[]
  groups: Option[]
}) {
  const router = useRouter()
  const queryRef = useRef<HTMLInputElement>(null)

  function apply(next: Partial<Value>) {
    const merged = { ...value, ...next }
    const p = new URLSearchParams()
    if (merged.range && merged.range !== "1y") p.set("range", merged.range)
    if (merged.country) p.set("country", merged.country)
    if (merged.group) p.set("group", merged.group)
    if (merged.sector) p.set("sector", merged.sector)
    if (merged.q.trim()) p.set("q", merged.q.trim())
    const s = p.toString()
    router.push(`/app/modules/ransomware${s ? `?${s}` : ""}`, { scroll: false })
  }

  const groupLabel = groups.find((g) => g.value === value.group)?.label ?? value.group
  const chips = [
    value.country && { k: "country", label: `${flagEmoji(value.country)} ${countryName(value.country)}` },
    value.group && { k: "group", label: groupLabel },
    value.sector && { k: "sector", label: value.sector },
    value.q && { k: "q", label: `“${value.q}”` },
  ].filter(Boolean) as { k: string; label: string }[]

  return (
    <div className="rounded-lg border border-ink/[0.09] bg-navy-900/50">
      <div className="flex flex-col gap-3 p-3 lg:flex-row lg:items-stretch">
        {/* Window segmented control */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden items-center gap-1.5 font-mono text-[10px] tracking-[0.15em] text-muted-foreground/60 uppercase sm:flex">
            <SlidersHorizontal className="size-3.5" />
            Filters
          </span>
          <div className="flex items-center rounded-md border border-ink/12 bg-navy-950/60 p-0.5">
            {WINDOWS.map((w) => (
              <button
                key={w.value}
                type="button"
                onClick={() => apply({ range: w.value })}
                aria-pressed={value.range === w.value}
                className={cn(
                  "rounded px-2.5 py-1.5 font-mono text-[11px] font-semibold tracking-wide transition-colors",
                  value.range === w.value
                    ? "bg-sev-critical text-white"
                    : "text-muted-foreground hover:text-ink"
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        <span aria-hidden className="hidden w-px self-stretch bg-ink/10 lg:block" />

        {/* Category selectors */}
        <div className="grid flex-1 grid-cols-2 gap-2 lg:grid-cols-4">
          <Field label="Country">
            <select className={selectClass} value={value.country} onChange={(e) => apply({ country: e.target.value })} aria-label="Filter by country">
              <option value="">All countries</option>
              {countries.map((c) => (
                <option key={c} value={c}>{countryName(c)}</option>
              ))}
            </select>
          </Field>
          <Field label="Group">
            <select className={selectClass} value={value.group} onChange={(e) => apply({ group: e.target.value })} aria-label="Filter by group">
              <option value="">All groups</option>
              {groups.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Sector">
            <select className={selectClass} value={value.sector} onChange={(e) => apply({ sector: e.target.value })} aria-label="Filter by sector">
              <option value="">All sectors</option>
              {sectors.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Victim">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                apply({ q: queryRef.current?.value ?? "" })
              }}
              className="relative"
            >
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={queryRef}
                defaultValue={value.q}
                autoComplete="off"
                spellCheck={false}
                placeholder="name…"
                aria-label="Search victim name"
                className="h-10 w-full rounded-md border border-ink/12 bg-navy-950/60 pr-3 pl-8 font-mono text-[12px] text-ink outline-none transition-colors hover:border-ink/25 focus-visible:border-sev-critical/60 focus-visible:ring-2 focus-visible:ring-sev-critical/20"
              />
            </form>
          </Field>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-ink/[0.07] px-3 py-2.5">
          <span className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground/50 uppercase">Active</span>
          {chips.map((chip) => (
            <button
              key={chip.k}
              type="button"
              onClick={() => apply({ [chip.k]: "" } as Partial<Value>)}
              className="inline-flex items-center gap-1.5 rounded border border-sev-critical/25 bg-sev-critical/10 px-2 py-1 text-[11px] text-sev-critical transition-colors hover:bg-sev-critical/20"
            >
              {chip.label}
              <X className="size-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => router.push("/app/modules/ransomware", { scroll: false })}
            className="ml-1 font-mono text-[10px] tracking-wide text-muted-foreground/70 uppercase hover:text-ink"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="font-mono text-[9px] tracking-[0.15em] text-muted-foreground/50 uppercase">{label}</span>
      <div className="relative">
        {children}
      </div>
    </label>
  )
}
