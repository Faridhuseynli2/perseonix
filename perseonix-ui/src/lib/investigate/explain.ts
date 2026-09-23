// Derived views of a saved report: the per-source trace, the findings that set
// the verdict, and pivots to related infrastructure. Pure and client-safe.
import { SEVERITY_ORDER, SOURCE_ORDER, countryName, formatIsoDate, plural } from "@/lib/investigate/meta"
import type {
  InvestigationReport,
  NetworkInfo,
  Signal,
  SignalSeverity,
  SourceKey,
  SourceResult,
} from "@/lib/investigate/types"

export function severityCounts(signals: Signal[]) {
  const counts = Object.fromEntries(SEVERITY_ORDER.map((severity) => [severity, 0])) as Record<SignalSeverity, number>
  for (const signal of signals) counts[signal.severity]++
  return counts
}

/**
 * The company behind a network: "HOSTGLOBALPLUS-AS - HOSTGLOBAL.PLUS LTD, GB"
 * becomes "HOSTGLOBAL.PLUS LTD". RDAP owners are often maintainer handles.
 */
function hostingOrganisation(network?: NetworkInfo) {
  const fromAsName = network?.asName?.split(" - ").slice(1).join(" - ").replace(/,\s*[A-Z]{2}$/, "").trim()
  if (fromAsName) return fromAsName
  if (network?.owner && !/^MNT-/i.test(network.owner)) return network.owner
  return network?.asName
}

/** Short factual paragraphs for exported reports, built only from report data. */
export function executiveSummary(report: InvestigationReport): string[] {
  const { target } = report
  const reputation: string[] = []
  const infrastructure: string[] = []

  switch (report.verdict) {
    case "malicious":
      reputation.push(`${target.value} is assessed as malicious.`)
      break
    case "suspicious":
      reputation.push(`${target.value} is assessed as suspicious based on high-risk indicators.`)
      break
    case "no_known_threats":
      reputation.push(`No source flagged ${target.value} at the time of the investigation.`)
      break
    case "inconclusive":
      reputation.push(`The investigation of ${target.value} is inconclusive because core sources did not respond.`)
  }

  const vt = report.virustotal?.data
  if (vt) {
    const { malicious, suspicious, harmless, undetected } = vt.stats
    const total = malicious + suspicious + harmless + undetected
    const host = vt.fallbackFrom ? ` (host ${vt.indicator})` : ""
    reputation.push(
      malicious > 0
        ? `${malicious} of ${total} security vendors on VirusTotal flag it as malicious${host}.`
        : `None of the ${total} security vendors on VirusTotal flag it${host}.`
    )
  }

  const abuse = report.abuse?.data
  if (abuse?.length) {
    const worst = abuse.reduce((a, b) => (b.score > a.score ? b : a))
    const categories = worst.categories.slice(0, 3).map((category) => category.name.toLowerCase()).join(", ")
    reputation.push(
      worst.totalReports > 0
        ? `AbuseIPDB lists ${worst.ip} with ${worst.score}% abuse confidence from ${plural(worst.totalReports, "report")} in the last 90 days${categories ? ` (${categories})` : ""}.`
        : `AbuseIPDB has no reports for ${worst.ip} in the last 90 days.`
    )
  }

  const feed = report.threatFeed.data
  if (feed?.listed) {
    reputation.push(
      `URLhaus lists ${plural(feed.urlCount, "malware URL")} on this host${feed.active ? ", at least one still online" : ""}.`
    )
  }

  const network = report.network.data?.[0]
  const location = report.geo?.data?.[0]
  const owner = hostingOrganisation(network)
  const place = location
    ? [location.city, countryName(location.countryCode)].filter(Boolean).join(", ")
    : countryName(network?.country)
  if (owner || place) {
    const by = owner ? ` by ${owner}${network?.asn ? ` (AS${network.asn})` : ""}` : ""
    infrastructure.push(`${target.kind === "ip" ? "The address" : "It"} is hosted${by}${place ? ` in ${place}` : ""}.`)
  }

  const registration = report.registration.data
  if (registration?.createdAt) {
    infrastructure.push(
      `The domain ${registration.domain} was registered on ${formatIsoDate(registration.createdAt)}${registration.registrar ? ` through ${registration.registrar.replace(/\.$/, "")}` : ""}.`
    )
  }

  const exposure = report.exposure?.data
  if (exposure?.length) {
    const ports = [...new Set(exposure.flatMap((host) => host.ports))].sort((a, b) => a - b)
    const vulns = new Set(exposure.flatMap((host) => host.vulns)).size
    if (ports.length > 0) {
      infrastructure.push(
        `Shodan observed ${plural(ports.length, "open port")}${ports.length <= 8 ? ` (${ports.join(", ")})` : ""}${vulns ? ` and ${plural(vulns, "CVE")} associated with the exposed services` : ""}.`
      )
    }
  }

  const live = report.live.data
  if (live) {
    const untrusted = live.tls && !live.tls.trusted ? " with an untrusted TLS certificate" : ""
    infrastructure.push(`The ${target.kind === "ip" ? "service" : "site"} responded with HTTP ${live.status}${untrusted}.`)
  }

  const page = report.sandbox?.data
  if (page) {
    const title = page.title ? ` "${page.title}"` : ""
    const password = page.passwordFields > 0 ? " and contains a password field" : ""
    infrastructure.push(
      `Opened in an isolated browser, the page${title} contacted ${plural(page.hosts.length, "host")}${password}.`
    )
  }

  return [reputation.join(" "), infrastructure.join(" ")].filter(Boolean)
}

