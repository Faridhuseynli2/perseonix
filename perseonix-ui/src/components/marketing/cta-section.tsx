import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { Dict } from "@/lib/i18n/dictionaries"

export function CtaSection({ t }: { t: Dict["cta"] }) {
  return (
    <section className="relative isolate overflow-hidden border-t border-white/[0.06] bg-coal-950 py-28 lg:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {/* faint adversary presence on both flanks */}
        <Image
          src="/adversaries/warlord-amber.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center opacity-20 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_50%,transparent_20%,#000_85%)]"
        />
        <div className="radar-rings fade-mask-radial absolute top-1/2 left-1/2 size-[56rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40" />
        <div className="absolute top-1/2 left-1/2 h-[26rem] w-[48rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember/18 blur-[120px]" />
        <div className="absolute inset-0 bg-coal-950/40" />
      </div>

      <div className="mx-auto max-w-4xl px-6 text-center">
        <p className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.24em] text-ember-soft uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-ember motion-safe:animate-beacon" />
          {t.eyebrow}
        </p>
        <h2 className="mt-5 font-grotesk text-4xl leading-[1.06] font-bold tracking-[-0.02em] text-balance text-white sm:text-5xl lg:text-6xl">
          {t.title} <span className="ember-signal">{t.highlight}</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-warm-300">
          {t.subcopy}
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
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
      </div>
    </section>
  )
}
