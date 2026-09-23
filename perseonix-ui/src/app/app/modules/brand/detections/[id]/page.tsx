import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Ban, Camera, FileDown, Globe, Mail, Radio, ScanLine, ShieldAlert } from "lucide-react"
import { OpenCaseButton } from "@/components/brand/cases/open-case-button"
import { DetectionTriage } from "@/components/brand/detection-triage"
import { ScreenshotPanel } from "@/components/brand/screenshot-panel"
import { requireModule } from "@/lib/auth/dal"
import { BRAND_MODULE_KEY, SEVERITY_LABEL } from "@/lib/brand/meta"
import { getDetection } from "@/lib/brand/store"
import { cn } from "@/lib/utils"

export async function generateMetadata({ params }: PageProps<"/app/modules/brand/detections/[id]">): Promise<Metadata> {
  const { id } = await params
  return { title: `Lookalike · Brand Protection`, description: id }
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" })
const fmt = (iso: string | null) => {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d)
}

const SEV: Record<string, string> = {
  high: "bg-sev-critical/12 text-sev-critical ring-sev-critical/25",
  medium: "bg-signal/12 text-signal ring-signal/25",
  low: "bg-ink/[0.06] text-muted-foreground ring-ink/15",
}

export default async function DetectionDetailPage({ params }: PageProps<"/app/modules/brand/detections/[id]">) {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  const { id } = await params
  const d = await getDetection({ id: user.id, organizationId: user.organizationId }, id)
  if (!d) notFound()

  const state = d.offlineAt
    ? { label: "Offline — taken down", tone: "text-muted-foreground", dot: "bg-muted-foreground/50", icon: Ban }
    : d.resolves
      ? { label: "Active — resolving", tone: "text-sev-critical", dot: "bg-sev-critical", icon: Radio }
      : { label: "Registered — not resolving", tone: "text-signal", dot: "bg-signal", icon: Radio }

  const sourceLabel =
    d.source === "both" ? "Certificate Transparency + DNS" : d.source === "certificate" ? "Certificate Transparency (crt.sh)" : "Permutation + DNS"

  return (
    <div className="mx-auto max-w-[1200px]">
      <Link href="/app/modules/brand" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink">
        <ArrowLeft className="size-4" />
        Brand Protection
      </Link>

      {/* Header */}
      <section className="mt-4 rounded-lg border border-ink/[0.09] bg-navy-900/50">
        <span aria-hidden className="block h-[3px] rounded-t-lg bg-sev-critical" />
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.2em] text-glow uppercase">Lookalike detection</p>
              <h1 className="mt-2 font-mono text-2xl font-semibold break-all text-ink">{d.domain}</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Impersonating <span className="text-foreground/80">{d.assetDomain}</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[11px] tracking-wide uppercase ring-1 ring-inset", SEV[d.severity])}>
                  {SEVERITY_LABEL[d.severity] ?? d.severity} · risk {d.score}
                </span>
                <span className={cn("inline-flex items-center gap-1.5 font-mono text-[11px]", state.tone)}>
                  <span aria-hidden className={cn("size-1.5 rounded-full", state.dot)} />
                  {state.label}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex items-center gap-2">
                <OpenCaseButton detectionId={d.id} />
                <a
                  href={`/app/modules/brand/detections/${d.id}/pdf`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-md bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand/90"
                >
                  <FileDown className="size-4" />
                  Download PDF
                </a>
              </div>
              <DetectionTriage id={d.id} status={d.status} />
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)]">
        <div className="grid content-start gap-6">
          <Panel icon={ShieldAlert} title="Risk evidence">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {d.resolves && <Chip icon={Globe} tone="alert">resolves (live)</Chip>}
              {d.hasMx && <Chip icon={Mail} tone="alert">MX — email-capable</Chip>}
              {d.hasCert && <Chip icon={ScanLine} tone="warn">TLS certificate</Chip>}
              {d.punycode && <Chip tone="alert">punycode / homoglyph</Chip>}
              {d.keyword && <Chip tone="warn">“{d.keyword}”</Chip>}
              <Chip tone="muted">{d.similarity}% name match</Chip>
            </div>
            <Facts
              rows={[
                ["Resolves (A record)", d.resolves ? "Yes — live" : "No"],
                ["IP addresses", d.ips.length ? d.ips.join(", ") : "—"],
                ["Mail (MX)", d.hasMx ? "Present — can send email as your brand" : "None"],
                ["TLS certificate", d.hasCert ? "Issued (seen in CT logs)" : "Not observed"],
                ["Homoglyph / punycode", d.punycode ? "Yes" : "No"],
                ["Name similarity", `${d.similarity}%`],
              ]}
            />
          </Panel>

          <Panel icon={ScanLine} title="Where this came from">
            <Facts
              rows={[
                ["Discovery source", sourceLabel],
                ["Permutation class", d.kind],
                ["Certificate issuer", d.issuer ?? "—"],
                ["Certificate first seen", fmt(d.firstSeen)],
                ["First detected by us", fmt(d.detectedAt)],
                ...(d.offlineAt ? [["Taken down", fmt(d.offlineAt)] as [string, string]] : []),
              ]}
            />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground/70">
              Sourced from public Certificate Transparency logs and live DNS. A match indicates impersonation risk,
              not confirmed abuse — verify before requesting a takedown.
            </p>
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <Panel icon={Camera} title="Sandbox screenshot">
            <ScreenshotPanel detectionId={d.id} hasShot={Boolean(d.screenshotAt)} capturedAt={d.screenshotAt} />
          </Panel>
        </div>
      </div>

      <p className="mt-6 border-t border-ink/[0.07] pt-4 font-mono text-[10.5px] leading-relaxed text-muted-foreground/60">
        Perseonix never links out to a suspected phishing site. Export the PDF to share this evidence with your CERT,
        registrar or hosting provider for takedown.
      </p>
    </div>
  )
}

function Panel({ icon: Icon, title, children }: { icon: typeof Globe; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-ink/[0.09] bg-navy-900/40 p-5">
      <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.14em] text-ink uppercase">
        <Icon className="size-4 text-sev-critical" />
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-3 border-b border-ink/[0.05] pb-2 last:border-0">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="font-mono text-[12.5px] break-words text-foreground/90">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Chip({ icon: Icon, tone, children }: { icon?: typeof Globe; tone: "alert" | "warn" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "alert"
      ? "border-sev-critical/25 bg-sev-critical/[0.08] text-sev-critical"
      : tone === "warn"
        ? "border-signal/25 bg-signal/[0.08] text-signal"
        : "border-ink/[0.1] bg-ink/[0.03] text-muted-foreground"
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px]", cls)}>
      {Icon && <Icon className="size-3" />}
      {children}
    </span>
  )
}
