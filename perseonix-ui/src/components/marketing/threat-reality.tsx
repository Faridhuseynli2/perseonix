import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Crosshair, Eye, FileWarning } from "lucide-react"
import type { Dict } from "@/lib/i18n/dictionaries"

const ICONS = [Eye, Crosshair, FileWarning]

// Cinematic "fear" band — the psychological hook. A hooded adversary emerges from
// the dark while the copy makes the visitor feel exposed, then points them to the
// way out (the platform). Sits right after the hero.
export function ThreatReality({ t }: { t: Dict["reality"] }) {
  return (
    <section className="relative isolate overflow-hidden border-y border-white/[0.06] bg-coal-950">
      {/* cinematic backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <Image
          src="/adversaries/assassin-hood.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-right opacity-60 lg:object-[75%_center]"
        />
        <div className="absolute inset-0 bg-ember/10 mix-blend-color" />
        <div className="absolute inset-0 bg-linear-to-r from-coal-950 via-coal-950/90 to-coal-950/30" />
        <div className="absolute inset-x-0 top-0 h-32 bg-linear-to-b from-coal-950 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-coal-950 to-transparent" />
        <div className="warm-grid absolute inset-0 opacity-20" />
        <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-ember/15 to-transparent motion-safe:animate-scan" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-24 lg:py-32">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.24em] text-ember-soft uppercase">
            <span aria-hidden className="size-1.5 rounded-full bg-ember motion-safe:animate-beacon" />
            {t.eyebrow}
          </p>
          <h2 className="mt-5 font-grotesk text-[2rem] leading-[1.05] font-bold tracking-[-0.02em] text-balance text-white sm:text-5xl lg:text-[3.4rem]">
            {t.titleLine1}
            <br />
            <span className="ember-signal">{t.titleHighlight}</span>
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-warm-300">
            {t.lead1}
            <em className="font-semibold text-warm-100 not-italic">{t.leadEm}</em>
            {t.lead2}
          </p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-3">
          {t.cards.map((card, i) => {
            const Icon = ICONS[i] ?? Eye
            return (
              <li
                key={card.title}
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}
                className="coal-card rounded-2xl border border-ember/20 p-6"
              >
                <span className="grid size-11 place-items-center rounded-lg border border-ember/30 bg-ember/10 text-ember-soft">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 font-grotesk text-lg font-bold text-white">{card.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-warm-300">{card.body}</p>
              </li>
            )
          })}
        </ul>

        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4">
          <Link
            href="/login"
            className="inline-flex h-12 items-center gap-2 rounded-md bg-ember px-6 text-[15px] font-semibold text-white shadow-ember-lg transition-colors hover:bg-ember-bright"
          >
            {t.cta}
            <ArrowRight className="size-4.5" />
          </Link>
          <p className="font-mono text-[13px] text-warm-500">{t.note}</p>
        </div>
      </div>
    </section>
  )
}
