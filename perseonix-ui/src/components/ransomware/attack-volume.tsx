import { TrendingUp } from "lucide-react"
import type { SeriesPoint } from "@/lib/ransomware/data"

const W = 1000
const H = 320
const PAD = { top: 20, right: 16, bottom: 34, left: 44 }
const ACCENT = "#ff4d5e"

const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric" })
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" })

function niceMax(v: number): number {
  if (v <= 5) return 5
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

export function AttackVolume({ points, title }: { points: SeriesPoint[]; title: string }) {
  const daily = points.length > 0 && points[0].label.length > 7
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const max = niceMax(Math.max(...points.map((p) => p.count), 1))
  const n = points.length

  const x = (i: number) => PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join(" ")
  const area = `${line} L${x(n - 1).toFixed(1)},${(PAD.top + innerH).toFixed(1)} L${x(0).toFixed(1)},${(PAD.top + innerH).toFixed(1)} Z`

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f))
  const labelEvery = Math.max(1, Math.ceil(n / 9))

  return (
    <section className="rounded-lg border border-ink/[0.09] bg-navy-900/40 p-5">
      <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.15em] text-ink uppercase">
        <TrendingUp className="size-4 text-sev-critical" />
        {title}
      </h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 block w-full" role="img" aria-label={title}>
        <defs>
          <linearGradient id="rw-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.35} />
            <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#1b2740" strokeWidth={1} strokeDasharray="2 4" />
            <text x={PAD.left - 8} y={y(t) + 3} textAnchor="end" className="fill-muted-foreground" fontSize={11} fontFamily="monospace">
              {t}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#rw-area)" />
        <path d={line} fill="none" stroke={ACCENT} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) =>
          i % labelEvery === 0 || i === n - 1 ? (
            <text
              key={p.iso}
              x={x(i)}
              y={H - 12}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
              className="fill-muted-foreground/70"
              fontSize={11}
            >
              {daily ? dayFmt.format(new Date(p.iso)) : monthFmt.format(new Date(p.iso))}
            </text>
          ) : null
        )}
      </svg>
    </section>
  )
}
