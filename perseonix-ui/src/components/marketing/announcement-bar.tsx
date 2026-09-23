import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { Dict } from "@/lib/i18n/dictionaries"

// Slim ember ribbon above the navbar — a single, current intel line.
export function AnnouncementBar({ t }: { t: Dict["announcement"] }) {
  return (
    <div className="relative z-50 border-b border-ember/25 bg-ember-deep/25 text-warm-100">
      <Link
        href="/#research"
        className="group mx-auto flex max-w-7xl items-center justify-center gap-3 px-6 py-2 text-center"
      >
        <span className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.22em] text-ember-soft uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-ember motion-safe:animate-beacon" />
          {t.eyebrow}
        </span>
        <span className="text-[13px] text-warm-300">{t.text}</span>
        <ArrowRight className="size-3.5 shrink-0 text-ember-soft transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  )
}
