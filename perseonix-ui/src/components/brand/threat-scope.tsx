"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUpRight, Crosshair, Globe, Mail, ScanLine, ShieldAlert, Type } from "lucide-react"
import type { DetectionRow } from "@/lib/brand/store"
import { cn } from "@/lib/utils"

// Signature visual for Brand Protection: the protected brand at the centre, with
// each lookalike placed by ATTACK READINESS — distance to the centre encodes how
// close the domain is to actually attacking you (the impersonation kill-chain),
// colour = severity, size = risk. Interactive: hover/focus a blip to inspect it.
// Deliberately bespoke — every position carries meaning, not decoration.

const SIZE = 460
const C = SIZE / 2

// Ring radius per kill-chain stage (3 = innermost = armed / most dangerous).
const RING_R: Record<number, number> = { 0: 206, 1: 160, 2: 114, 3: 72 }
const STAGE_PHASE: Record<number, number> = { 0: 0.6, 1: 1.7, 2: 2.9, 3: 0.2 }

const SEV_COLOR: Record<string, string> = { high: "#ff4d5e", medium: "#ffb400", low: "#6b7ba3" }

// Round SVG coordinates so server- and client-rendered strings match exactly
// (avoids float-precision hydration warnings).
const r2 = (n: number) => Math.round(n * 100) / 100

type Stage = 0 | 1 | 2 | 3

/** How close this lookalike is to being able to attack — the impersonation kill-chain. */
function stageOf(d: DetectionRow): Stage {
  if (d.status === "malicious") return 3
  if (!d.resolves) return 0 // registered / parked / taken down — no live capability
  if (d.hasMx && d.hasCert) return 3 // armed: hosts, sends mail as you, valid TLS
  if (d.hasMx || d.hasCert) return 2 // escalating: gaining capability
  return 1 // live: resolves
}

const STAGE_META: Record<Stage, { label: string; blurb: string; color: string }> = {
  3: { label: "Armed", blurb: "Resolves, can email as your brand, valid TLS — ready to phish now.", color: "#ff4d5e" },
  2: { label: "Escalating", blurb: "Gaining attack capability (mail or a TLS certificate).", color: "#ff8a3d" },
  1: { label: "Live", blurb: "The domain resolves — infrastructure is up.", color: "#ffb400" },
  0: { label: "Registered", blurb: "Registered or parked — not resolving yet.", color: "#6b7ba3" },
}

type Blip = { d: DetectionRow; x: number; y: number; r: number; stage: Stage; color: string; offline: boolean }