export type TraceStatus = "ok" | "empty" | "error" | "not_enabled" | "not_applicable" | "missing"

export type TraceStep = {
  key: SourceKey
  status: TraceStatus
  /** What the source returned, or why it didn't. */
  outcome: string
  tookMs?: number
  /** Findings above "info" that this source produced. */
  findings: number
}

const EMPTY_OUTCOMES: Partial<Record<SourceKey, string>> = {
  virustotal: "Not analyzed by VirusTotal",
  exposure: "Not seen by Shodan",
  registration: "No registration record",
  certificates: "No certificates found",
  geo: "Location unknown",
  sandbox: "Nothing captured",
}

function okOutcome(report: InvestigationReport, key: SourceKey): string {
  switch (key) {
    case "virustotal": {
      const vt = report.virustotal?.data
      if (!vt) break
      const { malicious, suspicious, harmless, undetected } = vt.stats
      const total = malicious + suspicious + harmless + undetected
      const counts = `${malicious} malicious${suspicious ? `, ${suspicious} suspicious` : ""} / ${total} engines`
      return vt.fallbackFrom ? `${counts} (host ${vt.indicator})` : counts
    }
    case "abuse": {
      const hosts = report.abuse?.data
      if (!hosts?.length) break
      const worst = hosts.reduce((a, b) => (b.score > a.score ? b : a))
      return `Confidence ${worst.score}% · ${plural(worst.totalReports, "report")}${hosts.length > 1 ? ` · worst of ${hosts.length} IPs` : ""}`
    }
    case "threatFeed": {
      const feed = report.threatFeed.data
      if (!feed) break
      if (!feed.listed) return "Not listed"
      return `${plural(feed.urlCount, "URL")} listed${feed.active ? ", online" : ", offline"}`
    }
    case "dns": {
      const dns = report.dns.data
      if (!dns) break
      if (dns.nxdomain) return "NXDOMAIN"
      return `${plural(dns.a.length + dns.aaaa.length, "address")} · ${dns.mx.length} MX · ${dns.ns.length} NS`
    }
    case "registration": {
      const reg = report.registration.data
      if (!reg) break
      return [reg.registrar ?? "Unknown registrar", reg.createdAt && `created ${formatIsoDate(reg.createdAt)}`]
        .filter(Boolean)
        .join(" · ")
    }
    case "network": {
      const hosts = report.network.data
      if (!hosts?.length) break
      const first = hosts[0]
      const owner = first.asn ? `AS${first.asn}${first.asName ? ` ${first.asName}` : ""}` : (first.owner ?? first.ip)
      return hosts.length > 1 ? `${owner} · ${hosts.length} IPs` : owner
    }
    case "geo": {
      const places = report.geo?.data
      if (!places?.length) break
      const first = places[0]
      const place = [first.city, countryName(first.countryCode)].filter(Boolean).join(", ")
      return places.length > 1 ? `${place} · ${places.length} IPs` : place
    }
    case "certificates": {
      const ct = report.certificates.data
      if (!ct) break
      return `${plural(ct.total, "certificate")} · ${plural(ct.subdomains.length, "hostname")}`
    }
    case "exposure": {
      const hosts = report.exposure?.data
      if (!hosts) break
      const ports = new Set(hosts.flatMap((host) => host.ports)).size
      const vulns = new Set(hosts.flatMap((host) => host.vulns)).size
      return `${plural(ports, "open port")}${vulns ? ` · ${plural(vulns, "CVE")}` : ""}`
    }
    case "live": {
      const live = report.live.data
      if (!live) break
      const tls = live.tls ? (live.tls.trusted ? " · TLS trusted" : " · TLS untrusted") : ""
      return `HTTP ${live.status}${live.redirects.length ? ` · ${plural(live.redirects.length, "redirect")}` : ""}${tls}`
    }
    case "sandbox": {
      const page = report.sandbox?.data
      if (!page) break
      return [
        page.loaded ? "Rendered" : "Partly rendered",
        plural(page.hosts.length, "host"),
        plural(page.requests.total, "request"),
        page.passwordFields > 0 && "password form",
      ]
        .filter(Boolean)
        .join(" · ")
    }
    case "urlscan":
      return "Scan submitted"
  }
  return "OK"
}

