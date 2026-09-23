import type { ReactNode } from "react"
import {
  ChevronDown,
  CircleCheck,
  Globe,
  Landmark,
  Lock,
  Network,
  ShieldAlert,
  TriangleAlert,
  Waypoints,
  type LucideIcon,
} from "lucide-react"
import { KIND_LABELS, SEVERITY_MEANING, SOURCES, VERDICTS, formatIsoDate } from "@/lib/investigate/meta"
import type {
  CertificateInfo,
  DnsRecords,
  LiveCheck,
  NetworkInfo,
  Registration,
  Signal,
  SignalSeverity,
  SourceResult,
  TargetKind,
  ThreatFeedResult,
  Verdict,
} from "@/lib/investigate/types"
import { cn } from "@/lib/utils"

export const verdictStyles: Record<Verdict, string> = {
  malicious: "bg-sev-critical/10 text-sev-critical ring-sev-critical/30",
  suspicious: "bg-sev-high/10 text-sev-high ring-sev-high/30",
  no_known_threats: "bg-ok/10 text-ok ring-ok/30",
  inconclusive: "bg-ink/[0.05] text-muted-foreground ring-ink/15",
}

export function VerdictBadge({ verdict, large = false }: { verdict: Verdict; large?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md font-medium whitespace-nowrap ring-1 ring-inset",
        large ? "h-8 px-3 text-sm" : "h-6 px-2 text-xs",
        verdictStyles[verdict]
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {VERDICTS[verdict].label}
    </span>
  )
}

export function KindBadge({ kind }: { kind: TargetKind }) {
  return (
    <span className="inline-flex h-5 items-center rounded bg-ink/[0.06] px-1.5 font-mono text-[10px] tracking-wider whitespace-nowrap text-muted-foreground uppercase">
      {KIND_LABELS[kind]}
    </span>
  )
}

const severityStyles: Record<SignalSeverity, string> = {
  critical: "bg-sev-critical/10 text-sev-critical ring-sev-critical/25",
  high: "bg-sev-high/10 text-sev-high ring-sev-high/25",
  medium: "bg-sev-medium/10 text-sev-medium ring-sev-medium/25",
  low: "bg-sev-low/10 text-sev-low ring-sev-low/25",
  info: "bg-ink/[0.04] text-muted-foreground ring-ink/10",
}

export function SeverityTag({ severity }: { severity: SignalSeverity }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 w-[4.25rem] shrink-0 items-center justify-center rounded font-mono text-[10px] font-medium tracking-wider uppercase ring-1 ring-inset",
        severityStyles[severity]
      )}
    >
      {severity}
    </span>
  )
}

function SignalText({ signal }: { signal: Signal }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-sm text-ink">{signal.title}</p>
      {signal.detail && <p className="mt-0.5 text-xs break-words text-muted-foreground">{signal.detail}</p>}
    </div>
  )
}

