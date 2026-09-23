import { SectionHeading } from "@/components/marketing/section-heading"
import { team } from "@/content/site"
import type { Dict } from "@/lib/i18n/dictionaries"

export function AboutSection({ t }: { t: Dict["about"] }) {
  return (
    <section id="about" className="border-t border-white/[0.06] bg-coal-850/50 py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
        <div>
          <SectionHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />
          <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-white/[0.06] pt-8">
            {team.map((fact) => (
              <div key={fact.label} className="flex flex-col">
                <dt className="mt-2 text-xs leading-snug text-warm-500">{fact.label}</dt>
                <dd className="order-first font-grotesk text-3xl font-bold tracking-tight text-white tabular-nums">
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <ol className="divide-y divide-white/[0.06] self-center border-y border-white/[0.06]">
          {t.principles.map((principle, i) => (
            <li
              key={principle.title}
              data-reveal
              className="grid grid-cols-[3rem_1fr] gap-6 py-8"
            >
              <span className="pt-1 font-mono text-sm font-semibold text-ember-soft">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-grotesk text-lg font-bold text-white">{principle.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-warm-300">{principle.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
