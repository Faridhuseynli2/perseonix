import type { ReactNode } from "react"
import { ArrowUpRight, Bug, Siren } from "lucide-react"
import { Chips, Facts, SourcePanel } from "@/components/investigate/report"
import { SOURCES, countryName, formatIsoDate } from "@/lib/investigate/meta"
import type { AbuseInfo, SourceResult, VirusTotalInfo } from "@/lib/investigate/types"
import { cn } from "@/lib/utils"

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

function formatIsoDateTime(iso?: string) {
  if (!iso) return "—"
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? "—" : `${dateTimeFormat.format(date)} UTC`
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex w-fit items-center gap-1 text-xs font-medium text-glow hover:text-ink"
    >
      {children}
      <ArrowUpRight aria-hidden className="size-3.5" />
    </a>
  )
}

const detectionSegments = [
  { key: "malicious", label: "Malicious", className: "bg-sev-critical" },
  { key: "suspicious", label: "Suspicious", className: "bg-sev-high" },
  { key: "harmless", label: "Harmless", className: "bg-ok/70" },
  { key: "undetected", label: "Undetected", className: "bg-ink/20" },
] as const

function DetectionBar({ stats }: { stats: VirusTotalInfo["stats"] }) {
  const total = stats.malicious + stats.suspicious + stats.harmless + stats.undetected || 1
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-sm bg-ink/[0.06]" aria-hidden>
        {detectionSegments.map((segment) =>
          stats[segment.key] > 0 ? (
            <div
              key={segment.key}
              className={segment.className}
              style={{ width: `${(stats[segment.key] / total) * 100}%` }}
            />
          ) : null
        )}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {detectionSegments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span aria-hidden className={cn("size-2 rounded-[2px]", segment.className)} />
            {segment.label}
            <span className="ml-auto font-mono text-foreground/90 tabular-nums sm:ml-0">{stats[segment.key]}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function detectionTone(malicious: number) {
  if (malicious >= 5) return "text-sev-critical"
  if (malicious >= 2) return "text-sev-high"
  if (malicious === 1) return "text-sev-medium"
  return "text-ok"
}

export function VirusTotalPanel({ result }: { result: SourceResult<VirusTotalInfo> }) {
  return (
    <SourcePanel
      title={SOURCES.virustotal.label}
      icon={Bug}
      provider="VirusTotal"
      description={SOURCES.virustotal.description}
      result={result}
      emptyText="Not analyzed by VirusTotal."
      className="lg:col-span-2"
    >
      {(vt) => {
        const total = vt.stats.malicious + vt.stats.suspicious + vt.stats.harmless + vt.stats.undetected
        const facts: [string, ReactNode][] = [
          ["Last analysis", formatIsoDateTime(vt.lastAnalysisAt)],
          ["First seen", formatIsoDate(vt.firstSeenAt)],
          [
            "Community score",
            `${vt.reputation ?? 0} (${vt.votes.malicious} malicious, ${vt.votes.harmless} harmless votes)`,
          ],
        ]
        if (vt.popularity) {
          facts.push(["Popularity", `#${vt.popularity.rank.toLocaleString("en-US")} · ${vt.popularity.provider}`])
        }
        if (vt.owner || vt.network) {
          facts.push([
            "Network",
            [vt.owner, vt.asn && `AS${vt.asn}`, vt.network, countryName(vt.country)].filter(Boolean).join(" · "),
          ])
        }
        if (vt.categories.length) facts.push(["Categories", <Chips key="c" values={vt.categories} />])
        if (vt.threatNames.length) facts.push(["Threat names", <Chips key="t" values={vt.threatNames} mono />])
        if (vt.tags.length) facts.push(["Tags", <Chips key="g" values={vt.tags} mono />])

        return (
          <div className="grid gap-6">
            {vt.fallbackFrom && (
              <p className="border-l-2 border-glow/50 pl-3 text-xs text-muted-foreground">
                No VirusTotal record for this URL. Showing the host{" "}
                <span className="font-mono text-ink">{vt.indicator}</span>.
              </p>
            )}

            <div className="grid items-center gap-6 sm:grid-cols-[auto_minmax(0,1fr)]">
              <div>
                <p className={cn("text-4xl font-semibold tabular-nums", detectionTone(vt.stats.malicious))}>
                  {vt.stats.malicious}
                  <span className="text-lg font-normal text-muted-foreground">/{total}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">detections</p>
              </div>
              <DetectionBar stats={vt.stats} />
            </div>

            <Facts items={facts} />

            {vt.engines.length > 0 && (
              <div>
                <p className="eyebrow text-[10px]">Detections</p>
                <div className="-mx-5 mt-2 overflow-x-auto">
                  <table className="w-full min-w-[440px] text-left text-[12.5px]">
                    <thead>
                      <tr className="border-y border-ink/[0.06] font-mono text-[10px] tracking-[0.14em] text-muted-foreground/70 uppercase">
                        <th scope="col" className="px-5 py-2 font-medium">Engine</th>
                        <th scope="col" className="px-5 py-2 font-medium">Result</th>
                        <th scope="col" className="px-5 py-2 font-medium">Label</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/[0.05]">
                      {vt.engines.map((engine) => (
                        <tr key={engine.engine}>
                          <td className="px-5 py-2 text-foreground/90">{engine.engine}</td>
                          <td className="px-5 py-2">
                            <span
                              className={cn(
                                "font-mono text-[11px] uppercase",
                                engine.category === "malicious" ? "text-sev-critical" : "text-sev-high"
                              )}
                            >
                              {engine.category}
                            </span>
                          </td>
                          <td className="px-5 py-2 font-mono text-[11.5px] break-all text-muted-foreground">
                            {engine.label ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <ExternalLink href={vt.permalink}>View on VirusTotal</ExternalLink>
              <p className="font-mono text-[10.5px] text-muted-foreground/70">Lookup only · not submitted</p>
            </div>
          </div>
        )
      }}
    </SourcePanel>
  )
}

function scoreTone(score: number) {
  if (score >= 75) return { text: "text-sev-critical", bar: "bg-sev-critical" }
  if (score >= 25) return { text: "text-sev-high", bar: "bg-sev-high" }
  if (score > 0) return { text: "text-sev-medium", bar: "bg-sev-medium" }
  return { text: "text-ok", bar: "bg-ok" }
}

function AbuseHost({ host }: { host: AbuseInfo }) {
  const tone = scoreTone(host.score)
  const topCount = host.categories[0]?.count ?? 1
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[13px] font-medium text-ink">{host.ip}</span>
        {host.isTor && (
          <span className="rounded bg-signal/10 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-signal uppercase ring-1 ring-signal/25">
            Tor
          </span>
        )}
        {host.isWhitelisted && (
          <span className="rounded bg-ok/10 px-1.5 py-0.5 font-mono text-[10px] tracking-wider text-ok uppercase ring-1 ring-ok/25">
            Whitelisted
          </span>
        )}
        <span className="ml-auto font-mono text-[11px] text-muted-foreground">
          Last report {formatIsoDateTime(host.lastReportedAt)}
        </span>
      </div>

      <div className="grid gap-6 sm:grid-cols-[11rem_minmax(0,1fr)]">
        <div>
          <p className={cn("text-4xl font-semibold tabular-nums", tone.text)}>
            {host.score}
            <span className="text-lg font-normal text-muted-foreground">%</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">confidence of abuse</p>
          <div
            role="meter"
            aria-label="Confidence of abuse"
            aria-valuenow={host.score}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-3 h-1.5 overflow-hidden rounded-sm bg-ink/[0.06]"
          >
            <div className={cn("h-full", tone.bar)} style={{ width: `${Math.max(host.score, 2)}%` }} />
          </div>
        </div>
        <Facts
          items={[
            ["Reports", `${host.totalReports} (${host.distinctReporters} reporters, 90 days)`],
            ["Usage type", host.usageType ?? "—"],
            ["ISP", host.isp ?? "—"],
            ["Domain", host.domain ?? "—"],
            ["Country", countryName(host.countryCode) ?? "—"],
            ["Hostnames", host.hostnames.length ? <Chips key="h" values={host.hostnames} mono /> : "—"],
          ]}
        />
      </div>

      {host.categories.length > 0 && (
        <div>
          <p className="eyebrow text-[10px]">Categories · last {host.sampled} reports</p>
          <ul className="mt-3 grid gap-2">
            {host.categories.map((category) => (
              <li key={category.name} className="grid grid-cols-[9rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-xs">
                <span className="truncate text-foreground/90">{category.name}</span>
                <span className="h-1.5 overflow-hidden rounded-sm bg-ink/[0.06]" aria-hidden>
                  <span className="block h-full bg-glow/60" style={{ width: `${(category.count / topCount) * 100}%` }} />
                </span>
                <span className="text-right font-mono text-muted-foreground tabular-nums">{category.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {host.recent.length > 0 && (
        <div>
          <p className="eyebrow text-[10px]">Recent reports</p>
          <ol className="mt-2 grid gap-1.5">
            {host.recent.map((report, index) => (
              <li
                key={`${report.reportedAt}-${index}`}
                className="grid gap-x-3 gap-y-1 text-xs sm:grid-cols-[11.5rem_minmax(0,1fr)_2.5rem]"
              >
                <span className="font-mono text-muted-foreground">{formatIsoDateTime(report.reportedAt)}</span>
                <span className="text-foreground/85">{report.categories.join(", ") || "Uncategorized"}</span>
                <span className="font-mono text-muted-foreground sm:text-right">{report.reporterCountry ?? ""}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <ExternalLink href={host.permalink}>View on AbuseIPDB</ExternalLink>
    </div>
  )
}

export function AbusePanel({ result }: { result: SourceResult<AbuseInfo[]> }) {
  return (
    <SourcePanel
      title={SOURCES.abuse.label}
      icon={Siren}
      provider="AbuseIPDB"
      description={SOURCES.abuse.description}
      result={result}
      className="lg:col-span-2"
    >
      {(hosts) => (
        <div className="grid gap-8">
          {hosts.map((host) => (
            <AbuseHost key={host.ip} host={host} />
          ))}
        </div>
      )}
    </SourcePanel>
  )
}
