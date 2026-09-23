import { ArrowUpRight, CalendarClock } from "lucide-react"
import { Section } from "@/components/adversaries/section"
import type { Campaign } from "@/lib/adversaries/data"

/** Reported campaigns for one actor, as a year-grouped timeline with source links. */
export function ActorCampaigns({ campaigns }: { campaigns: Campaign[] }) {
  if (campaigns.length === 0) return null
  const years = [...new Set(campaigns.map((c) => c.year))].sort((a, b) => b - a)

  return (
    <Section
      icon={CalendarClock}
      label="Campaigns & activity"
      hint={`${campaigns.length} reports`}
    >
      <div className="relative grid gap-5 pl-4">
        <span aria-hidden className="absolute inset-y-1 left-0 w-px bg-ink/[0.08]" />
        {years.map((year) => (
          <div key={year} className="relative">
            <span
              aria-hidden
              className="absolute top-1 -left-4 size-2 -translate-x-[3px] rounded-full bg-glow ring-4 ring-navy-800/60"
            />
            <p className="font-mono text-xs font-semibold text-glow">{year}</p>
            <ul className="mt-2 grid gap-2">
              {campaigns
                .filter((c) => c.year === year)
                .map((campaign) => (
                  <li key={campaign.id}>
                    <a
                      href={campaign.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="group flex items-start justify-between gap-3 rounded-md border border-ink/[0.06] bg-navy-900/40 px-3 py-2 transition-colors hover:border-glow/30 hover:bg-navy-900/70"
                    >
                      <span className="min-w-0">
                        <span className="block text-[13px] text-foreground/90 group-hover:text-ink">
                          {campaign.title}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
                          {campaign.vendor}
                        </span>
                      </span>
                      <ArrowUpRight
                        aria-hidden
                        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/50 group-hover:text-glow"
                      />
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground/60">
        Links to public reporting from the named vendors. Titles are the reports&apos; own; Perseonix stores
        only the reference, not the article.
      </p>
    </Section>
  )
}
