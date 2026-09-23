import type { ReactNode } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Bug,
  CalendarClock,
  Crosshair,
  Fingerprint,
  GitBranch,
  Globe,
  Landmark,
  ScrollText,
  Swords,
  Zap,
} from "lucide-react"
import { CategoryBadge, ThreatLevelBadge } from "@/components/adversaries/badges"
import { ActorCampaigns } from "@/components/adversaries/campaigns"
import { MitreReferences, MitreTechniques } from "@/components/adversaries/mitre-attack"
import { Section } from "@/components/adversaries/section"
import { WatchButton } from "@/components/adversaries/watch-button"
import type { AdversaryGroup, Campaign, MitreEnrichment, Region } from "@/lib/adversaries/data"
import { mitreGroupUrl, threatAccent } from "@/lib/adversaries/meta"
import { initials } from "@/lib/format"

// Drop obvious non-tool noise from the free-text dataset ("and many others", etc.).
const NOISE = /(and many others|and others|^others$|^etc\.?$|^unknown$|^n\/?a$|^various$)/i

/** Build clean toolset chips from the (messy) toolset string + malware list. */
function toolChips(group: AdversaryGroup): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of [...group.toolset.split(/[,;]/), ...group.malware]) {
    const t = raw.trim().replace(/\s+/g, " ")
    if (!t || t.length > 36 || NOISE.test(t)) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

/** Strip markdown link syntax and citation noise that leaks in from MITRE prose. */
function cleanProse(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\((?:https?:)?[^)]*\)/g, "$1")
    .replace(/\s*\(Citation:[^)]*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

function splitList(value: string | null | undefined): string[] {
  if (!value) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of value.split(/[,;]|\s+and\s+/i)) {
    const t = raw.trim()
    if (!t || t.length > 40) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

function Chip({ children, hot = false }: { children: ReactNode; hot?: boolean }) {
  return (
    <span
      className={
        hot
          ? "inline-flex items-center rounded-md border border-brand/30 bg-brand/10 px-2.5 py-1 text-[13px] text-ink"
          : "inline-flex items-center rounded-md border border-ink/[0.09] bg-ink/[0.03] px-2.5 py-1 text-[13px] text-foreground/85"
      }
    >
      {children}
    </span>
  )
}

export function AdversaryProfile({
  group,
  region,
  related,
  mitre,
  campaigns = [],
  watching = false,
}: {
  group: AdversaryGroup
  region?: Region
  related: { name: string; slug?: string }[]
  mitre?: MitreEnrichment
  campaigns?: Campaign[]
  watching?: boolean
}) {
  const accent = threatAccent(region?.threatLevel)
  const overview = cleanProse(group.notes || mitre?.description || "")
  const paragraphs = overview.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  const caseId = `PX-${group.slug.replace(/[^a-z0-9]/gi, "").slice(0, 6).toUpperCase()}`

  const tools = toolChips(group)
  const motivations = splitList(region?.motivation)
  const aliasNames = group.aliases.map((a) => a.name).filter(Boolean)

  // "First seen" isn't in the dataset — derive real reported-activity years from campaigns.
  const years = campaigns.map((c) => c.year)
  const firstYear = years.length ? Math.min(...years) : null
  const lastYear = years.length ? Math.max(...years) : null
  const activity =
    firstYear === null ? null : firstYear === lastYear ? `${firstYear}` : `${firstYear} – ${lastYear}`

  const hasLowerLeft = motivations.length > 0 || Boolean(group.region)
  const hasLowerRight = Boolean(group.modusOperandi?.trim()) || Boolean(group.targets?.trim())

  return (
    <div className="mx-auto max-w-[1400px]">
      <Link
        href="/app/modules/adversaries"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        All threat actors
      </Link>

      {/* ── Hero dossier ─────────────────────────────────────────── */}
      <section className="hud-corners relative mt-4 overflow-hidden rounded-2xl border border-ink/[0.08] bg-navy-900/70">
        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accent }} />
        <div aria-hidden className="hud-grid fade-mask-top pointer-events-none absolute inset-0 opacity-40" />

        <div className="relative grid gap-6 p-6 sm:grid-cols-[auto_minmax(0,1fr)] lg:gap-8 lg:p-8">
          {/* Portrait / monogram */}
          {group.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={group.image}
              alt={`${group.name} portrait`}
              className="h-40 w-40 shrink-0 rounded-2xl object-cover ring-1 ring-ink/[0.12] sm:h-44 sm:w-44 lg:h-52 lg:w-52"
              style={{ boxShadow: `0 0 0 1px ${accent}44, 0 18px 48px -24px ${accent}` }}
            />
          ) : (
            <span
              aria-hidden
              className="grid h-40 w-40 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand/85 to-brand/40 font-semibold text-white/95 ring-1 ring-brand/40 sm:h-44 sm:w-44 lg:h-52 lg:w-52"
              style={{ boxShadow: "0 18px 48px -24px var(--color-brand, #ff4d5e)" }}
            >
              <span className="text-5xl tracking-tight lg:text-6xl">{initials(group.name)}</span>
            </span>
          )}

          {/* Header content */}
          <div className="grid min-w-0 content-start gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="min-w-0">
              <p className="eyebrow flex items-center gap-2 text-[10px] text-muted-foreground/70">
                Threat actor dossier
                <span className="font-mono text-muted-foreground/50">· {caseId}</span>
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl lg:text-5xl">
                {group.name}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <CategoryBadge category={group.category} />
                {region?.threatLevel && <ThreatLevelBadge level={region.threatLevel} />}
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                  <Globe aria-hidden className="size-3" />
                  {group.region}
                </span>
              </div>

              {paragraphs.length > 0 && (
                <div className="mt-5 grid gap-3 text-sm leading-relaxed text-foreground/85">
                  {paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Right rail: actions, aliases, activity */}
            <div className="grid content-start gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <WatchButton slug={group.slug} initialWatching={watching} />
                {group.mitreId && (
                  <a
                    href={mitreGroupUrl(group.mitreId)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-ink/10 bg-ink/[0.03] px-3 text-xs text-foreground/85 transition-colors hover:bg-ink/[0.07] hover:text-ink"
                  >
                    MITRE ATT&amp;CK
                    <ArrowUpRight className="size-3.5" />
                  </a>
                )}
              </div>

              {aliasNames.length > 0 && (
                <div>
                  <p className="eyebrow flex items-center gap-1.5 text-[10px]">
                    <Fingerprint aria-hidden className="size-3" />
                    Aliases
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/85">
                    {aliasNames.join(", ")}
                  </p>
                </div>
              )}

              {activity && (
                <div>
                  <p className="eyebrow flex items-center gap-1.5 text-[10px]">
                    <CalendarClock aria-hidden className="size-3" />
                    Reported activity
                  </p>
                  <p className="mt-1.5 text-sm text-foreground/90">{activity}</p>
                </div>
              )}

              {region?.sponsor && (
                <div>
                  <p className="eyebrow flex items-center gap-1.5 text-[10px]">
                    <Landmark aria-hidden className="size-3" />
                    Sponsor
                  </p>
                  <p className="mt-1.5 text-sm text-foreground/90">{region.sponsor}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toolset */}
        {tools.length > 0 && (
          <div className="relative border-t border-ink/[0.08] px-6 py-5 lg:px-8">
            <p className="eyebrow flex items-center gap-1.5 text-[10px]">
              <Bug aria-hidden className="size-3" />
              Toolset
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {tools.map((t, i) => (
                <Chip key={`${i}-${t}`}>{t}</Chip>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Motivation / Modus operandi ──────────────────────────── */}
      {(hasLowerLeft || hasLowerRight) && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="grid content-start gap-6">
            {motivations.length > 0 && (
              <Section icon={Zap} label="Motivation">
                <div className="flex flex-wrap gap-2">
                  {motivations.map((m, i) => (
                    <Chip key={`${i}-${m}`} hot>
                      {m}
                    </Chip>
                  ))}
                </div>
              </Section>
            )}

            <Section icon={Globe} label="Origin">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: accent }}
                />
                <div className="min-w-0">
                  <p className="font-medium text-ink">{group.region}</p>
                  {region?.threatLevel && (
                    <p className="font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
                      {region.threatLevel} threat
                    </p>
                  )}
                </div>
              </div>
              {region?.description && (
                <p className="mt-3 border-t border-ink/[0.06] pt-3 text-xs leading-relaxed text-muted-foreground">
                  {region.description}
                </p>
              )}
            </Section>
          </div>

          <div className="grid content-start gap-6">
            {group.modusOperandi?.trim() && (
              <Section icon={Crosshair} label="Modus operandi">
                <p className="text-sm leading-relaxed text-foreground/85">{group.modusOperandi}</p>
              </Section>
            )}
            {group.targets?.trim() && (
              <Section icon={Building2} label="Targets &amp; sectors">
                <p className="text-sm leading-relaxed text-foreground/85">{group.targets}</p>
              </Section>
            )}
          </div>
        </div>
      )}

      {/* ── Intelligence enrichment ──────────────────────────────── */}
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 content-start gap-6">
          {campaigns.length > 0 && <ActorCampaigns campaigns={campaigns} />}
          {mitre && <MitreTechniques mitre={mitre} />}
          {group.operations?.trim() && (
            <Section icon={Swords} label="Known operations">
              <p className="text-sm leading-relaxed text-foreground/85">{group.operations}</p>
            </Section>
          )}
        </div>

        <aside className="grid min-w-0 content-start gap-6">
          {related.length > 0 && (
            <Section icon={GitBranch} label="Known associates" hint={`${related.length}`}>
              <ul className="grid gap-1">
                {related.map((item) =>
                  item.slug ? (
                    <li key={item.name}>
                      <Link
                        href={`/app/modules/adversaries/${item.slug}`}
                        className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-foreground/85 transition-colors hover:bg-ink/[0.04] hover:text-glow"
                      >
                        <span className="inline-flex items-center gap-2 truncate">
                          <GitBranch aria-hidden className="size-3.5 text-muted-foreground group-hover:text-glow" />
                          {item.name}
                        </span>
                        <ArrowUpRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground/0 group-hover:text-glow" />
                      </Link>
                    </li>
                  ) : (
                    <li
                      key={item.name}
                      className="inline-flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground"
                    >
                      <GitBranch aria-hidden className="size-3.5" />
                      {item.name}
                    </li>
                  )
                )}
              </ul>
            </Section>
          )}

          {mitre && <MitreReferences mitre={mitre} />}

          <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground/70">
            <ScrollText aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            Aggregated from public reporting. Data: APT Groups &amp; Operations (CC BY 4.0). Verify against
            primary sources before operational use.
          </p>
        </aside>
      </div>
    </div>
  )
}
