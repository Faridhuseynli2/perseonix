import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { ConsolePreview } from "@/components/marketing/console-preview"
import { SectionHeading } from "@/components/marketing/section-heading"
import type { Dict } from "@/lib/i18n/dictionaries"

export function PlatformSection({ t }: { t: Dict["platform"] }) {
  return (
    <section id="platform" className="relative border-t border-white/[0.06] py-24">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 warm-grid fade-mask-top opacity-40" />
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div data-reveal>
          <SectionHeading eyebrow={t.eyebrow} title={t.title} description={t.description} />

          <ul className="mt-8 grid gap-3">
            {t.capabilities.map((cap) => (
              <li
                key={cap}
                className="group flex items-center gap-3 rounded-lg border border-ember/25 bg-ember-deep/15 px-4 py-3.5 transition-colors hover:border-ember/45 hover:bg-ember-deep/25"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ember text-white">
                  <ChevronRight className="size-4" />
                </span>
                <span className="text-sm font-medium text-warm-100">{cap}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/login"
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-md bg-ember px-6 text-sm font-semibold text-white shadow-ember transition-colors hover:bg-ember-bright"
          >
            {t.cta}
            <ChevronRight className="size-4" />
          </Link>
        </div>

        <div data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
          <ConsolePreview />
        </div>
      </div>
    </section>
  )
}
