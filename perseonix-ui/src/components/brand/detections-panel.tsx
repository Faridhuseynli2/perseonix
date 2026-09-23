"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowUpRight, Camera, FileDown, Globe, Mail, ScanLine, ShieldAlert } from "lucide-react"
import { setDetectionStatusAction } from "@/app/app/modules/brand/actions"
import { DataTable, type Column } from "@/components/console/data-table"
import { Drawer } from "@/components/console/drawer"
import { SeverityBadge, severityHex } from "@/components/console/severity-badge"
import type { DetectionRow } from "@/lib/brand/store"
import { STATUS_LABEL, type DetectionStatus } from "@/lib/brand/meta"
import { cn } from "@/lib/utils"

const FILTERS = ["all", "new", "high", "malicious"] as const
const STATUS_OPTS: DetectionStatus[] = ["new", "malicious", "benign", "monitoring"]

function age(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return "just now"
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export function DetectionsPanel({ detections }: { detections: DetectionRow[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all")
  const [selected, setSelected] = useState<DetectionRow | null>(null)
  const router = useRouter()
  const [, start] = useTransition()

  const shown = useMemo(() => {
    if (filter === "all") return detections
    if (filter === "high") return detections.filter((d) => d.severity === "high")
    return detections.filter((d) => d.status === filter)
  }, [detections, filter])

  function setStatus(id: string, next: string) {
    start(async () => {
      await setDetectionStatusAction(id, next)
      router.refresh()
    })
    setSelected((s) => (s && s.id === id ? { ...s, status: next } : s))
  }

  const columns: Column<DetectionRow>[] = [
    {
      key: "domain",
      header: "Domain",
      cell: (d) => (
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-[13px] font-medium text-ink" title={d.domain}>{d.domain}</span>
          {d.offlineAt && <span className="shrink-0 rounded-sm bg-ink/[0.06] px-1 font-mono text-[8px] tracking-wide text-muted-foreground/70 uppercase">offline</span>}
        </div>
      ),
    },
    {
      key: "risk",
      header: "Risk",
      width: "104px",
      cell: (d) => (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-ink/[0.06]">
            <span className="block h-full rounded-full" style={{ width: `${d.score}%`, backgroundColor: severityHex(d.severity) }} />
          </div>
          <span className="font-mono text-[11px] tabular-nums" style={{ color: severityHex(d.severity) }}>{d.score}</span>
        </div>
      ),
    },
    {
      key: "signals",
      header: "Signals",
      width: "148px",
      cell: (d) => (
        <div className="flex flex-wrap gap-1">
          {([["RES", d.resolves, "text-sev-critical"], ["MX", d.hasMx, "text-sev-critical"], ["TLS", d.hasCert, "text-signal"], ["PUNY", d.punycode, "text-sev-critical"], ["KW", Boolean(d.keyword), "text-signal"]] as [string, boolean, string][]).map(([l, on, tone]) => (
            <span key={l} className={cn("rounded px-1 py-0.5 font-mono text-[9px]", on ? cn("bg-ink/[0.05]", tone) : "text-muted-foreground/20")}>{l}</span>
          ))}
        </div>
      ),
    },
    { key: "age", header: "Age", width: "48px", cell: (d) => <span className="font-mono text-[11px] text-muted-foreground tabular-nums">{age(d.detectedAt)}</span> },
    {
      key: "status",
      header: "Status",
      width: "116px",
      cell: (d) => (
        <div onClick={(e) => e.stopPropagation()}>
          <select
            value={d.status}
            onChange={(e) => setStatus(d.id, e.target.value)}
            className={cn(
              "h-7 w-full appearance-none rounded border bg-navy-950/50 px-1.5 font-mono text-[10px] uppercase outline-none focus-visible:border-glow/60",
              d.status === "malicious" ? "border-sev-critical/40 text-sev-critical" : d.status === "benign" ? "border-ok/40 text-ok" : "border-ink/12 text-muted-foreground"
            )}
          >
            {STATUS_OPTS.map((s) => <option key={s} value={s} className="bg-navy-900 text-ink">{s}</option>)}
          </select>
        </div>
      ),
    },
  ]

  return (
    <section className="overflow-hidden rounded-lg border border-ink/[0.09] bg-navy-900/40">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/[0.07] px-4 py-3">
        <h2 className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.16em] text-ink uppercase">
          <ShieldAlert className="size-4 text-sev-critical" />
          Detected lookalikes
          <span className="font-sans text-xs font-normal tracking-normal text-muted-foreground normal-case">{detections.length}</span>
        </h2>
        <div className="flex items-center gap-1">
          {FILTERS.map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded px-2.5 py-1 font-mono text-[10px] tracking-wide uppercase transition-colors", filter === f ? "bg-ink/[0.08] text-ink" : "text-muted-foreground hover:text-ink")}>
              {f === "malicious" ? "Confirmed" : f}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={shown}
        rowKey={(d) => d.id}
        onRowClick={(d) => setSelected(d)}
        spine={(d) => (d.offlineAt ? "#5b6a8f" : severityHex(d.severity))}
        empty={<p className="px-4 py-12 text-center text-sm text-muted-foreground">{detections.length === 0 ? "No lookalikes detected yet — add a domain and run a scan." : "Nothing matches this filter."}</p>}
      />

      <QuickLook detection={selected} onClose={() => setSelected(null)} onStatus={setStatus} />
    </section>
  )
}

function QuickLook({
  detection: d,
  onClose,
  onStatus,
}: {
  detection: DetectionRow | null
  onClose: () => void
  onStatus: (id: string, next: string) => void
}) {
  const state = d?.offlineAt ? "Offline — taken down" : d?.resolves ? "Active — resolving" : "Registered — not resolving"
  return (
    <Drawer
      open={Boolean(d)}
      onClose={onClose}
      eyebrow="Lookalike detection"
      title={d ? <p className="truncate font-mono text-lg font-semibold text-ink">{d.domain}</p> : null}
      footer={
        d ? (
          <div className="flex items-center gap-2">
            <Link href={`/app/modules/brand/detections/${d.id}`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-ink/12 text-sm text-foreground/85 transition-colors hover:bg-ink/[0.04] hover:text-ink">
              <Camera className="size-4" /> Full report
              <ArrowUpRight className="size-3.5" />
            </Link>
            <a href={`/app/modules/brand/detections/${d.id}/pdf`} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-brand text-sm font-medium text-white transition-colors hover:bg-brand/90">
              <FileDown className="size-4" /> PDF
            </a>
          </div>
        ) : null
      }
    >
      {d && (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={d.severity} score={d.score} />
            <span className="font-mono text-[11px] text-muted-foreground">{state}</span>
          </div>
          <p className="text-sm text-muted-foreground">Impersonating <span className="font-mono text-foreground/85">{d.assetDomain}</span></p>

          <div className="flex flex-wrap gap-1.5">
            {d.resolves && <Chip icon={Globe} tone="alert">resolves (live)</Chip>}
            {d.hasMx && <Chip icon={Mail} tone="alert">MX — email-capable</Chip>}
            {d.hasCert && <Chip icon={ScanLine} tone="warn">TLS certificate</Chip>}
            {d.punycode && <Chip tone="alert">punycode</Chip>}
            {d.keyword && <Chip tone="warn">“{d.keyword}”</Chip>}
            <Chip tone="muted">{d.similarity}% match</Chip>
          </div>

          <dl className="grid gap-2 text-sm">
            {([
              ["Resolves", d.resolves ? "Yes — live" : "No"],
              ["IP addresses", d.ips.length ? d.ips.join(", ") : "—"],
              ["Mail (MX)", d.hasMx ? "Present — can send email as you" : "None"],
              ["TLS", d.hasCert ? "Issued (CT logs)" : "Not observed"],
              ["Issuer", d.issuer ?? "—"],
              ["Source", d.source === "both" ? "CT + DNS" : d.source === "certificate" ? "Certificate Transparency" : "Permutation + DNS"],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-3 border-b border-ink/[0.05] pb-2 last:border-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-mono text-[12px] break-words text-foreground/90">{v}</dd>
              </div>
            ))}
          </dl>

          <div>
            <p className="mb-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground/55 uppercase">Triage</p>
            <div className="inline-flex items-center rounded-md border border-ink/10 bg-navy-950/50 p-0.5">
              {STATUS_OPTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onStatus(d.id, s)}
                  className={cn(
                    "rounded px-2.5 py-1.5 font-mono text-[10px] tracking-wide uppercase transition-colors",
                    d.status === s ? (s === "malicious" ? "bg-sev-critical text-white" : s === "benign" ? "bg-ok/80 text-white" : "bg-ink/[0.12] text-ink") : "text-muted-foreground hover:text-ink"
                  )}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  )
}

function Chip({ icon: Icon, tone, children }: { icon?: typeof Globe; tone: "alert" | "warn" | "muted"; children: React.ReactNode }) {
  const cls = tone === "alert" ? "border-sev-critical/25 bg-sev-critical/[0.08] text-sev-critical" : tone === "warn" ? "border-signal/25 bg-signal/[0.08] text-signal" : "border-ink/[0.1] bg-ink/[0.03] text-muted-foreground"
  return <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px]", cls)}>{Icon && <Icon className="size-3" />}{children}</span>
}
