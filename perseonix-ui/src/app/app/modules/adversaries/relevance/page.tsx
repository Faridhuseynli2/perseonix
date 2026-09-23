import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, Bug, Crosshair, Radar, Target } from "lucide-react"
import { RankedActorCard } from "@/components/adversaries/ranked-actor-card"
import { RelevanceConsole } from "@/components/adversaries/relevance-console"
import { WatchAllButton } from "@/components/adversaries/watch-all-button"
import { requireModule } from "@/lib/auth/dal"
import { ADVERSARIES_MODULE_KEY } from "@/lib/adversaries/meta"
import { commonTechniques, hasProfile, MOTIVATION_LABEL, scoreActors, type RelevanceProfile } from "@/lib/adversaries/relevance"
import { getProfiles } from "@/lib/adversaries/relevance-store"
import { SECTORS, type SectorKey } from "@/lib/intel/taxonomy"

export const metadata: Metadata = { title: "Your Threat Landscape · Adversary Intelligence" }

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""
const VALID = new Set(SECTORS.map((s) => s.key))

export default async function RelevancePage({
  searchParams,
}: PageProps<"/app/modules/adversaries/relevance">) {
  const { user } = await requireModule(ADVERSARIES_MODULE_KEY)
  const params = await searchParams

  const paramSectors = one(params.sectors)
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is SectorKey => VALID.has(s as SectorKey))
  const paramCountry = one(params.country)
  const hasParams = paramSectors.length > 0 || Boolean(paramCountry)

  const profiles = await getProfiles(user)
  const active: RelevanceProfile = hasParams
    ? { sectors: paramSectors, country: paramCountry || undefined }
    : profiles.effective ?? { sectors: [], country: undefined }

  const result = hasProfile(active) ? scoreActors(active) : null
  const techniques = result ? commonTechniques(result.actors) : []
  const topSlugs = result ? result.actors.slice(0, 10).map((a) => a.slug) : []

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <Link
        href="/app/modules/adversaries"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        All threat actors
      </Link>

      <header>
        <p className="font-mono text-[10px] tracking-[0.22em] text-glow uppercase">
          Adversary Intelligence // Relevance
        </p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink lg:text-3xl">
          Your threat landscape
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Tell us your sectors and where you operate — we rank the threat actors most likely to target you, and why.
        </p>
      </header>

      <RelevanceConsole
        sectors={active.sectors}
        country={active.country ?? ""}
        canOrg={Boolean(user.organizationId)}
        savedSource={profiles.effectiveSource}
      />

      {!result ? (
        <div className="rounded-lg border border-dashed border-ink/12 bg-navy-900/40 px-6 py-16 text-center">
          <Radar className="mx-auto size-7 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium text-ink">Build your profile to see your landscape</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
            Pick one or more sectors above (and optionally your country). We&apos;ll rank the actors that matter to you.
          </p>
        </div>
      ) : result.actors.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink/12 bg-navy-900/40 px-6 py-16 text-center">
          <p className="text-sm font-medium text-ink">No tracked actors match this profile yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Try broadening your sectors or removing the country filter.</p>
        </div>
      ) : (
        <>
          {/* Landscape summary */}
          <div className="grid gap-4 lg:grid-cols-3">
            <SummaryCard icon={Target} title="Threats to you" hint={`${result.total} actors`}>
              <ul className="grid gap-1.5">
                {result.byOrigin.slice(0, 5).map((o) => (
                  <Row key={o.region} label={o.region} value={o.count} max={result.byOrigin[0].count} />
                ))}
              </ul>
            </SummaryCard>
            <SummaryCard icon={Crosshair} title="Why they'd hit you">
              <ul className="grid gap-1.5">
                {result.byMotivation.map((m) => (
                  <Row key={m.motivation} label={MOTIVATION_LABEL[m.motivation]} value={m.count} max={result.byMotivation[0].count} />
                ))}
              </ul>
            </SummaryCard>
            <SummaryCard icon={Bug} title="Malware you'd face" hint={`${result.topMalware.length}`}>
              <div className="flex flex-wrap gap-1.5">
                {result.topMalware.slice(0, 10).map((m) => (
                  <span key={m.name} className="rounded border border-ink/[0.08] bg-ink/[0.03] px-2 py-0.5 font-mono text-[11px] text-foreground/85">
                    {m.name} <span className="text-muted-foreground/60">{m.count}</span>
                  </span>
                ))}
                {result.topMalware.length === 0 && <span className="text-xs text-muted-foreground">No malware on record.</span>}
              </div>
            </SummaryCard>
          </div>

          {/* Ranked actors */}
          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-mono text-[12px] font-semibold tracking-[0.16em] text-ink uppercase">
                <span aria-hidden className="h-4 w-1 rounded-full bg-glow" />
                Actors most likely to target you
                <span className="font-sans text-xs font-normal text-muted-foreground normal-case">
                  showing {result.actors.length} of {result.total}
                </span>
              </h2>
              <WatchAllButton slugs={topSlugs} />
            </div>
            <div className="grid gap-2.5">
              {result.actors.map((actor, i) => (
                <RankedActorCard key={actor.slug} actor={actor} rank={i + 1} />
              ))}
            </div>
          </section>

          {techniques.length > 0 && (
            <SummaryCard icon={Crosshair} title="Techniques you should prepare for" hint="ATT&CK">
              <div className="flex flex-wrap gap-2">
                {techniques.map((t) => (
                  <a
                    key={t.id}
                    href={t.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group inline-flex items-center gap-1.5 rounded-md border border-ink/[0.08] bg-ink/[0.03] px-2.5 py-1 text-[12px] text-foreground/85 transition-colors hover:border-glow/30 hover:text-ink"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground">{t.id}</span>
                    {t.name}
                    <span className="font-mono text-[10px] text-glow/80">×{t.count}</span>
                    <ArrowUpRight className="size-3 text-muted-foreground/0 group-hover:text-glow" />
                  </a>
                ))}
              </div>
            </SummaryCard>
          )}
        </>
      )}

      <p className="border-t border-ink/[0.07] pt-4 text-xs leading-relaxed text-muted-foreground/60">
        Relevance is derived from each actor&apos;s reported target sectors and geography, their recent activity and
        origin threat level. It is decision support, not a guarantee — always corroborate before acting.
      </p>
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof Target
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-ink/[0.09] bg-navy-900/40 p-5">
      <h3 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
        <Icon className="size-4 text-glow" />
        {title}
        {hint && <span className="ml-auto font-sans text-[10px] font-normal tracking-normal text-muted-foreground/60 normal-case">{hint}</span>}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Row({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-2">
      <div className="min-w-0">
        <span className="truncate text-[13px] text-foreground/85">{label}</span>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
          <span className="block h-full rounded-full bg-glow/60" style={{ width: `${(value / Math.max(max, 1)) * 100}%` }} />
        </div>
      </div>
      <span className="text-right font-mono text-xs text-muted-foreground tabular-nums">{value}</span>
    </li>
  )
}
