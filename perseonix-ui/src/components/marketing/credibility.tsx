import { BadgeCheck, Radar, UserCheck } from "lucide-react"
import { SectionHeading } from "@/components/marketing/section-heading"
import type { Dict } from "@/lib/i18n/dictionaries"

const ICONS = [UserCheck, Radar, BadgeCheck]

export function Credibility({ t }: { t: Dict["why"] }) {
  return (
    <section className="relative border-t border-white/[0.06] bg-coal-900 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading
          align="center"
          eyebrow={t.eyebrow}
          title={t.title}
          description={t.description}
        />

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {t.pillars.map((p, i) => {
            const Icon = ICONS[i] ?? BadgeCheck
            return (
              <article
                key={p.title}
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}
                className="ember-panel group relative overflow-hidden rounded-2xl border border-ember/20 p-8 text-center transition-colors hover:border-ember/40"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-ember/15 blur-3xl"
                />
                <span className="relative mx-auto grid size-14 place-items-center rounded-2xl border border-ember/30 bg-ember/10 text-ember-soft">
                  <Icon className="size-6" />
                </span>
                <h3 className="relative mt-6 font-grotesk text-xl font-bold text-white">{p.title}</h3>
                <p className="relative mt-3 text-sm leading-relaxed text-warm-300">{p.body}</p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
