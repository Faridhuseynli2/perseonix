"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Bookmark, Check, ChevronDown, Loader2, Search, Trash2, X } from "lucide-react"
import { deleteNewsFilterAction, saveNewsFilterAction } from "@/app/app/modules/intel/news/actions"
import type { Facet, NewsFacets, SavedFilter } from "@/lib/intel/news"
import { cn } from "@/lib/utils"

const RANGES = [
  { key: "", label: "All time" },
  { key: "1h", label: "1 hour" },
  { key: "24h", label: "24 hours" },
  { key: "3d", label: "3 days" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
]

// facet param → label; order defines the dropdown row
const FACET_DEFS: { param: string; label: string; key: keyof NewsFacets }[] = [
  { param: "sev", label: "Severity", key: "severities" },
  { param: "cat", label: "Category", key: "categories" },
  { param: "region", label: "Country / Region", key: "regions" },
  { param: "ttp", label: "MITRE ATT&CK", key: "ttps" },
  { param: "actor", label: "Threat actor", key: "actors" },
  { param: "malware", label: "Malware", key: "malware" },
  { param: "sector", label: "Sector", key: "sectors" },
]
const MULTI_PARAMS = FACET_DEFS.map((f) => f.param)

export function NewsFilters({ facets, savedFilters }: { facets: NewsFacets; savedFilters: SavedFilter[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  const [pending, startTransition] = useTransition()

  const getList = (param: string) => (sp.get(param)?.split(",").filter(Boolean) ?? [])
  const range = sp.get("range") ?? ""

  function pushParams(mutate: (p: URLSearchParams) => void) {
    const p = new URLSearchParams(sp.toString())
    p.delete("a") // drop deep-link focus when filtering
    mutate(p)
    startTransition(() => router.push(p.toString() ? `${pathname}?${p}` : pathname))
  }
  const toggle = (param: string, value: string) =>
    pushParams((p) => {
      const cur = new Set(getList(param))
      if (cur.has(value)) cur.delete(value)
      else cur.add(value)
      if (cur.size) p.set(param, [...cur].join(","))
      else p.delete(param)
    })
  const setRange = (key: string) => pushParams((p) => (key ? p.set("range", key) : p.delete("range")))
  const clearAll = () => startTransition(() => router.push(pathname))

  const activeCount = MULTI_PARAMS.reduce((n, k) => n + getList(k).length, 0) + (range ? 1 : 0)

  // current filter as a plain object (for saving)
  const currentQuery = (): Record<string, string[] | string> => {
    const q: Record<string, string[] | string> = {}
    for (const k of MULTI_PARAMS) {
      const v = getList(k)
      if (v.length) q[k] = v
    }
    if (range) q.range = range
    return q
  }
  const applySaved = (query: Record<string, string[] | string>) =>
    pushParams((p) => {
      for (const k of [...MULTI_PARAMS, "range"]) p.delete(k)
      for (const [k, v] of Object.entries(query)) p.set(k, Array.isArray(v) ? v.join(",") : String(v))
    })

  const facetLabel = (param: string, value: string): string => {
    if (param === "ttp") {
      const f = facets.ttps.find((t) => t.value === value)
      return f?.label ? `${value} · ${f.label}` : value
    }
    return value
  }

  return (
    <div className="flex flex-col gap-3">
      {/* time range */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground/60 uppercase">Arrived</span>
        <div className="flex flex-wrap items-center gap-0.5 rounded-md border border-ink/[0.08] bg-navy-900/40 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key || "all"}
              type="button"
              onClick={() => setRange(r.key)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[10px] tracking-wide uppercase transition-colors",
                range === r.key ? "bg-glow/15 text-glow" : "text-muted-foreground hover:text-ink"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        {pending && <Loader2 className="size-3.5 animate-spin text-muted-foreground/50" />}
      </div>

      {/* facet dropdowns + saved */}
      <div className="flex flex-wrap items-center gap-2">
        {FACET_DEFS.map((def) => {
          const values = facets[def.key]
          if (!values.length) return null
          return (
            <FacetDropdown
              key={def.param}
              label={def.label}
              param={def.param}
              values={values}
              selected={getList(def.param)}
              onToggle={(v) => toggle(def.param, v)}
              renderValue={(v) => facetLabel(def.param, v)}
            />
          )
        })}
        <div className="ml-auto flex items-center gap-2">
          <SavedFiltersMenu
            savedFilters={savedFilters}
            canSave={activeCount > 0}
            getQuery={currentQuery}
            onApply={applySaved}
          />
        </div>
      </div>

      {/* active chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {MULTI_PARAMS.flatMap((param) =>
            getList(param).map((v) => (
              <button
                key={param + v}
                type="button"
                onClick={() => toggle(param, v)}
                className="inline-flex items-center gap-1 rounded-full border border-glow/25 bg-glow/[0.06] px-2.5 py-1 text-[11px] text-glow transition-colors hover:bg-sev-critical/10 hover:text-alert"
              >
                {facetLabel(param, v)}
                <X className="size-3" />
              </button>
            ))
          )}
          <button
            type="button"
            onClick={clearAll}
            className="ml-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-ink"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}

function FacetDropdown({
  label,
  param,
  values,
  selected,
  onToggle,
  renderValue,
}: {
  label: string
  param: string
  values: Facet[]
  selected: string[]
  onToggle: (v: string) => void
  renderValue: (v: string) => string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  const term = q.trim().toLowerCase()
  const shown = (term ? values.filter((v) => (v.value + " " + (v.label ?? "")).toLowerCase().includes(term)) : values).slice(0, 60)
  const selCount = selected.length

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-colors",
          selCount > 0
            ? "border-glow/30 bg-glow/[0.08] text-glow"
            : "border-ink/[0.08] bg-navy-900/40 text-muted-foreground hover:text-ink"
        )}
      >
        {label}
        {selCount > 0 && <span className="rounded bg-glow/20 px-1 font-mono text-[9px] tabular-nums">{selCount}</span>}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-72 rounded-lg border border-ink/12 bg-navy-950/95 p-2 shadow-xl backdrop-blur">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Filter ${label.toLowerCase()}…`}
              className="h-8 w-full rounded-md border border-ink/10 bg-navy-900/60 pr-2 pl-8 text-[12px] text-ink placeholder:text-muted-foreground/50 focus:border-glow/40 focus:outline-none"
            />
          </div>
          <ul className="mt-1.5 max-h-64 overflow-y-auto">
            {shown.length === 0 && <li className="px-2 py-3 text-center text-[12px] text-muted-foreground">No matches.</li>}
            {shown.map((v) => {
              const on = selected.includes(v.value)
              return (
                <li key={v.value}>
                  <button
                    type="button"
                    onClick={() => onToggle(v.value)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-ink/[0.05]"
                  >
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded border",
                        on ? "border-glow bg-glow/20 text-glow" : "border-ink/20"
                      )}
                    >
                      {on && <Check className="size-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-foreground/90">{renderValue(v.value)}</span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground/50 tabular-nums">{v.count}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          {param === "ttp" && (
            <p className="mt-1 px-2 pt-1 font-mono text-[9px] text-muted-foreground/50">Search a technique id or name (e.g. exploit, phishing).</p>
          )}
        </div>
      )}
    </div>
  )
}

function SavedFiltersMenu({
  savedFilters,
  canSave,
  getQuery,
  onApply,
}: {
  savedFilters: SavedFilter[]
  canSave: boolean
  getQuery: () => Record<string, string[] | string>
  onApply: (q: Record<string, string[] | string>) => void
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  function save() {
    const name = window.prompt("Name this filter view:")
    if (!name?.trim()) return
    startTransition(async () => {
      await saveNewsFilterAction(name, getQuery())
      router.refresh()
    })
  }
  function remove(id: string) {
    startTransition(async () => {
      await deleteNewsFilterAction(id)
      router.refresh()
    })
  }

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={save}
        disabled={!canSave || pending}
        className="inline-flex items-center gap-1.5 rounded-full border border-ink/[0.1] bg-navy-900/40 px-3 py-1 text-[12px] text-muted-foreground transition-colors hover:text-ink disabled:opacity-40"
        title={canSave ? "Save current filter" : "Select filters to save a view"}
      >
        <Bookmark className="size-3.5" /> Save view
      </button>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-ink/[0.1] bg-navy-900/40 px-3 py-1 text-[12px] text-muted-foreground transition-colors hover:text-ink"
      >
        Saved views
        {savedFilters.length > 0 && (
          <span className="rounded bg-ink/10 px-1 font-mono text-[9px] tabular-nums">{savedFilters.length}</span>
        )}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-full right-0 z-30 mt-1.5 w-64 rounded-lg border border-ink/12 bg-navy-950/95 p-1.5 shadow-xl backdrop-blur">
          {savedFilters.length === 0 ? (
            <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">
              No saved views yet. Pick filters, then “Save view”.
            </p>
          ) : (
            <ul className="grid gap-0.5">
              {savedFilters.map((s) => (
                <li key={s.id} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onApply(s.query)
                      setOpen(false)
                    }}
                    className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-[13px] text-foreground/90 transition-colors hover:bg-ink/[0.05] hover:text-ink"
                  >
                    {s.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    aria-label={`Delete ${s.name}`}
                    className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:bg-sev-critical/10 hover:text-alert"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
