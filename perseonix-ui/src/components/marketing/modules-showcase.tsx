import Link from "next/link"
import {
  ArrowUpRight,
  Bell,
  Crosshair,
  Radar,
  ScanSearch,
  ShieldAlert,
  Skull,
} from "lucide-react"
import { SectionHeading } from "@/components/marketing/section-heading"
import type { Dict } from "@/lib/i18n/dictionaries"

// Visual meta for the supporting module tiles; name/tagline come from the dictionary.
const SUPPORTING_META = [
  { icon: Skull, accent: "#ff3b52" },
  { icon: ShieldAlert, accent: "#ff7a2f" },
  { icon: Crosshair, accent: "#ff9a4d" },
  { icon: ScanSearch, accent: "#ff6f81" },
]

// A small radar/orbit motif for the flagship tile — concentric rings with
// orbiting adversary dots. Pure SVG + CSS, decorative.
function ActorOrbit() {
  // Static spin classes only — Tailwind can't see interpolated arbitrary values.
  const dots = [
    { r: 34, a: 20, c: "#ff3b52", spin: "motion-safe:animate-[spin_22s_linear_infinite]" },
    { r: 34, a: 200, c: "#ff7a2f", spin: "motion-safe:animate-[spin_22s_linear_infinite]" },
    { r: 52, a: 110, c: "#ff9a4d", spin: "motion-safe:animate-[spin_30s_linear_infinite]" },
    { r: 52, a: 300, c: "#ff6f81", spin: "motion-safe:animate-[spin_30s_linear_infinite]" },
    { r: 70, a: 60, c: "#ff3b52", spin: "motion-safe:animate-[spin_40s_linear_infinite]" },
  ]
  return (
    <svg viewBox="0 0 180 180" className="h-full w-full" aria-hidden>
      <defs>
        <radialGradient id="ao-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff6f81" />
          <stop offset="100%" stopColor="#e01734" />
        </radialGradient>
      </defs>
      {[34, 52, 70].map((r) => (
        <circle
          key={r}
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke="rgb(255 120 90 / 0.16)"
          strokeDasharray="2 4"
        />
      ))}
      <circle cx="90" cy="90" r="9" fill="url(#ao-core)" />
      <circle cx="90" cy="90" r="9" fill="none" stroke="#ff3b52" strokeWidth="1">
        <animate attributeName="r" values="9;30" dur="2.8s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.7;0" dur="2.8s" repeatCount="indefinite" />
      </circle>
      {dots.map((dot, i) => (
        <g key={i} style={{ transformOrigin: "90px 90px" }} className={dot.spin}>
          <circle
            cx={90 + dot.r * Math.cos((dot.a * Math.PI) / 180)}
            cy={90 + dot.r * Math.sin((dot.a * Math.PI) / 180)}
            r="2.6"
            fill={dot.c}
          />
        </g>
      ))}
    </svg>
  )
}

export function ModulesShowcase({ t }: { t: Dict["modules"] }) {
  return (
    <section id="modules" className="relative border-t border-white/[0.06] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            eyebrow={t.eyebrow}
            title={
              <>
                {t.titleLine1}
                <br />
                {t.titleLine2}
              </>
            }
            description={t.description}
          />
          <Link
            href="/login"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-md border border-white/12 px-5 py-2.5 text-sm font-medium text-warm-100 transition-colors hover:border-white/25 hover:bg-white/[0.05] lg:self-auto"
          >
            {t.seeAll}
            <ArrowUpRight className="size-4" />
          </Link>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3 lg:auto-rows-[minmax(0,1fr)]">
          {/* Flagship — Adversary Intelligence */}
          <article
            data-reveal
            className="coal-card group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] p-8 lg:col-span-2 lg:row-span-2"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -top-10 -right-10 h-72 w-72 opacity-70"
            >
              <ActorOrbit />
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-linear-to-b from-ember via-ember/40 to-transparent"
            />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full border border-ember/30 bg-ember/10 px-3 py-1 font-mono text-[10px] font-semibold tracking-[0.16em] text-ember-soft uppercase">
                <Radar className="size-3.5" />
                {t.flagship}
              </span>
              <h3 className="mt-6 font-grotesk text-2xl font-bold text-white sm:text-3xl">
                {t.flagshipName}
              </h3>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-warm-300">
                {t.flagshipDesc}
              </p>
            </div>
            <ul className="relative mt-8 flex flex-wrap gap-2">
              {t.chips.map((chip) => (
                <li
                  key={chip}
                  className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 font-mono text-[11px] text-warm-300"
                >
                  {chip}
                </li>
              ))}
            </ul>
          </article>

          {/* Supporting modules */}
          {SUPPORTING_META.map((m, i) => {
            const Icon = m.icon
            const item = t.supporting[i]
            return (
              <article
                key={item.name}
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 70}ms` }}
                className="coal-card group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] p-6"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-0 w-1 opacity-80"
                  style={{ background: `linear-gradient(to bottom, ${m.accent}, transparent)` }}
                />
                <span
                  className="grid size-11 place-items-center rounded-lg border border-white/10"
                  style={{ background: `${m.accent}1a`, color: m.accent }}
                >
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 font-grotesk text-lg font-bold text-white">{item.name}</h3>
                <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-warm-300">
                  {item.tagline}
                </p>
              </article>
            )
          })}

          {/* Unified alerts tile */}
          <article
            data-reveal
            className="ember-panel relative flex flex-col justify-between overflow-hidden rounded-2xl border border-ember/20 p-6"
          >
            <span className="grid size-11 place-items-center rounded-lg border border-ember/30 bg-ember/10 text-ember-soft">
              <Bell className="size-5" />
            </span>
            <div className="mt-5">
              <h3 className="font-grotesk text-lg font-bold text-white">{t.alertsName}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-warm-300">{t.alertsBody}</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