export function traceSteps(report: InvestigationReport): TraceStep[] {
  return SOURCE_ORDER.map((key) => {
    const result = report[key] as SourceResult<unknown> | undefined
    const findings = report.signals.filter((signal) => signal.source === key && signal.severity !== "info").length
    if (!result) return { key, status: "missing", outcome: "Not in this report", findings }
    switch (result.status) {
      case "ok":
        return { key, status: "ok", outcome: okOutcome(report, key), tookMs: result.tookMs, findings }
      case "empty":
        return { key, status: "empty", outcome: EMPTY_OUTCOMES[key] ?? "No data", tookMs: result.tookMs, findings }
      case "error":
        return { key, status: "error", outcome: result.error ?? "Lookup failed", tookMs: result.tookMs, findings }
      default:
        return result.error === "Not enabled."
          ? { key, status: "not_enabled", outcome: "Not configured", findings }
          : { key, status: "not_applicable", outcome: result.error?.replace(/\.$/, "") ?? "Not applicable", findings }
    }
  })
}

export function coverage(steps: TraceStep[]) {
  const attempted = steps.filter((step) => ["ok", "empty", "error"].includes(step.status))
  return {
    answered: attempted.filter((step) => step.status !== "error").length,
    attempted: attempted.length,
  }
}

/** The findings that set the verdict: everything critical or high. */
export function verdictDrivers(report: InvestigationReport): Signal[] {
  return report.signals.filter((signal) => signal.severity === "critical" || signal.severity === "high")
}

export type PivotGroup = { label: string; values: string[] }

const MAX_PIVOTS = 30

/** Related indicators worth investigating next, deduplicated across groups. */
export function collectPivots(report: InvestigationReport): PivotGroup[] {
  const seen = new Set([report.target.host.toLowerCase(), report.target.value.toLowerCase()])
  const take = (values: (string | undefined)[]) => {
    const out: string[] = []
    for (const raw of values) {
      const value = raw?.trim().toLowerCase().replace(/\.$/, "")
      if (!value || value.includes("*") || /\s/.test(value) || value.length > 253 || seen.has(value)) continue
      seen.add(value)
      out.push(value)
    }
    return out.slice(0, MAX_PIVOTS)
  }
  const hostOf = (url: string) => {
    try {
      return new URL(url).hostname
    } catch {
      return undefined
    }
  }

  const dns = report.dns.data
  const live = report.live.data
  const groups: PivotGroup[] = [
    {
      label: "IP addresses",
      values: take([
        ...(dns?.a ?? []),
        ...(dns?.aaaa ?? []),
        live?.ip,
        ...(report.network.data ?? []).map((host) => host.ip),
        ...(report.abuse?.data ?? []).map((host) => host.ip),
        ...(report.sandbox?.data?.hosts ?? []).map((host) => host.ip),
      ]),
    },
    {
      label: "Domains & hostnames",
      values: take([
        report.registration.data?.domain,
        live ? hostOf(live.finalUrl) : undefined,
        ...(live?.redirects ?? []).map((hop) => hostOf(hop.url)),
        ...(report.network.data ?? []).flatMap((host) => host.reverseDns),
        ...(report.exposure?.data ?? []).flatMap((host) => host.hostnames),
        ...(report.abuse?.data ?? []).flatMap((host) => [host.domain, ...host.hostnames]),
        ...(report.certificates.data?.subdomains ?? []),
        report.sandbox?.data ? hostOf(report.sandbox.data.finalUrl) : undefined,
        ...(report.sandbox?.data?.hosts ?? []).filter((host) => host.thirdParty).map((host) => host.host),
      ]),
    },
    {
      label: "Nameservers",
      values: take([...(dns?.ns ?? []), ...(report.registration.data?.nameservers ?? [])]),
    },
    { label: "Mail servers", values: take((dns?.mx ?? []).map((mx) => mx.exchange)) },
  ]
  return groups.filter((group) => group.values.length > 0)
}
