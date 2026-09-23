import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarClock,
  DollarSign,
  Files,
  Globe2,
  Newspaper,
  Radiation,
  ScrollText,
  ShieldAlert,
  Skull,
  VenetianMask,
} from "lucide-react"
import { requireModule } from "@/lib/auth/dal"
import { getGroup, getVictim } from "@/lib/ransomware/data"
import { countryName, flagEmoji, RANSOMWARE_MODULE_KEY, sectorLabel, timeAgo } from "@/lib/ransomware/meta"

export async function generateMetadata({
  params,
}: PageProps<"/app/modules/ransomware/victims/[id]">): Promise<Metadata> {
  const { id } = await params
  const v = await getVictim(id)
  return { title: v ? `${v.victim} · Ransomware Tracker` : "Victim" }
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
function fmt(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d)
}

function stealerSummary(info: Record<string, unknown> | null): { users: number; employees: number; families: string[] } | null {
  if (!info) return null
  const users = Number(info.users) || 0
  const employees = Number(info.employees) || 0
  const stats = info.infostealer_stats
  const families =
    stats && typeof stats === "object" ? Object.keys(stats as Record<string, unknown>) : []
  if (users === 0 && employees === 0 && families.length === 0) return null
  return { users, employees, families }
}

export default async function VictimDetailPage({
  params,
}: PageProps<"/app/modules/ransomware/victims/[id]">) {
  await requireModule(RANSOMWARE_MODULE_KEY)
  const { id } = await params
  const victim = await getVictim(id)
  if (!victim) notFound()

  const group = await getGroup(victim.groupSlug)
  const stealer = stealerSummary(victim.infostealer)

  const facts: { icon: typeof Skull; label: string; value: React.ReactNode }[] = [
    {
      icon: Skull,
      label: "Claimed by",
      value: (
        <Link href={`/app/modules/ransomware/groups/${victim.groupSlug}`} className="text-sev-critical hover:text-ink">
          {victim.groupName}
        </Link>
      ),
    },
    { icon: Globe2, label: "Country", value: `${flagEmoji(victim.country)} ${countryName(victim.country)}` },
    { icon: Building2, label: "Sector", value: sectorLabel(victim.sector) },
    { icon: CalendarClock, label: "Attack date", value: fmt(victim.attackDate) },
    { icon: CalendarClock, label: "Disclosed", value: fmt(victim.discovered) },
    { icon: DollarSign, label: "Ransom demand", value: victim.ransom || "Not disclosed" },
    { icon: Files, label: "Data at risk", value: victim.dataSize || "Not disclosed" },
  ]

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link
        href="/app/modules/ransomware/victims"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        All victims
      </Link>

      <section className="hud-corners relative mt-4 overflow-hidden rounded-2xl border border-ink/[0.08] bg-navy-900/70">
        <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-sev-critical" />
        <div aria-hidden className="hud-grid fade-mask-top pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative p-6 lg:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-sev-critical/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-sev-critical uppercase ring-1 ring-inset ring-sev-critical/25">
                <ShieldAlert className="size-3.5" />
                Claimed — unverified
              </span>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{victim.victim}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {victim.domain ? <span className="font-mono">{victim.domain}</span> : "Domain not disclosed"}
                <span aria-hidden className="mx-2 text-muted-foreground/30">·</span>
                Disclosed {timeAgo(victim.discovered)}
              </p>
            </div>
            {group?.adversarySlug && (
              <Link
                href={`/app/modules/adversaries/${group.adversarySlug}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-brand/30 bg-brand/10 px-4 text-sm text-glow transition-colors hover:bg-brand/15"
              >
                <VenetianMask className="size-4" />
                Adversary dossier
                <ArrowUpRight className="size-3.5" />
              </Link>
            )}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-ink/[0.08] pt-5 sm:grid-cols-3 lg:grid-cols-4">
            {facts.map((f, i) => (
              <div key={i} className="min-w-0">
                <dt className="flex items-center gap-1.5 font-mono text-[9px] tracking-wider text-muted-foreground/60 uppercase">
                  <f.icon aria-hidden className="size-3" />
                  {f.label}
                </dt>
                <dd className="mt-1 truncate text-[13px] text-foreground/90">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 content-start gap-6">
          <Panel icon={ScrollText} title="The group's claim" hint="as posted by the operator — unverified">
            {victim.description ? (
              <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/85">{victim.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No public description was posted with this claim.</p>
            )}
          </Panel>

          {victim.pressSummary && (
            <Panel icon={Newspaper} title="Press coverage">
              <p className="text-sm leading-relaxed text-foreground/85">{victim.pressSummary}</p>
              {victim.pressSource && (
                <a
                  href={victim.pressSource}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-glow hover:text-ink"
                >
                  Read the report
                  <ArrowUpRight className="size-3.5" />
                </a>
              )}
            </Panel>
          )}
        </div>

        <aside className="grid min-w-0 content-start gap-6">
          {stealer && (
            <Panel icon={Radiation} title="Infostealer exposure">
              <dl className="grid gap-2 text-sm">
                <Row label="Compromised users" value={String(stealer.users)} />
                <Row label="Compromised employees" value={String(stealer.employees)} />
              </dl>
              {stealer.families.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {stealer.families.map((f) => (
                    <span
                      key={f}
                      className="rounded border border-ink/[0.08] bg-ink/[0.03] px-2 py-0.5 font-mono text-[11px] text-foreground/85"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </Panel>
          )}

          <Panel icon={Skull} title="About the group">
            <p className="text-sm leading-relaxed text-foreground/85">
              {group?.description || `${victim.groupName} is a tracked ransomware operation.`}
            </p>
            <Link
              href={`/app/modules/ransomware/groups/${victim.groupSlug}`}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-sev-critical/90 hover:text-sev-critical"
            >
              View all {victim.groupName} victims
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Panel>
        </aside>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground/70">
        This entry reflects a claim published by {victim.groupName} on its leak site and has not been independently
        verified by Perseonix. Source: ransomware.live.
      </p>
    </div>
  )
}

function Panel({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof Skull
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-ink/[0.07] bg-navy-800/40 p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        <Icon aria-hidden className="size-4 text-sev-critical/80" />
        {title}
        {hint && <span className="font-mono text-[10px] font-normal tracking-wide text-muted-foreground/60">· {hint}</span>}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-foreground/90 tabular-nums">{value}</dd>
    </div>
  )
}
