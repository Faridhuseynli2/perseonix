import type { C2Stack } from "@/lib/c2/data"

// Stacked area chart of active C2 endpoints per software over time. Server-rendered
// SVG (no client lib). Empty-safe.

const W = 760
const H = 300
const PAD_L = 44
const PAD_B = 26
const PAD_T = 10
const PAD_R = 10

function niceMax(v: number): number {
  if (v <= 0) return 10
  const pow = Math.pow(10, Math.floor(Math.log10(v)))
  const n = v / pow
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10
  return step * pow
}

export function C2Chart({ days, stacks }: { days: string[]; stacks: C2Stack[] }) {
  const n = days.length
  const totals = days.map((_, i) => stacks.reduce((s, st) => s + (st.values[i] ?? 0), 0))
  const max = niceMax(Math.max(1, ...totals))
  const plotW = W - PAD_L - PAD_R
  const plotH = H - PAD_T - PAD_B
  const x = (i: number) => PAD_L + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
  const y = (v: number) => PAD_T + plotH - (v / max) * plotH

  // Cumulative baseline for stacking (bottom → top).
  const cum = days.map(() => 0)
  const areas = stacks.map((st) => {
    const lower = cum.map((c) => c)
    const upper = st.values.map((v, i) => cum[i] + (v ?? 0))
    for (let i = 0; i < n; i++) cum[i] = upper[i]
    const top = upper.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" L")
    const bottom = lower.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).reverse().join(" L")
    return { color: st.color, d: `M${top} L${bottom} Z` }
  })

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f))
  const xIdx = n <= 8 ? days.map((_, i) => i) : [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1]
  const fmtDay = (d: string) => {
    const dt = new Date(d + "T00:00:00Z")
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
  }

  const hasData = totals.some((t) => t > 0)

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Active C2 servers over time">
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD_L} y1={y(t)} x2={W - PAD_R} y2={y(t)} stroke="currentColor" className="text-ink/[0.06]" strokeWidth={1} />
            <text x={PAD_L - 8} y={y(t) + 3} textAnchor="end" className="fill-muted-foreground/60 font-mono text-[9px]">
              {t >= 1000 ? `${(t / 1000).toFixed(t % 1000 ? 1 : 0)}k` : t}
            </text>
          </g>
        ))}
        {areas.map((a, i) => (
          <path key={i} d={a.d} fill={a.color} fillOpacity={0.85} stroke={a.color} strokeWidth={0.6} />
        ))}
        {xIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="fill-muted-foreground/60 font-mono text-[9px]">
            {fmtDay(days[i])}
          </text>
        ))}
        {!hasData && (
          <text x={W / 2} y={H / 2} textAnchor="middle" className="fill-muted-foreground/50 font-mono text-[11px]">
            Awaiting first hunt — data appears after the hourly sync.
          </text>
        )}
      </svg>
      {/* Legend */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {stacks.map((st) => (
          <span key={st.key} className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <span aria-hidden className="size-2 rounded-sm" style={{ backgroundColor: st.color }} />
            {st.name}
          </span>
        ))}
      </div>
    </div>
  )
}