/** Ranked findings; each opens to explain why it matters and where it came from. */
export function SignalList({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) {
    return <p className="text-sm text-muted-foreground">No findings.</p>
  }
  return (
    <ul className="divide-y divide-ink/[0.05]">
      {signals.map((signal, index) => (
        <li key={`${signal.title}-${index}`} className="py-3 first:pt-0 last:pb-0">
          {signal.why || signal.source ? (
            <details className="group">
              <summary className="flex cursor-pointer list-none gap-3 rounded-md outline-offset-4 [&::-webkit-details-marker]:hidden">
                <SeverityTag severity={signal.severity} />
                <SignalText signal={signal} />
                <ChevronDown
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="mt-2 ml-20 grid gap-1.5 border-l border-ink/10 pl-3 text-xs leading-relaxed">
                {signal.why && <p className="text-foreground/80">{signal.why}</p>}
                <p className="font-mono text-[10.5px] text-muted-foreground/80">
                  {[SEVERITY_MEANING[signal.severity], signal.source && SOURCES[signal.source].provider]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </details>
          ) : (
            <div className="flex gap-3">
              <SeverityTag severity={signal.severity} />
              <SignalText signal={signal} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Card for one source; renders its data, or why there isn't any. */
export function SourcePanel<T>({
  title,
  icon: Icon,
  provider,
  description,
  result,
  emptyText = "No data found.",
  className,
  children,
}: {
  title: string
  icon: LucideIcon
  provider: string
  /** One line on what the source covers. */
  description?: string
  result: SourceResult<T>
  emptyText?: string
  className?: string
  children: (data: T) => ReactNode
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl border border-ink/[0.07] bg-navy-800/60",
        className
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-ink/[0.06] px-5 py-3.5">
        <h2 className="flex items-center gap-2.5 text-sm font-semibold text-ink">
          <span className="grid size-7 place-items-center rounded-md bg-brand/10 ring-1 ring-brand/20">
            <Icon className="size-3.5 text-glow" />
          </span>
          {title}
        </h2>
        <span className="font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
          {provider}
        </span>
      </header>
      {description && (
        <p className="border-b border-ink/[0.04] bg-ink/[0.015] px-5 py-2 text-xs text-muted-foreground">{description}</p>
      )}
      <div className="flex-1 p-5 text-sm">
        {result.status === "ok" && result.data !== undefined ? (
          children(result.data)
        ) : result.status === "error" ? (
          <p className="flex items-start gap-2 text-alert">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {result.error ?? "This source failed."}
          </p>
        ) : (
          <p className="text-muted-foreground">
            {result.status === "skipped" ? (result.error ?? "Not applicable.") : emptyText}
          </p>
        )}
      </div>
    </section>
  )
}

export function Facts({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-2.5">
      {items.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[8.5rem_minmax(0,1fr)] gap-3">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words text-foreground/90">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Chips({ values, mono = false, max = 30 }: { values: string[]; mono?: boolean; max?: number }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {values.slice(0, max).map((value, index) => (
        <span
          key={`${index}-${value}`}
          className={cn(
            "rounded border border-ink/[0.08] bg-ink/[0.03] px-1.5 py-0.5 text-xs break-all text-foreground/85",
            mono && "font-mono text-[11px]"
          )}
        >
          {value}
        </span>
      ))}
      {values.length > max && (
        <span className="px-1 text-xs text-muted-foreground">+{values.length - max} more</span>
      )}
    </span>
  )
}

function ageLabel(iso?: string) {
  if (!iso) return ""
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)
  if (days < 0) return ""
  if (days < 60) return `${days} days ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${(days / 365).toFixed(1)} years ago`
}

export function RegistrationPanel({ result }: { result: SourceResult<Registration> }) {
  return (
    <SourcePanel title="Registration" icon={Landmark} provider="RDAP" description={SOURCES.registration.description} result={result} emptyText="No registration record was found.">
      {(r) => (
        <Facts
          items={[
            ["Domain", <span key="d" className="font-mono text-[12.5px]">{r.domain}</span>],
            ["Registrar", r.registrar ? `${r.registrar}${r.registrarIanaId ? ` · IANA ${r.registrarIanaId}` : ""}` : "—"],
            ["Registered", r.createdAt ? `${formatIsoDate(r.createdAt)} · ${ageLabel(r.createdAt)}` : "—"],
            ["Expires", formatIsoDate(r.expiresAt)],
            ["Last changed", formatIsoDate(r.updatedAt)],
            ["DNSSEC", r.dnssec === undefined ? "—" : r.dnssec ? "Signed" : "Not signed"],
            ["Status", r.status.length ? <Chips key="s" values={r.status} /> : "—"],
            ["Nameservers", r.nameservers.length ? <Chips key="n" values={r.nameservers} mono /> : "—"],
          ]}
        />
      )}
    </SourcePanel>
  )
}

export function NetworkPanel({ result }: { result: SourceResult<NetworkInfo[]> }) {
  return (
    <SourcePanel title="Network & hosting" icon={Network} provider="Team Cymru · RDAP" description={SOURCES.network.description} result={result}>
      {(hosts) => (
        <div className="grid gap-5">
          {hosts.map((host) => (
            <div key={host.ip} className="grid gap-2.5">
              <p className="font-mono text-[13px] font-medium text-ink">{host.ip}</p>
              <Facts
                items={[
                  ["ASN", host.asn ? `AS${host.asn}${host.asName ? ` · ${host.asName}` : ""}` : "—"],
                  ["Prefix", host.prefix ?? host.networkRange ?? "—"],
                  ["Country", host.country ?? "—"],
                  ["Network", [host.networkName, host.owner].filter(Boolean).join(" · ") || "—"],
                  ["Registry", host.registry ?? "—"],
                  ["Reverse DNS", host.reverseDns.length ? <Chips key="r" values={host.reverseDns} mono /> : "—"],
                  ["Abuse contact", host.abuseEmail ?? "—"],
                ]}
              />
            </div>
          ))}
        </div>
      )}
    </SourcePanel>
  )
}

export function DnsPanel({ result }: { result: SourceResult<DnsRecords> }) {
  return (
    <SourcePanel title="DNS records" icon={Globe} provider="Public resolvers" description={SOURCES.dns.description} result={result}>
      {(dns) => {
        if (dns.nxdomain) return <p className="text-muted-foreground">The domain does not exist in DNS (NXDOMAIN).</p>
        const rows: [string, string[]][] = [
          ["A", dns.a],
          ["AAAA", dns.aaaa],
          ["CNAME", dns.cname],
          ["MX", dns.mx.map((mx) => `${mx.priority} ${mx.exchange}`)],
          ["NS", dns.ns],
          ["TXT", dns.txt],
          ["CAA", dns.caa],
          ["DMARC", dns.dmarc ? [dns.dmarc] : []],
          ["SOA", dns.soa ? [`${dns.soa.nsname} · ${dns.soa.hostmaster} · ${dns.soa.serial}`] : []],
        ]
        const present = rows.filter(([, values]) => values.length > 0)
        if (present.length === 0) return <p className="text-muted-foreground">No records returned.</p>
        return (
          <dl className="grid gap-3">
            {present.map(([type, values]) => (
              <div key={type} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3">
                <dt className="font-mono text-[11px] tracking-wider text-glow uppercase">{type}</dt>
                <dd className="grid min-w-0 gap-1 font-mono text-[12px] break-all text-foreground/90">
                  {/* Records can repeat (e.g. CAA), so keys include the position. */}
                  {values.slice(0, 8).map((value, index) => (
                    <span key={`${index}-${value}`}>{value}</span>
                  ))}
                  {values.length > 8 && <span className="text-muted-foreground">+{values.length - 8} more</span>}
                </dd>
              </div>
            ))}
          </dl>
        )
      }}
    </SourcePanel>
  )
}

export function LivePanel({ result }: { result: SourceResult<LiveCheck> }) {
  return (
    <SourcePanel title="Live check" icon={Waypoints} provider="Perseonix probe" description={SOURCES.live.description} result={result}>
      {(live) => (
        <div className="grid gap-5">
          <Facts
            items={[
              ["HTTP status", <span key="s" className="font-mono">{live.status}</span>],
              ["Final URL", <span key="u" className="font-mono text-[12px] break-all">{live.finalUrl}</span>],
              ["Page title", live.title ?? "—"],
              ["Server", live.server ?? "—"],
              ["Content type", live.contentType ?? "—"],
              ["Served from", live.ip ? <span key="i" className="font-mono">{live.ip}</span> : "—"],
            ]}
          />

          {live.redirects.length > 0 && (
            <div>
              <p className="eyebrow text-[10px]">Redirect chain</p>
              <ol className="mt-2 grid gap-1.5">
                {live.redirects.map((hop, index) => (
                  <li key={`${hop.url}-${index}`} className="flex gap-2 font-mono text-[12px] break-all text-foreground/85">
                    <span className="shrink-0 text-muted-foreground">{hop.status} →</span>
                    {hop.url}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {live.tls && (
            <div>
              <p className="eyebrow flex items-center gap-2 text-[10px]">
                <Lock aria-hidden className="size-3" />
                TLS certificate
              </p>
              <div className="mt-2">
                <Facts
                  items={[
                    [
                      "Trust",
                      live.tls.trusted ? (
                        <span key="t" className="inline-flex items-center gap-1.5 text-ok"><CircleCheck className="size-3.5" /> Trusted</span>
                      ) : (
                        <span key="t" className="inline-flex items-center gap-1.5 text-alert"><ShieldAlert className="size-3.5" /> {live.tls.error ?? "Not trusted"}</span>
                      ),
                    ],
                    ["Issued to", live.tls.subject ?? "—"],
                    ["Issuer", live.tls.issuer ?? "—"],
                    ["Valid", `${formatIsoDate(live.tls.validFrom)} → ${formatIsoDate(live.tls.validTo)}`],
                    ["Protocol", live.tls.protocol ?? "—"],
                  ]}
                />
              </div>
            </div>
          )}

          <div>
            <p className="eyebrow text-[10px]">Security headers</p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {live.securityHeaders.map((header) => (
                <li key={header.name} className="flex items-center gap-2 font-mono text-[11.5px]">
                  <span aria-hidden className={cn("size-1.5 rounded-full", header.present ? "bg-ok" : "bg-ink/20")} />
                  <span className={header.present ? "text-foreground/90" : "text-muted-foreground line-through decoration-ink/20"}>
                    {header.name}
                  </span>
                  <span className="sr-only">{header.present ? "present" : "missing"}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </SourcePanel>
  )
}

export function CertificatesPanel({ result }: { result: SourceResult<CertificateInfo> }) {
  return (
    <SourcePanel title="Certificate transparency" icon={Lock} provider="CT logs" description={SOURCES.certificates.description} result={result} emptyText="No certificates found in public CT logs.">
      {(ct) => (
        <div className="grid gap-5">
          <p className="text-muted-foreground">
            <span className="font-semibold text-ink tabular-nums">{ct.total}</span> certificates found via {ct.source}
            {ct.subdomains.length > 0 && (
              <>
                {" "}· <span className="font-semibold text-ink tabular-nums">{ct.subdomains.length}</span> hostnames
              </>
            )}
          </p>
          {ct.certificates.length > 0 && (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[12.5px]">
                <thead>
                  <tr className="border-y border-ink/[0.06] font-mono text-[10px] tracking-[0.14em] text-muted-foreground/70 uppercase">
                    <th scope="col" className="px-5 py-2 font-medium">Common name</th>
                    <th scope="col" className="px-5 py-2 font-medium">Issuer</th>
                    <th scope="col" className="px-5 py-2 font-medium">Valid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/[0.05]">
                  {ct.certificates.map((cert, index) => (
                    <tr key={`${cert.commonName}-${cert.notBefore}-${index}`}>
                      <td className="px-5 py-2 font-mono break-all text-foreground/90">{cert.commonName}</td>
                      <td className="px-5 py-2 text-foreground/80">{cert.issuer}</td>
                      <td className="px-5 py-2 font-mono whitespace-nowrap text-muted-foreground">
                        {formatIsoDate(cert.notBefore)} → {formatIsoDate(cert.notAfter)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {ct.subdomains.length > 0 && (
            <div>
              <p className="eyebrow text-[10px]">Hostnames seen in certificates</p>
              <div className="mt-2">
                <Chips values={ct.subdomains} mono max={40} />
              </div>
            </div>
          )}
        </div>
      )}
    </SourcePanel>
  )
}

export function ThreatFeedPanel({ result }: { result: SourceResult<ThreatFeedResult> }) {
  return (
    <SourcePanel title="Malware URL feed" icon={ShieldAlert} provider="abuse.ch URLhaus" description={SOURCES.threatFeed.description} result={result}>
      {(feed) =>
        !feed.listed ? (
          <p className="flex items-center gap-2 text-ok">
            <CircleCheck aria-hidden className="size-4" />
            Not listed on URLhaus.
          </p>
        ) : (
          <div className="grid gap-3">
            <p className={feed.active ? "text-alert" : "text-foreground/90"}>
              {feed.urlCount} listed URL{feed.urlCount === 1 ? "" : "s"}
              {feed.active ? " — at least one is still online." : " — none currently online."}
            </p>
            <ul className="grid gap-2">
              {feed.hits.map((hit, index) => (
                <li key={`${hit.url}-${index}`} className="rounded-lg border border-ink/[0.07] bg-navy-900/40 p-3">
                  <p className="font-mono text-[12px] break-all text-ink">{hit.url}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {hit.status} · {hit.threat}
                    {hit.dateAdded && ` · added ${formatIsoDate(hit.dateAdded.replace(" ", "T").replace(" UTC", "Z"))}`}
                    {hit.tags.length > 0 && ` · ${hit.tags.join(", ")}`}
                  </p>
                </li>
              ))}
            </ul>
            {feed.reference && (
              <a
                href={feed.reference}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs font-medium text-glow hover:text-ink"
              >
                View on URLhaus
              </a>
            )}
          </div>
        )
      }
    </SourcePanel>
  )
}
