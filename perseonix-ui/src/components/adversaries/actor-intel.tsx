import Link from "next/link"
import { ArrowLeft, ArrowUpRight, Boxes, Crosshair, ExternalLink, Newspaper, Radar } from "lucide-react"
import { WatchButton } from "@/components/adversaries/watch-button"
import type { AdversaryGroup } from "@/lib/adversaries/data"
import type { EntityIntel } from "@/lib/intel/news"

const SEV: Record<string, string> = {
  critical: "text-sev-critical",
  high: "text-sev-high",
  medium: "text-signal",
  low: "text-glow",
  info: "text-muted-foreground",
}
const dfmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" })
const day = (iso: string | null) => (iso ? dfmt.format(new Date(iso)) : "—")
function ago(iso: string | null): string {
  if (!iso) return "—"
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return "just now"
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? "yesterday" : d < 30 ? `${d}d ago` : day(iso)
}
const host = (u: string | null) => {
  if (!u) return ""
  try {
    return new URL(u).hostname.replace(/^www\./, "")
  } catch {
    return u
  }
}
const actorHref = (n: string) => `/app/modules/adversaries/actor/${encodeURIComponent(n)}`

export function ActorIntel({
  name,
  group,
  intel,
  watchSlug,
  watching,
}: {
  name: string
  group: AdversaryGroup | null
  intel: EntityIntel
  watchSlug: string
  watching: boolean
}) {
  const displayName = group?.name ?? name
  const { articles, related } = intel

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-5">
      <Link
        href="/app/modules/intel/news"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Threat News
      </Link>

      {/* header */}
      <header className="rounded-xl border border-ink/[0.09] bg-navy-900/50 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] tracking-[0.22em] text-glow uppercase">
              Adversary Intelligence // Threat Actor
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="font-display text-[28px] leading-none font-semibold tracking-tight text-ink">
                {group?.flag ? `${group.flag} ` : ""}
                {displayName}
              </h1>
              {group ? (
                <span className="rounded border border-glow/30 bg-glow/[0.08] px-2 py-0.5 font-mono text-[10px] tracking-wide text-glow uppercase">
                  {group.category} · curated
                </span>
              ) : (
                <span className="rounded border border-ink/12 bg-ink/[0.04] px-2 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
                  OSINT-tracked
                </span>
              )}
            </div>
          </div>
          <WatchButton slug={watchSlug} name={displayName} initialWatching={watching} />
        </div>

        {group && group.aliasNames.length > 0 && (
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            aka {group.aliasNames.slice(0, 8).join(" · ")}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
          <span><span className="font-semibold text-ink">{articles.length}</span> articles</span>
          <span aria-hidden className="text-muted-foreground/30">/</span>
          <span>first seen {day(intel.firstSeen)}</span>
          <span aria-hidden className="text-muted-foreground/30">/</span>
          <span>last seen {ago(intel.lastSeen)}</span>
          {group && (
            <Link
              href={`/app/modules/adversaries/${group.slug}`}
              className="ml-auto inline-flex items-center gap-1 text-glow transition-colors hover:text-ink"
            >
              Full profile <ExternalLink className="size-3.5" />
            </Link>
          )}
        </div>

        {group && (group.malware.length > 0 || group.mitreId || group.region) && (
          <div className="mt-4 grid gap-3 border-t border-ink/[0.07] pt-4 sm:grid-cols-3 text-[13px]">
            <div>
              <p className="font-mono text-[9px] tracking-wider text-muted-foreground/60 uppercase">Region</p>
              <p className="mt-0.5 text-foreground/85">{group.region || "—"}</p>
            </div>
            <div>
              <p className="font-mono text-[9px] tracking-wider text-muted-foreground/60 uppercase">MITRE</p>
              <p className="mt-0.5 font-mono text-foreground/85">{group.mitreId || "—"}</p>
            </div>
            <div>
              <p className="font-mono text-[9px] tracking-wider text-muted-foreground/60 uppercase">Known malware</p>
              <p className="mt-0.5 truncate text-foreground/85">{group.malware.slice(0, 4).join(", ") || "—"}</p>
            </div>
          </div>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        {/* recent intelligence */}
        <section className="min-w-0">
          <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
            <Newspaper className="size-4 text-glow" /> Recent intelligence
            <span className="font-normal text-muted-foreground/50">{articles.length}</span>
          </h2>

          {articles.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-ink/12 bg-navy-900/30 px-4 py-10 text-center text-sm text-muted-foreground">
              No news intelligence yet for {displayName}. It will appear here as the Threat News feed ingests mentions.
            </p>
          ) : (
            <ul className="mt-3 grid gap-2.5">
              {articles.map((a) => (
                <li key={a.id} className="rounded-lg border border-ink/[0.08] bg-navy-900/40 p-4">
                  <div className="flex items-center gap-2 font-mono text-[10px] tracking-wide text-muted-foreground/70 uppercase">
                    {a.severity && <span className={SEV[a.severity] ?? ""}>{a.severity}</span>}
                    <span aria-hidden className="text-muted-foreground/30">·</span>
                    <span>{a.source ?? host(a.url)}</span>
                    <span aria-hidden className="text-muted-foreground/30">·</span>
                    <span>{ago(a.publishedAt ?? a.createdAt)}</span>
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="ml-auto inline-flex items-center gap-1 normal-case text-muted-foreground/60 transition-colors hover:text-glow"
                    >
                      source <ArrowUpRight className="size-3" />
                    </a>
                  </div>
                  <Link href={`/app/modules/intel/news?a=${encodeURIComponent(a.id)}`} className="group mt-1.5 block">
                    <h3 className="text-[15px] leading-snug font-semibold text-ink transition-colors group-hover:text-glow">
                      {a.title}
                    </h3>
                  </Link>
                  {a.summary && <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground/85">{a.summary}</p>}
                  {(a.cves.length > 0 || a.malware.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {a.cves.slice(0, 4).map((c) => (
                        <Link key={c} href={`/app/modules/intel/cve/${encodeURIComponent(c)}`} className="rounded border border-glow/25 bg-glow/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-glow hover:bg-glow/[0.12]">
                          {c}
                        </Link>
                      ))}
                      {a.malware.slice(0, 4).map((m) => (
                        <span key={m} className="rounded border border-sev-high/25 bg-sev-high/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-sev-high/90">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* related graph */}
        <aside className="grid content-start gap-5">
          <RelatedList title="Malware used" icon={<Boxes className="size-3.5 text-sev-high" />} items={related.malware} kind="malware" />
          <RelatedList title="Related CVEs" icon={<Radar className="size-3.5 text-glow" />} items={related.cves} kind="cve" />
          <RelatedList title="Co-mentioned actors" icon={<Crosshair className="size-3.5 text-sev-critical" />} items={related.actors} kind="actor" />
          <RelatedList title="ATT&CK techniques" icon={<Crosshair className="size-3.5 text-muted-foreground" />} items={related.ttps} kind="ttp" />
          <RelatedList title="Targeted sectors" icon={<Boxes className="size-3.5 text-muted-foreground" />} items={related.sectors} kind="sector" />
        </aside>
      </div>
    </div>
  )
}

function RelatedList({
  title,
  icon,
  items,
  kind,
}: {
  title: string
  icon: React.ReactNode
  items: { value: string; count: number }[]
  kind: "malware" | "cve" | "actor" | "ttp" | "sector"
}) {
  if (items.length === 0) return null
  const href = (v: string) =>
    kind === "cve" ? `/app/modules/intel/cve/${encodeURIComponent(v)}` : kind === "actor" ? actorHref(v) : null
  return (
    <section>
      <h3 className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/70 uppercase">
        {icon} {title} <span className="text-muted-foreground/40">{items.length}</span>
      </h3>
      <ul className="mt-2 grid gap-0.5">
        {items.map((it) => {
          const h = href(it.value)
          const inner = (
            <span className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-ink/[0.05]">
              <span className="min-w-0 truncate font-mono text-[12px] text-foreground/90">{it.value}</span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground/50 tabular-nums">{it.count}</span>
            </span>
          )
          return <li key={it.value}>{h ? <Link href={h}>{inner}</Link> : inner}</li>
        })}
      </ul>
    </section>
  )
}
