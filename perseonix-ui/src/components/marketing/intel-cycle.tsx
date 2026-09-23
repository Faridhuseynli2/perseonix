import { ChevronRight, ListFilter, Rss, Share2, Zap } from "lucide-react"
import { SectionHeading } from "@/components/marketing/section-heading"
import type { Dict } from "@/lib/i18n/dictionaries"

const ICONS = [Rss, Share2, ListFilter, Zap]

export function IntelCycle({ t }: { t: Dict["how"] }) {
  return (
    <section className="relative border-t border-white/[0.06] bg-coal-850/40 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />

        <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.05] md:grid-cols-2 lg:grid-cols-4">
          {t.steps.map((step, i) => {
            const Icon = ICONS[i] ?? Rss
            const last = i === t.steps.length - 1
            return (
              <li
                key={step.title}
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}
                className="group relative bg-coal-900 p-7"
              >
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-ember/60 to-transparent"
                />
                {/* flow arrow to the next step (desktop) */}
                {!last && (
                  <span
                    aria-hidden
                    className="absolute top-9 -right-3 z-10 hidden size-6 place-items-center rounded-full border border-white/10 bg-coal-850 text-ember-soft lg:grid"
                  >
                    <ChevronRight className="size-3.5" />
                  </span>
                )}

                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-lg border border-ember/25 bg-ember/10 text-ember-soft">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-mono text-3xl font-bold text-ember/25 transition-colors group-hover:text-ember/60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="mt-5 font-grotesk text-lg font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-warm-300">{step.body}</p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
