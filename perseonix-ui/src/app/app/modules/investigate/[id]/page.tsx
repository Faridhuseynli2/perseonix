import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, FileDown, RefreshCw } from "lucide-react"
import { Panel } from "@/components/admin/ui"
import { CapturePanel } from "@/components/investigate/capture-panel"
import { InvestigationTrace, PivotPanel, VerdictExplanation } from "@/components/investigate/explain"
import { ExposurePanel } from "@/components/investigate/exposure-panel"
import { LocationPanel } from "@/components/investigate/location-map"
import {
  CertificatesPanel,
  DnsPanel,
  KindBadge,
  LivePanel,
  NetworkPanel,
  RegistrationPanel,
  SignalList,
  ThreatFeedPanel,
  VerdictBadge,
} from "@/components/investigate/report"
import { AbusePanel, VirusTotalPanel } from "@/components/investigate/reputation-panels"
import { UrlscanPanel } from "@/components/investigate/urlscan-panel"
import { buttonVariants } from "@/components/ui/button"
import { requireModule } from "@/lib/auth/dal"
import { formatDateTime } from "@/lib/format"
import { INVESTIGATE_MODULE_KEY, VERDICTS } from "@/lib/investigate/meta"
import { getInvestigation } from "@/lib/investigate/store"
import type { SourceResult } from "@/lib/investigate/types"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Investigation report",
}

/** Optional sources get a panel only when they actually ran. */
const ran = <T,>(result?: SourceResult<T>) => (result && result.status !== "skipped" ? result : null)

export default async function InvestigationReportPage({
  params,
}: PageProps<"/app/modules/investigate/[id]">) {
  const { user } = await requireModule(INVESTIGATE_MODULE_KEY)
  const { id } = await params
  const investigation = await getInvestigation(user, id)
  const report = investigation.report
  const findings = report.signals.filter((signal) => signal.severity !== "info")
  const exposure = ran(report.exposure)
  const virustotal = ran(report.virustotal)
  const abuse = ran(report.abuse)
  const geo = ran(report.geo)
  const sandbox = ran(report.sandbox)

  return (
    <div className="mx-auto max-w-[1400px]">
      <Link
        href="/app/modules/investigate"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        All investigations
      </Link>

      <section className="mt-4 rounded-2xl border border-ink/[0.07] bg-navy-800/60 p-6 lg:p-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <KindBadge kind={investigation.kind} />
              <VerdictBadge verdict={investigation.verdict} large />
            </div>
            <h1 className="mt-4 font-mono text-xl font-semibold break-all text-ink sm:text-2xl">
              {investigation.query}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {VERDICTS[investigation.verdict].description}
            </p>
            <p className="mt-4 font-mono text-[11px] text-muted-foreground">
              {formatDateTime(investigation.createdAt)} · {investigation.userName ?? "Unknown user"} ·{" "}
              {(investigation.durationMs / 1000).toFixed(1)}s ·{" "}
              {findings.length} finding{findings.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/app/modules/investigate?q=${encodeURIComponent(investigation.input)}`}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-9 gap-2 rounded-md border-ink/10 bg-ink/[0.03] px-4 hover:bg-ink/[0.07]"
              )}
            >
              <RefreshCw />
              Investigate again
            </Link>
            {/* A plain link: the route answers with a PDF attachment. */}
            <a
              href={`/app/modules/investigate/${investigation.id}/pdf`}
              download
              className={cn(buttonVariants(), "h-9 gap-2 rounded-md px-4")}
            >
              <FileDown />
              Download PDF
            </a>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 content-start gap-6 lg:grid-cols-2">
          <VerdictExplanation report={report} className="lg:col-span-2" />
          {sandbox && <CapturePanel investigationId={investigation.id} result={sandbox} className="lg:col-span-2" />}
          {geo && <LocationPanel result={geo} className="lg:col-span-2" />}
          <InvestigationTrace report={report} className="lg:col-span-2" />

          <h2 className="eyebrow mt-2 text-[11px] lg:col-span-2">Sources</h2>
          {report.urlscan.status === "ok" && <UrlscanPanel investigationId={investigation.id} />}
          {virustotal && <VirusTotalPanel result={virustotal} />}
          {abuse && <AbusePanel result={abuse} />}
          {report.target.kind === "ip" ? (
            <>
              <NetworkPanel result={report.network} />
              <LivePanel result={report.live} />
              {exposure && <ExposurePanel result={exposure} />}
            </>
          ) : (
            <>
              <RegistrationPanel result={report.registration} />
              <NetworkPanel result={report.network} />
              <LivePanel result={report.live} />
              <DnsPanel result={report.dns} />
              {exposure && <ExposurePanel result={exposure} />}
              <div className="lg:col-span-2">
                <CertificatesPanel result={report.certificates} />
              </div>
            </>
          )}
        </div>

        <aside className="grid min-w-0 content-start gap-6">
          <Panel
            title={`Findings · ${report.signals.length}`}
            description="Sorted by severity."
          >
            <SignalList signals={report.signals} />
          </Panel>
          <PivotPanel report={report} />
          {report.threatFeed.status !== "skipped" && <ThreatFeedPanel result={report.threatFeed} />}
          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            Data as of {formatDateTime(investigation.createdAt)}. Page scripts ran only inside the isolated
            capture browser, and the target was not submitted to third-party scanners.
          </p>
        </aside>
      </div>
    </div>
  )
}
