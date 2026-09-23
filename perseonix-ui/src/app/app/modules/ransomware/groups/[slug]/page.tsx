import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ArrowUpRight,
  Bug,
  CalendarClock,
  Skull,
  Target,
  VenetianMask,
} from "lucide-react"
import { EmptyData, VictimList } from "@/components/ransomware/pieces"
import { RansomwareWatchButton } from "@/components/ransomware/watch-button"
import { requireModule } from "@/lib/auth/dal"
import { getGroup, groupVictims } from "@/lib/ransomware/data"
import { countryName, RANSOMWARE_MODULE_KEY, sectorLabel } from "@/lib/ransomware/meta"
import { watchExists } from "@/lib/ransomware/watch"

export async function generateMetadata({
  params,
}: PageProps<"/app/modules/ransomware/groups/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const group = await getGroup(slug)
  return { title: group ? `${group.name} · Ransomware Tracker` : "Ransomware group" }
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
const fmt = (iso: string | null) => {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : dateFormat.format(d)
}

// Top values of a field across the group's recent claims.
function topOf(items: { sector: string | null; country: string | null }[], field: "sector" | "country") {
  const counts = new Map<string, number>()
  for (const v of items) {
    const key = v[field]
    if (!key) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
}

export default async function RansomwareGroupPage({
  params,
}: PageProps<"/app/modules/ransomware/groups/[slug]">) {
  const { user } = await requireModule(RANSOMWARE_MODULE_KEY)
  const { slug } = await params
  const group = await getGroup(slug)
  if (!group) notFound()

  const victims = await groupVictims(slug, 60)
  const topSectors = topOf(victims, "sector")
  const topCountries = topOf(victims, "country")
  const watching = await watchExists(user.id, { group: slug })

  return (
    <div className="mx-auto max-w-[1400px]">
      <Link
        href="/app/modules/ransomware/groups"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        All groups
      </Link>

      <section className="hud-corners relative mt-4 overflow-hidden rounded-2xl border border-ink/[0.08] bg-navy-900/70">
        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-sev-critical" />
        <div aria-hidden className="hud-grid fade-mask-top pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative p-6 lg:p-7">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex min-w-0 items-start gap-4">
              <span
                aria-hidden
                className="grid size-16 shrink-0 place-items-center rounded-xl bg-sev-critical/10 text-sev-critical ring-1 ring-sev-critical/25"
              >
                <Skull className="size-8" />
              </span>
              <div className="min-w-0">
                <p className="eyebrow text-[10px] text-muted-foreground/70">Ransomware operation</p>
                <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                  {group.name}
                </h1>
                {group.aliases.length > 0 && (
                  <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                    <span className="text-muted-foreground/50">aka </span>
                    {group.aliases.join(" · ")}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2.5">
              <RansomwareWatchButton
                facets={{ group: slug, groupName: group.name }}
                initialWatching={watching}
                idleLabel="Watch group"
              />
              {group.adversarySlug && (
                <Link
                  href={`/app/modules/adversaries/${group.adversarySlug}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-brand/30 bg-brand/10 px-3 text-xs text-glow transition-colors hover:bg-brand/15"
                >
                  <VenetianMask className="size-3.5" />
                  Adversary dossier
                  <ArrowUpRight className="size-3" />
                </Link>
              )}
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-ink/[0.08] pt-5 sm:grid-cols-4">
            <Fact icon={Skull} label="Claimed victims" value={String(group.victimCount)} />
            <Fact icon={CalendarClock} label="First seen" value={fmt(group.firstSeen)} />
            <Fact icon={CalendarClock} label="Last activity" value={fmt(group.lastSeen)} />
            <Fact icon={Bug} label="Tools tracked" value={group.tools.length ? String(group.tools.length) : "—"} />
          </dl>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 content-start gap-6">
          {group.description && (
            <Panel title="Overview">
              <p className="text-sm leading-relaxed text-foreground/85">{group.description}</p>
            </Panel>
          )}

          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span aria-hidden className="h-4 w-1 rounded-full bg-sev-critical" />
              Claimed victims
              <span className="font-mono text-xs font-normal text-muted-foreground">{victims.length}</span>
            </h2>
            {victims.length === 0 ? (
              <div className="mt-3">
                <EmptyData canRefresh={user.role === "admin"} />
              </div>
            ) : (
              <VictimList items={victims} className="mt-3" />
            )}
          </section>
        </div>

        <aside className="grid min-w-0 content-start gap-6">
          {topSectors.length > 0 && (
            <Panel title="Targeted sectors" icon={Target}>
              <Breakdown rows={topSectors.map(([k, n]) => [sectorLabel(k), n])} />
            </Panel>
          )}
          {topCountries.length > 0 && (
            <Panel title="Targeted countries" icon={Target}>
              <Breakdown rows={topCountries.map(([k, n]) => [countryName(k), n])} />
            </Panel>
          )}
          {group.tools.length > 0 && (
            <Panel title="Toolset" icon={Bug}>
              <div className="flex flex-wrap gap-1.5">
                {group.tools.map((t) => (
                  <span
                    key={t}
                    className="rounded border border-ink/[0.08] bg-ink/[0.03] px-2 py-0.5 font-mono text-[11px] text-foreground/85"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Panel>
          )}
        </aside>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground/70">
        Victims are unverified claims posted by the group. Source: ransomware.live.
      </p>
    </div>
  )
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Skull
  label: string
  value: string
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 font-mono text-[9px] tracking-wider text-muted-foreground/60 uppercase">
        <Icon aria-hidden className="size-3" />
        {label}
      </dt>
      <dd className="mt-1 truncate text-[13px] text-foreground/90" title={value}>
        {value}
      </dd>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon?: typeof Skull
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-ink/[0.07] bg-navy-800/40 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        {Icon ? <Icon aria-hidden className="size-4 text-sev-critical/80" /> : (
          <span aria-hidden className="h-4 w-1 rounded-full bg-sev-critical" />
        )}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Breakdown({ rows }: { rows: [string, number][] }) {
  const max = Math.max(...rows.map(([, n]) => n), 1)
  return (
    <ul className="grid gap-2">
      {rows.map(([label, n]) => (
        <li key={label} className="grid grid-cols-[minmax(0,1fr)_2.5rem] items-center gap-2">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] text-foreground/85" title={label}>
                {label}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
              <span className="block h-full rounded-full bg-sev-critical/60" style={{ width: `${(n / max) * 100}%` }} />
            </div>
          </div>
          <span className="text-right font-mono text-xs text-muted-foreground tabular-nums">{n}</span>
        </li>
      ))}
    </ul>
  )
}
