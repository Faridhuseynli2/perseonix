import { cn } from "@/lib/utils"

// Presentational, server-rendered SVG widgets for the Overview command center.
// Deliberately different visual language from the Threat Monitor (no map, no feed wall):
// a posture gauge, trend sparklines, and severity distribution bars.

const BAND: Record<string, { label: string; color: string; text: string }> = {
  critical: { label: "Critical", color: "#ff4d5e", text: "text-sev-critical" },
  high: { label: "Elevated", color: "#ff8a3d", text: "text-sev-high" },
  guarded: { label: "Guarded", color: "#ffb400", text: "text-signal" },
  low: { label: "Low", color: "#00b5fa", text: "text-glow" },
}

export function postureBand(score: number): keyof typeof BAND {
  return score >= 75 ? "critical" : score >= 50 ? "high" : score >= 25 ? "guarded" : "low"
}

/** Semicircular risk-posture gauge (0–100). The dashboard's signature visual. */
export function PostureGauge({ score }: { score: number }) {
  const band = BAND[postureBand(score)]
  const LEN = Math.PI * 80 // length of the r=80 semicircle
  const value = Math.max(0, Math.min(100, score))
  const dash = (value / 100) * LEN

  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 200 128" className="w-full max-w-[280px]" role="img" aria-label={`Risk posture ${value}`}>
        <path d="M20,110 A80,80 0 0 1 180,110" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" className="text-ink/[0.08]" />
        <path
          d="M20,110 A80,80 0 0 1 180,110"
          fill="none"
          stroke={band.color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${LEN}`}
          className="motion-safe:animate-gauge-fill"
          style={{ filter: `drop-shadow(0 0 6px ${band.color}66)`, ["--gauge-dash" as string]: String(dash) }}
        />
        <text x="100" y="96" textAnchor="middle" className="fill-ink font-mono text-[44px] font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
          {value}
        </text>
        <text x="100" y="116" textAnchor="middle" fill={band.color} className="font-mono text-[11px] tracking-[0.2em] uppercase">
          {band.label}
        </text>
      </svg>
      <p className="-mt-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground/60 uppercase">Org risk posture</p>
    </div>
  )
}

/** Compact 7-point area sparkline with a headline value + delta vs the first day. */
export function Sparkline({
  data,
  label,
  color = "#00b5fa",
  href,
}: {
  data: number[]
  label: string
  color?: string
  href?: string
}) {
  const max = Math.max(1, ...data)
  const W = 100
  const H = 30
  const step = data.length > 1 ? W / (data.length - 1) : W
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(H - (v / max) * (H - 4) - 2).toFixed(1)}`)
  const line = "M" + pts.join(" L")
  const area = `${line} L${W},${H} L0,${H} Z`
  const total = data.reduce((a, b) => a + b, 0)
  // Momentum: recent half vs the earlier half of the window (honest, no extra fetch).
  const half = Math.floor(data.length / 2)
  const prev = data.slice(0, half).reduce((a, b) => a + b, 0)
  const curr = data.slice(data.length - half).reduce((a, b) => a + b, 0)
  const deltaPct = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0
  const id = "spk-" + label.replace(/\W+/g, "")

  const inner = (
    <div className="rounded-lg border border-ink/[0.08] bg-navy-900/40 p-3 transition-colors hover:border-ink/15">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[9px] tracking-[0.14em] text-muted-foreground/60 uppercase">{label}</p>
        <span
          className={cn(
            "font-mono text-[10px] tabular-nums",
            deltaPct > 0 ? "text-sev-high" : deltaPct < 0 ? "text-ok" : "text-muted-foreground/50"
          )}
          title="Recent 3 days vs the prior 3 days"
        >
          {deltaPct > 0 ? "▲" : deltaPct < 0 ? "▼" : "—"} {Math.abs(deltaPct)}%
        </span>
      </div>
      <p className="mt-1 font-mono text-2xl font-semibold text-ink tabular-nums">{total}</p>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-1 h-8 w-full">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${id})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          strokeDasharray={1}
          className="motion-safe:animate-draw"
        />
      </svg>
      <p className="mt-0.5 font-mono text-[9px] text-muted-foreground/40">last 7 days</p>
    </div>
  )
  return href ? <a href={href}>{inner}</a> : inner
}

/** Horizontal stacked severity distribution bar with a legend. */
export function SeverityBar({
  title,
  segments,
  total,
}: {
  title: string
  segments: { label: string; value: number; color: string }[]
  total: number
}) {
  const sum = Math.max(1, segments.reduce((a, s) => a + s.value, 0))
  return (
    <div className="rounded-lg border border-ink/[0.08] bg-navy-900/40 p-4">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] tracking-[0.14em] text-ink uppercase">{title}</p>
        <span className="font-mono text-[11px] text-muted-foreground/60 tabular-nums">{total}</span>
      </div>
      <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-ink/[0.06]">
        {segments.map((s) => (
          <div key={s.label} style={{ width: `${(s.value / sum) * 100}%`, backgroundColor: s.color }} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
            <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.label} <span className="text-foreground/80 tabular-nums">{s.value}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
