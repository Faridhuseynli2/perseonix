import Link from "next/link"
import { ArrowUpRight, type LucideIcon } from "lucide-react"
import type { RankRow } from "@/lib/ransomware/data"

// Presentational building blocks for the Threat Command "live wall" — dense,
// terminal-style columns shared by the dashboard page and its visual fixture.

const n = (x: number) => x.toLocaleString("en-US")

export function FeedCol({
  title,
  count,
  live,
  children,
}: {
  title: string
  count?: number
  live?: boolean
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-ink/[0.08] bg-navy-900/40">
      <header className="flex items-center justify-between gap-2 border-b border-ink/[0.06] px-3 py-2">
        <span className="font-mono text-[10.5px] font-semibold tracking-[0.12em] text-ink uppercase">{title}</span>
        <span className="flex items-center gap-2">
          {typeof count === "number" && count > 0 && (
            <span className="font-mono text-[9px] text-muted-foreground/50 tabular-nums">{count}</span>
          )}
          {live ? (
            <span className="inline-flex items-center gap-1 font-mono text-[8px] tracking-wide text-glow uppercase">
              <span aria-hidden className="size-1 rounded-full bg-glow motion-safe:animate-beacon" /> live
            </span>
          ) : (
            <span className="font-mono text-[8px] tracking-wide text-muted-foreground/40 uppercase">idle</span>
          )}
        </span>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

export function Rows({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-ink/[0.05]">{children}</ul>
}

export function StreamRow({
  href,
  headline,
  tag,
  meta,
  time,
}: {
  href: string
  headline: string
  tag: string
  meta: string
  time: string
}) {
  return (
    <li>
      <Link href={href} className="block px-3 py-1.5 transition-colors hover:bg-ink/[0.04]">
        <div className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-[12px] text-ink" title={headline}>
            {headline}
          </span>
          <span className="shrink-0 font-mono text-[9px] text-muted-foreground/55 tabular-nums">{time}</span>
        </div>
        <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/70">
          <span className="text-sev-critical/85 uppercase">{tag}</span>
          {meta && <span> · {meta}</span>}
        </p>
      </Link>
    </li>
  )
}

export function RankRows({ rows, render }: { rows: RankRow[]; render: (r: RankRow) => string }) {
  if (rows.length === 0) return <Empty>No data yet.</Empty>
  return (
    <ul className="divide-y divide-ink/[0.05]">
      {rows.map((r, i) => (
        <li key={r.key} className="flex items-center gap-2.5 px-3 py-1.5">
          <span className="w-4 shrink-0 font-mono text-[10px] text-muted-foreground/40 tabular-nums">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/90">{render(r)}</span>
          <span className="relative h-1 w-12 shrink-0 overflow-hidden rounded-full bg-ink/[0.06]">
            <span className="absolute inset-y-0 left-0 rounded-full bg-sev-critical/70" style={{ width: `${Math.max(6, r.pct)}%` }} />
          </span>
          <span className="w-8 shrink-0 text-right font-mono text-[10px] text-muted-foreground tabular-nums">{n(r.count)}</span>
        </li>
      ))}
    </ul>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-3 py-5 text-center text-[11px] leading-relaxed text-muted-foreground/60">{children}</p>
}

export function Awaiting({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <div className="grid place-items-center px-3 py-6 text-center">
      <Icon className="size-5 text-muted-foreground/30" />
      <p className="mt-2 text-[11px] text-muted-foreground/60">No data ingested yet.</p>
      <Link href={href} className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-glow hover:text-ink">
        {label} <ArrowUpRight className="size-3" />
      </Link>
    </div>
  )
}
