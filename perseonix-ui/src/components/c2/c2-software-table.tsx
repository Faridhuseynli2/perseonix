"use client"

import { useMemo, useState } from "react"
import { ArrowUpDown, Search } from "lucide-react"
import type { C2Stat } from "@/lib/c2/data"
import { colorForSoftware } from "@/lib/c2/catalog"
import { cn } from "@/lib/utils"

const n = (x: number) => x.toLocaleString("en-US")

export function C2SoftwareTable({ software, periodLabel }: { software: C2Stat[]; periodLabel: string }) {
  const [q, setQ] = useState("")
  const [dir, setDir] = useState<"desc" | "asc">("desc")

  const rows = useMemo(() => {
    const filtered = q
      ? software.filter(
          (s) =>
            s.name.toLowerCase().includes(q.toLowerCase()) ||
            (s.category ?? "").toLowerCase().includes(q.toLowerCase()) ||
            s.tags.some((t) => t.toLowerCase().includes(q.toLowerCase()))
        )
      : software
    return [...filtered].sort((a, b) => (dir === "desc" ? b.count - a.count : a.count - b.count))
  }, [software, q, dir])

  return (
    <div>
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/60" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search software…"
          className="h-10 w-full rounded-lg border border-ink/10 bg-navy-950/50 pl-10 pr-3 text-sm text-ink placeholder:text-muted-foreground/50 outline-none focus:border-glow/60 focus:ring-2 focus:ring-glow/20"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-ink/[0.08]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/[0.08] bg-navy-900/40 text-left">
              <th className="px-4 py-3 font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">Software</th>
              <th className="px-4 py-3 font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">Category</th>
              <th className="hidden px-4 py-3 font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase sm:table-cell">Tags</th>
              <th className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => setDir((d) => (d === "desc" ? "asc" : "desc"))}
                  className="inline-flex items-center gap-1 font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase transition-colors hover:text-ink"
                >
                  Count for period <ArrowUpDown className="size-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  {software.length === 0 ? "No C2 software counted yet — the hourly hunt fills this in." : "No matches."}
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={s.key} className="border-b border-ink/[0.05] transition-colors last:border-0 hover:bg-ink/[0.03]">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className="grid size-6 shrink-0 place-items-center rounded font-mono text-[11px] font-semibold text-white"
                        style={{ backgroundColor: colorForSoftware(s.key) }}
                      >
                        {s.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-medium text-ink">{s.name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.category && (
                      <span className="inline-flex items-center rounded-full border border-ink/10 bg-ink/[0.03] px-2.5 py-0.5 text-[11px] text-muted-foreground">
                        {s.category}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <span className="flex flex-wrap gap-1">
                      {s.tags.map((t) => (
                        <span key={t} className="inline-flex items-center rounded-full border border-ink/10 bg-ink/[0.03] px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className={cn("px-4 py-3 text-right font-mono tabular-nums", s.count > 0 ? "text-ink" : "text-muted-foreground/50")}>
                    {n(s.count)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-mono text-[10px] text-muted-foreground/50">Peak distinct endpoints seen · {periodLabel}</p>
    </div>
  )
}
