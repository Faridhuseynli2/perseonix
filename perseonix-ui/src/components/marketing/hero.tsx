// Marketing hero — cinematic warm theme with a tracked-adversary centrepiece.
import Link from "next/link"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { AttackMap } from "@/components/marketing/attack-map"
import { CountUp } from "@/components/marketing/count-up"
import { ThreatActorVisual } from "@/components/marketing/threat-actor-visual"
import type { Dict } from "@/lib/i18n/dictionaries"

const COUNTERS: { to: number; decimals?: number; suffix?: string }[] = [
  { to: 3.8, decimals: 1, suffix: "B+" },
  { to: 240, suffix: "+" },
  { to: 1600, suffix: "+" },
  { to: 146, suffix: "" },
]

export function Hero({ t }: { t: Dict["hero"] }) {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Cinematic backdrop — live global attack map */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="warm-grid fade-mask-top absolute inset-0" />
        <AttackMap className="absolute top-[-6%] right-0 h-[135%] w-[88%] opacity-70" />
        <div className="absolute top-[-16rem] left-[8%] h-[34rem] w-[52rem] rounded-full bg-ember/14 blur-[150px]" />
        <div className="absolute top-[6rem] right-[-8rem] h-[30rem] w-[30rem] rounded-full bg-flare/10 blur-[140px]" />
        <div className="absolute inset-x-0 bottom-0 h-72 bg-linear-to-b from-transparent to-coal-900" />
        <div className="absolute inset-y-0 left-0 w-[48%] bg-linear-to-r from-coal-900 via-coal-900/80 to-transparent" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pt-16 pb-16 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        {/* Left — editorial */}
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.24em] text-ember-soft uppercase">
            <span aria-hidden className="size-1.5 rounded-full bg-ember motion-safe:animate-beacon" />
            {t.eyebrow}
          </p>

          <h1 className="mt-5 font-grotesk text-[1.9rem] leading-[1.05] font-bold tracking-[-0.02em] text-balance text-white sm:text-5xl sm:leading-[1.02] lg:text-[3.7rem]">
            {t.titleLine1}
            <br />
            <span className="ember-signal">{t.titleHighlight}</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-warm-300">
            {t.subcopy}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-12 items-center gap-2 rounded-md bg-ember px-6 text-[15px] font-semibold text-white shadow-ember-lg transition-colors hover:bg-ember-bright"
            >
              {t.primary}
              <ArrowRight className="size-4.5" />
            </Link>
            <Link
              href="#platform"
              className="inline-flex h-12 items-center rounded-md border border-white/12 bg-white/[0.03] px-6 text-[15px] font-medium text-warm-100 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
            >
              {t.secondary}
            </Link>
          </div>

          <p className="mt-5 inline-flex items-center gap-2 text-[13px] text-warm-500">
            <ShieldCheck className="size-4 text-ember-soft" />
            {t.trust}
          </p>

          {/* Animated counter rail */}
          <dl className="mt-10 grid max-w-lg grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.05] sm:grid-cols-4">
            {COUNTERS.map((c, i) => (
              <div key={i} className="bg-coal-850 px-4 py-3.5">
                <dd className="font-mono text-xl font-semibold text-white">
                  <CountUp to={c.to} decimals={c.decimals} suffix={c.suffix} />
                </dd>
                <dt className="mt-1 font-mono text-[9px] tracking-[0.12em] text-warm-500 uppercase">
                  {t.counters[i]}
                </dt>
              </div>
            ))}
          </dl>
        </div>

        {/* Right — tracked adversary */}
        <div className="lg:pl-4">
          <ThreatActorVisual t={t} />
        </div>
      </div>
    </section>
  )
}
