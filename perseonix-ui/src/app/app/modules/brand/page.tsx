import type { Metadata } from "next"
import Link from "next/link"
import { ArrowUpRight, FolderKanban } from "lucide-react"
import { AssetsPanel } from "@/components/brand/assets-panel"
import { AutoRunner } from "@/components/brand/auto-runner"
import { DetectionsPanel } from "@/components/brand/detections-panel"
import { ThreatScope } from "@/components/brand/threat-scope"
import { ThreatSurface } from "@/components/brand/threat-surface"
import { requireModule } from "@/lib/auth/dal"
import { caseStats } from "@/lib/brand/cases"
import { BRAND_MODULE_KEY } from "@/lib/brand/meta"
import { listAssets, listDetections } from "@/lib/brand/store"

export const metadata: Metadata = { title: "Brand Protection" }

function ago(iso: string | null): string {
  if (!iso) return "not yet scanned"
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return "scanned <1h ago"
  if (h < 24) return `scanned ${h}h ago`
  return `scanned ${Math.floor(h / 24)}d ago`
}

const CADENCE: Record<number, string> = { 6: "4×/day", 12: "2×/day", 24: "daily" }

export default async function BrandProtectionPage() {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  const actor = { id: user.id, organizationId: user.organizationId }

  const [assets, detections, cases] = await Promise.all([
    listAssets(actor),
    listDetections(actor),
    caseStats(actor),
  ])
  const activeCases = cases.open + cases.investigating

  const primary = assets[0]?.domain ?? "your brand"
  const lastScan = assets.map((a) => a.lastScanAt).filter(Boolean).sort().reverse()[0] ?? null
  const autoAsset = assets.find((a) => a.scanIntervalHours)
  const auto = autoAsset?.scanIntervalHours ? CADENCE[autoAsset.scanIntervalHours] ?? "on" : "manual"

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-6">
      {/* Masthead */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-glow uppercase">Perseonix Corvael // Brand Protection</p>
          <h1 className="mt-2 font-display text-[26px] leading-none font-semibold tracking-tight text-ink lg:text-[32px]">
            Brand Protection
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 font-semibold text-glow">
              <span aria-hidden className="size-1.5 rounded-full bg-glow motion-safe:animate-beacon" />
              WATCHING
            </span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            <span>{assets.length} domain{assets.length === 1 ? "" : "s"} protected</span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            <span>{ago(lastScan)}</span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            <span>auto-scan: {auto}</span>
          </div>
        </div>
      </header>

      {/* Signature hero: radar + threat surface */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
        <ThreatScope detections={detections} brand={primary} totalDomains={assets.length} />
        <ThreatSurface detections={detections} />
      </div>

      {/* Incident cases entry */}
      <Link
        href="/app/modules/brand/cases"
        className="group flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/[0.09] bg-navy-900/50 px-5 py-4 transition-colors hover:border-ink/15 hover:bg-navy-900/80"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-ink/10 bg-navy-800 text-glow">
            <FolderKanban className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">Incident cases</p>
            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              High-risk lookalikes open a case automatically — investigate and close them here.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={"font-mono text-lg font-semibold tabular-nums " + (cases.high ? "text-sev-critical" : "text-ink")}>
              {activeCases}
            </p>
            <p className="font-mono text-[10px] tracking-wide text-muted-foreground/70 uppercase">
              active{cases.high ? ` · ${cases.high} high` : ""}
            </p>
          </div>
          <ArrowUpRight className="size-4 text-muted-foreground transition-colors group-hover:text-glow" />
        </div>
      </Link>

      <AssetsPanel assets={assets} />

      <DetectionsPanel detections={detections} />

      <p className="border-t border-ink/[0.07] pt-4 font-mono text-[10.5px] leading-relaxed text-muted-foreground/60">
        Sourced from public Certificate Transparency logs and live DNS. A match is impersonation risk, not proof of
        abuse — triage each one. Perseonix never links out to a suspected phishing site.
      </p>

      <AutoRunner />
    </div>
  )
}
