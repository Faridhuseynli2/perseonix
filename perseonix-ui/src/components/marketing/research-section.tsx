import Image from "next/image"
import Link from "next/link"
import { ArrowRight, ArrowUpRight, Lock } from "lucide-react"
import { TlpBadge } from "@/components/intel/tlp-badge"
import { SectionHeading } from "@/components/marketing/section-heading"
import {
  adversaries,
  featuredReport,
  researchItems,
  stats,
  type Adversary,
} from "@/content/site"
import type { Dict } from "@/lib/i18n/dictionaries"
import { cn } from "@/lib/utils"

const activityStyles: Record<Adversary["activity"], { bars: number; color: string }> = {
  High: { bars: 4, color: "bg-ember" },
  Elevated: { bars: 3, color: "bg-flare" },
  Moderate: { bars: 2, color: "bg-flare-soft" },
  Low: { bars: 1, color: "bg-warm-500" },
}

function ActivityMeter({ level }: { level: Adversary["activity"] }) {
  const { bars, color } = activityStyles[level]
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="flex items-end gap-[3px]">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            style={{ height: `${6 + i * 3}px` }}
            className={cn("w-[3px] rounded-[1px]", i < bars ? color : "bg-white/10")}
          />
        ))}
      </span>
      <span className="font-mono text-[10px] tracking-wider text-warm-500 uppercase">
        {level}
      </span>
    </span>
  )
}

export function ResearchSection({ t }: { t: Dict["research"] }) {
  const tracked = stats.find((s) => s.label === "Adversary clusters tracked")?.value

  return (
    <section id="research" className="border-t border-white/[0.06] bg-coal-900 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />
          <Link
            href="/login"
            className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-md border border-white/12 bg-white/[0.03] px-4 text-sm font-medium text-warm-100 transition-colors hover:border-white/25 hover:bg-white/[0.07] lg:self-auto"
          >
            {t.library}
            <ArrowUpRight className="size-4" />
          </Link>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          <article
            data-reveal
            className="group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-coal-850 transition-colors hover:border-ember/40"
          >
            <div className="relative h-56 overflow-hidden border-b border-white/[0.06] bg-linear-to-br from-ember-deep/60 via-coal-800 to-coal-900 sm:h-64">
              <div aria-hidden className="warm-grid absolute inset-0 opacity-80" />
              <div
                aria-hidden
                className="absolute -right-16 -bottom-24 size-72 rounded-full bg-ember/20 blur-3xl"
              />
              <div className="absolute top-5 left-6 flex items-center gap-2">
                <TlpBadge level="CLEAR" />
                <span className="rounded-sm bg-white/10 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-white uppercase">
                  {featuredReport.type}
                </span>
              </div>
              <p
                aria-hidden
                className="absolute right-6 bottom-3 font-grotesk text-7xl leading-none font-bold tracking-tighter text-white/10 sm:text-8xl"
              >
                H2·26
              </p>
              <p className="absolute bottom-5 left-6 font-mono text-[11px] text-warm-300/60">
                PTRU-TLR-2026-02
              </p>
            </div>
            <div className="flex flex-1 flex-col p-7 lg:p-8">
              <time dateTime={featuredReport.date} className="font-mono text-xs text-warm-500">
                {featuredReport.date}
              </time>
              <h3 className="mt-3 font-grotesk text-2xl font-bold tracking-tight text-balance text-white">
                {featuredReport.title}
              </h3>
              <p className="mt-3 leading-relaxed text-warm-300">{featuredReport.summary}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {featuredReport.meta.map((item) => (
                  <li
                    key={item}
                    className="rounded border border-white/[0.08] px-2 py-1 font-mono text-[11px] text-warm-300/80"
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="mt-auto inline-flex items-center gap-1.5 pt-8 text-sm font-medium text-ember-soft hover:text-white"
              >
                {t.readReport}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </article>

          <ul className="flex flex-col divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-coal-850/60">
            {researchItems.map((item) => (
              <li key={item.title} className="flex-1">
                <Link
                  href="/login"
                  className="group flex h-full gap-5 p-6 transition-colors hover:bg-white/[0.025] lg:p-7"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-warm-500">
                      <time dateTime={item.date}>{item.date}</time>
                      <span aria-hidden>·</span>
                      <span className="text-ember-soft">{item.type}</span>
                      <span aria-hidden>·</span>
                      <span>{item.sector}</span>
                    </p>
                    <p className="mt-3 text-[15px] leading-snug font-medium text-pretty text-white">
                      {item.title}
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <TlpBadge level={item.restricted ? "AMBER" : "CLEAR"} />
                      {item.restricted && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-warm-500">
                          <Lock className="size-3" />
                          {t.customersOnly}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-warm-500 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-white" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div id="adversaries" className="mt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.24em] text-ember-soft uppercase">
                <span aria-hidden className="size-1 rounded-full bg-ember" />
                {t.trackingEyebrow}
              </p>
              <h3 className="mt-3 font-grotesk text-2xl font-bold tracking-tight text-white">
                {t.trackingTitle}
              </h3>
            </div>
            <p className="font-mono text-[11px] text-warm-500">
              {tracked} {t.clustersTracked} · {adversaries.length} {t.shown}
            </p>
          </div>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {adversaries.map((actor, i) => (
              <li
                key={actor.id}
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 60}ms` }}
                className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-coal-850/60 transition-colors hover:border-ember/40"
              >
                {/* portrait banner */}
                <div className="relative h-40 overflow-hidden">
                  {actor.portrait && (
                    <Image
                      src={actor.portrait}
                      alt={`Surveillance portrait of tracked actor ${actor.name}`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
                      className="object-cover object-top grayscale transition-all duration-500 group-hover:grayscale-0 group-hover:scale-105"
                    />
                  )}
                  <div aria-hidden className="absolute inset-0 bg-ember/15 mix-blend-color" />
                  <div aria-hidden className="absolute inset-0 bg-linear-to-t from-coal-850 via-coal-850/30 to-transparent" />
                  <div aria-hidden className="warm-grid absolute inset-0 opacity-30" />
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                    <span className="rounded-sm border border-white/10 bg-coal-950/60 px-1.5 py-0.5 font-mono text-[10px] text-ember-soft backdrop-blur-sm">
                      {actor.id}
                    </span>
                    <ActivityMeter level={actor.activity} />
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <p className="font-grotesk text-lg font-bold text-white drop-shadow">{actor.name}</p>
                    <p className="text-xs text-warm-300">{actor.type}</p>
                  </div>
                </div>
                <div className="p-5">
                  <p className="font-mono text-[10px] tracking-[0.2em] text-warm-500 uppercase">
                    {t.targets}
                  </p>
                  <p className="mt-1.5 text-sm text-warm-100/80">{actor.targets}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
