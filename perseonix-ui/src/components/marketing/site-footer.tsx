import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { TlpBadge } from "@/components/intel/tlp-badge"
import { footerNav } from "@/content/site"
import type { Dict } from "@/lib/i18n/dictionaries"

export function SiteFooter({ t }: { t: Dict["footer"] }) {
  return (
    <footer className="border-t border-white/[0.06] bg-coal-950">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Link href="/" aria-label="Perseonix home">
              <Logo tone="ember" />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-warm-300">
              {t.tagline}
            </p>
            <p className="mt-6 flex items-center gap-2.5 text-xs text-warm-500">
              <TlpBadge level="CLEAR" />
              {t.note}
            </p>
          </div>

          {footerNav.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="font-mono text-[10px] tracking-[0.24em] text-warm-500 uppercase">
                {column.title}
              </p>
              <ul className="mt-5 grid gap-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-warm-300 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/[0.06] pt-8 text-xs text-warm-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{t.copyright}</p>
          <p className="font-mono">Perseonix Threat Research Unit · PTRU</p>
        </div>
      </div>
    </footer>
  )
}