export function ThreatScope({
  detections,
  brand,
  totalDomains,
}: {
  detections: DetectionRow[]
  brand: string
  totalDomains: number
}) {
  const router = useRouter()
  const [motion, setMotion] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: no-preference)")
    const sync = () => setMotion(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])

  const blips = useMemo<Blip[]>(() => {
    const byStage: Record<number, DetectionRow[]> = { 0: [], 1: [], 2: [], 3: [] }
    for (const d of detections) byStage[stageOf(d)].push(d)
    const out: Blip[] = []
    for (const key of [0, 1, 2, 3] as Stage[]) {
      const group = byStage[key].slice().sort((a, b) => b.score - a.score)
      const n = group.length
      group.forEach((d, i) => {
        const angle = ((i + 0.5) / Math.max(n, 1)) * Math.PI * 2 + STAGE_PHASE[key]
        const jitter = ((i % 2) * 2 - 1) * 7
        const rr = RING_R[key] + jitter
        out.push({
          d,
          x: r2(C + Math.cos(angle) * rr),
          y: r2(C + Math.sin(angle) * rr),
          r: r2(Math.max(4.5, Math.min(13, 4.5 + (Math.sqrt(d.score) / 10) * 8))),
          stage: key,
          color: SEV_COLOR[d.severity] ?? SEV_COLOR.low,
          offline: Boolean(d.offlineAt),
        })
      })
    }
    return out
  }, [detections])

  // Default the readout to the single most dangerous lookalike.
  const mostDangerous = useMemo(() => {
    let best: Blip | null = null
    for (const b of blips) {
      if (!best || b.stage * 1000 + b.d.score > best.stage * 1000 + best.d.score) best = b
    }
    return best?.d ?? null
  }, [blips])

  const active = detections.find((d) => d.id === activeId) ?? mostDangerous
  const empty = detections.length === 0

  const counts = useMemo(() => {
    const c = { armed: 0, live: 0 }
    for (const b of blips) {
      if (b.stage === 3) c.armed++
      if (b.stage >= 1) c.live++
    }
    return c
  }, [blips])

  return (
    <figure className="relative overflow-hidden rounded-lg border border-ink/[0.09] bg-navy-950/40">
      <figcaption className="flex items-center justify-between border-b border-ink/[0.07] px-4 py-3">
        <span className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.18em] text-ink uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-sev-critical motion-safe:animate-beacon" />
          Impersonation threat scope
        </span>
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground/55 uppercase">
          {detections.length} tracked
        </span>
      </figcaption>

      <div className="flex flex-col gap-2 p-3 lg:flex-row lg:items-stretch">
        {/* Scope */}
        <div className="relative min-w-0 flex-1">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="mx-auto block w-full max-w-[460px]"
            role="img"
            aria-label={`Lookalike domains for ${brand} placed by attack readiness`}
          >
            <defs>
              <radialGradient id="ts-core" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#128eec" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#128eec" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="ts-heat" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ff4d5e" stopOpacity="0.12" />
                <stop offset="42%" stopColor="#ff4d5e" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="ts-sweep" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#00e0ff" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#00e0ff" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* danger heat toward the centre */}
            <circle cx={C} cy={C} r={RING_R[0]} fill="url(#ts-heat)" />

            {/* spokes */}
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2
              return (
                <line
                  key={i}
                  x1={C}
                  y1={C}
                  x2={r2(C + Math.cos(a) * RING_R[0])}
                  y2={r2(C + Math.sin(a) * RING_R[0])}
                  stroke="#1b2740"
                  strokeWidth={0.5}
                />
              )
            })}

            {/* kill-chain rings */}
            {[0, 1, 2, 3].map((s) => (
              <circle
                key={`r${s}`}
                cx={C}
                cy={C}
                r={RING_R[s]}
                fill="none"
                stroke={s === 3 ? "#ff4d5e" : "#33436b"}
                strokeOpacity={s === 3 ? 0.35 : 0.2}
                strokeWidth={1}
                strokeDasharray={s === 3 ? "2 4" : "3 6"}
              />
            ))}

            {/* rotating radar sweep */}
            <g style={{ transformOrigin: `${C}px ${C}px` }}>
              <path
                d={`M${C},${C} L${C + RING_R[0]},${C - 46} A${RING_R[0]},${RING_R[0]} 0 0,1 ${C + RING_R[0]},${C + 46} Z`}
                fill="url(#ts-sweep)"
              >
                {motion && (
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`0 ${C} ${C}`}
                    to={`360 ${C} ${C}`}
                    dur="7s"
                    repeatCount="indefinite"
                  />
                )}
              </path>
            </g>

            {/* centre = protected brand */}
            <circle cx={C} cy={C} r={46} fill="url(#ts-core)" />
            <circle cx={C} cy={C} r={13} fill="none" stroke="#00b5fa" strokeOpacity={0.5} strokeWidth={1} />
            <circle cx={C} cy={C} r={7} fill="#00b5fa" />

            {/* blips */}
            {blips.map((b) => {
              const isActive = active?.id === b.d.id
              return (
                <g
                  key={b.d.id}
                  className="cursor-pointer"
                  tabIndex={0}
                  role="button"
                  aria-label={`${b.d.domain}, ${STAGE_META[b.stage].label}, risk ${b.d.score}`}
                  onMouseEnter={() => setActiveId(b.d.id)}
                  onFocus={() => setActiveId(b.d.id)}
                  onClick={() => router.push(`/app/modules/brand/detections/${b.d.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") router.push(`/app/modules/brand/detections/${b.d.id}`)
                  }}
                >
                  {/* generous invisible hit area */}
                  <circle cx={b.x} cy={b.y} r={b.r + 8} fill="transparent" />
                  {isActive && (
                    <circle cx={b.x} cy={b.y} r={b.r + 6} fill="none" stroke={b.color} strokeOpacity={0.5} strokeWidth={1.5} />
                  )}
                  <circle cx={b.x} cy={b.y} r={b.r + 3} fill={b.color} fillOpacity={b.offline ? 0.05 : 0.16} />
                  <circle
                    cx={b.x}
                    cy={b.y}
                    r={b.r}
                    fill={b.offline ? "transparent" : b.color}
                    fillOpacity={b.offline ? 0 : isActive ? 1 : 0.9}
                    stroke={b.color}
                    strokeWidth={b.offline ? 1.25 : isActive ? 1.5 : 0}
                    strokeOpacity={b.offline ? 0.7 : 1}
                  >
                    <title>{`${b.d.domain} — ${STAGE_META[b.stage].label} · risk ${b.d.score}${b.offline ? " · offline" : ""}`}</title>
                  </circle>
                </g>
              )
            })}
          </svg>

          {/* centre label */}
          <div className="pointer-events-none absolute inset-x-0 top-1/2 mt-2.5 text-center">
            <p className="font-mono text-[11px] font-semibold text-glow">{brand}</p>
            {totalDomains > 1 && (
              <p className="font-mono text-[9px] text-muted-foreground/60">+{totalDomains - 1} more protected</p>
            )}
          </div>

          {empty && (
            <div className="absolute inset-0 grid place-items-center">
              <p className="max-w-[16rem] text-center text-xs text-muted-foreground">
                No lookalikes yet. Add a domain and run a scan to map the threat scope.
              </p>
            </div>
          )}
        </div>

        {/* Readout rail */}
        <div className="flex shrink-0 flex-col gap-3 lg:w-[248px]">
          {active ? (
            <div className="rounded-lg border border-ink/[0.08] bg-navy-900/50 p-3.5">
              <p className="font-mono text-[9px] tracking-[0.18em] text-muted-foreground/60 uppercase">
                {activeId ? "Inspecting" : "Most dangerous"}
              </p>
              <p className="mt-1 font-mono text-sm break-all text-ink">{active.domain}</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide uppercase"
                  style={{ backgroundColor: `${SEV_COLOR[active.severity]}1f`, color: SEV_COLOR[active.severity] }}
                >
                  {active.severity}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">risk {active.score}</span>
                {active.offlineAt && <span className="font-mono text-[10px] text-muted-foreground/60">· offline</span>}
              </div>

              <div
                className="mt-3 flex items-start gap-2 rounded-md border-l-2 py-1.5 pr-2 pl-2.5"
                style={{
                  borderColor: STAGE_META[stageOf(active)].color,
                  backgroundColor: `${STAGE_META[stageOf(active)].color}12`,
                }}
              >
                <Crosshair className="mt-0.5 size-3.5 shrink-0" style={{ color: STAGE_META[stageOf(active)].color }} />
                <div>
                  <p className="text-[12px] font-semibold text-ink">{STAGE_META[stageOf(active)].label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {STAGE_META[stageOf(active)].blurb}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Evidence on={active.resolves} icon={Globe}>resolves</Evidence>
                <Evidence on={active.hasMx} icon={Mail} alert>MX</Evidence>
                <Evidence on={active.hasCert} icon={ScanLine}>TLS</Evidence>
                <Evidence on={active.punycode} icon={Type} alert>homoglyph</Evidence>
                <Evidence on icon={Crosshair}>{active.similarity}% match</Evidence>
              </div>

              <Link
                href={`/app/modules/brand/detections/${active.id}`}
                className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-glow transition-colors hover:text-ink"
              >
                Open detection
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-ink/12 bg-navy-900/30 p-3.5 text-[11px] leading-relaxed text-muted-foreground/70">
              Hover a blip to inspect a lookalike.
            </div>
          )}

          {/* Kill-chain legend */}
          <div className="rounded-lg border border-ink/[0.08] bg-navy-900/40 p-3.5">
            <p className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] text-muted-foreground/60 uppercase">
              <ShieldAlert className="size-3" />
              Closer to centre = closer to attacking you
            </p>
            <ul className="mt-2.5 grid gap-1.5">
              {([3, 2, 1, 0] as Stage[]).map((s) => (
                <li key={s} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: STAGE_META[s].color }} />
                  <span className="text-foreground/85">{STAGE_META[s].label}</span>
                  {s === 3 && counts.armed > 0 && (
                    <span className="ml-auto font-mono text-[10px] font-semibold text-sev-critical">{counts.armed}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-ink/[0.07] px-4 py-2.5 font-mono text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-sev-critical" /> High</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-signal" /> Medium</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#6b7ba3]" /> Low</span>
        <span className="text-muted-foreground/50">· size = risk · hollow = offline</span>
      </div>
    </figure>
  )
}

function Evidence({
  on,
  icon: Icon,
  alert,
  children,
}: {
  on: boolean
  icon: typeof Globe
  alert?: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px]",
        !on
          ? "border-ink/[0.08] bg-ink/[0.02] text-muted-foreground/45 line-through"
          : alert
            ? "border-sev-critical/25 bg-sev-critical/[0.08] text-sev-critical"
            : "border-ink/12 bg-ink/[0.04] text-foreground/80"
      )}
    >
      <Icon className="size-3" />
      {children}
    </span>
  )
}
