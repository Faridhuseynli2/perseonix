import { SEVERITY_ORDER, formatIsoDate, plural } from "@/lib/investigate/meta"
import type {
  AbuseInfo,
  ExposureInfo,
  InvestigationReport,
  Signal,
  TargetKind,
  Verdict,
  VirusTotalInfo,
} from "@/lib/investigate/types"

const DAY_MS = 86_400_000

type Evidence = Omit<InvestigationReport, "signals" | "verdict" | "generatedAt" | "tookMs">

const daysBetween = (from: number, to: number) => Math.floor((to - from) / DAY_MS)

/** Rough "same organisation" test for redirects; good enough without a public-suffix list. */
function baseDomain(host: string) {
  return host.replace(/^www\./, "").split(".").slice(-2).join(".")
}

/** Services that should almost never face the internet. */
const RISKY_PORTS: Record<number, string> = {
  21: "FTP",
  23: "Telnet",
  445: "SMB",
  1433: "MSSQL",
  2375: "Docker API",
  3306: "MySQL",
  3389: "RDP",
  5432: "PostgreSQL",
  5900: "VNC",
  6379: "Redis",
  9200: "Elasticsearch",
  11211: "Memcached",
  27017: "MongoDB",
}

const SUBJECTS: Record<TargetKind, string> = {
  domain: "this domain",
  ip: "this IP address",
  url: "this URL",
}

function virustotalSignals(vt: VirusTotalInfo): Signal[] {
  const signals: Signal[] = []
  const { malicious, suspicious, harmless, undetected } = vt.stats
  const total = malicious + suspicious + harmless + undetected
  const subject = vt.fallbackFrom ? `its host ${vt.indicator}` : SUBJECTS[vt.kind]
  const flagged = vt.engines.filter((engine) => engine.category === "malicious")
  const labels = [...new Set(vt.engines.map((engine) => engine.label).filter(Boolean))]
  const detail = [
    flagged.length > 0 &&
      `${flagged.slice(0, 4).map((engine) => engine.engine).join(", ")}${flagged.length > 4 ? ` +${flagged.length - 4}` : ""}`,
    labels.length > 0 && labels.slice(0, 4).join(", "),
    vt.threatNames.length > 0 && vt.threatNames.slice(0, 3).join(", "),
  ]
    .filter(Boolean)
    .join(" · ")

  if (malicious >= 2) {
    signals.push({
      severity: malicious >= 5 ? "critical" : "high",
      title: `${malicious}/${total} security vendors flag ${subject} as malicious`,
      detail,
      why: "Detected by multiple independent engines.",
      source: "virustotal",
    })
  } else if (malicious === 1) {
    signals.push({
      severity: "medium",
      title: `1/${total} security vendors flags ${subject} as malicious`,
      detail,
      why: "Single-engine detections are often false positives. Check the label and the other sources.",
      source: "virustotal",
    })
  } else if (suspicious >= 2) {
    signals.push({
      severity: "low",
      title: `${suspicious} security vendors rate ${subject} as suspicious`,
      detail,
      why: "Heuristic ratings without a confirmed detection.",
      source: "virustotal",
    })
  } else if (total > 0) {
    signals.push({
      severity: "info",
      title: `No detections for ${subject} (0/${total})`,
      why: "New infrastructure is often undetected at first.",
      source: "virustotal",
    })
  }

  if (vt.reputation !== undefined && vt.reputation <= -10 && malicious < 2) {
    signals.push({
      severity: "low",
      title: `Negative VirusTotal community score (${vt.reputation})`,
      detail: `${plural(vt.votes.malicious, "malicious vote")}, ${plural(vt.votes.harmless, "harmless vote")}`,
      source: "virustotal",
    })
  }
  if (vt.popularity && vt.popularity.rank <= 100_000) {
    signals.push({
      severity: "info",
      title: `Popular domain: #${vt.popularity.rank.toLocaleString("en-US")} on ${vt.popularity.provider}`,
      why: "Popular platforms can still host malicious content. Check the exact URL.",
      source: "virustotal",
    })
  }
  return signals
}

function abuseSignals(hosts: AbuseInfo[], kind: TargetKind): Signal[] {
  if (hosts.length === 0) return []
  const worst = hosts.reduce((a, b) => (b.score > a.score ? b : a))
  const topCategories = worst.categories.slice(0, 3).map((category) => category.name).join(", ")
  const detail = `${plural(worst.totalReports, "report")} from ${plural(worst.distinctReporters, "reporter")} (90 days)${topCategories ? ` · ${topCategories}` : ""}`
  const why = "Reports come from network operators' own logs. The score reflects reporter count and recency."

  if (kind === "ip") {
    if (worst.isWhitelisted) {
      return [{
        severity: "info",
        title: "Whitelisted by AbuseIPDB",
        why: "Known provider range. Reports against it are usually false positives.",
        source: "abuse",
      }]
    }
    if (worst.score >= 25) {
      return [{
        severity: worst.score >= 75 ? "critical" : "high",
        title: `Abuse confidence ${worst.score}%`,
        detail,
        why,
        source: "abuse",
      }]
    }
    if (worst.totalReports > 0) {
      return [{
        severity: "low",
        title: `Abuse confidence ${worst.score}%`,
        detail,
        why: "Few or old reports. Common for shared and dynamic addresses.",
        source: "abuse",
      }]
    }
    return [{ severity: "info", title: "No abuse reports in 90 days", source: "abuse" }]
  }

  // Domains and URLs: the address may be shared with unrelated sites.
  if (!worst.isWhitelisted && worst.score >= 25) {
    return [{
      severity: "medium",
      title: `Hosting IP ${worst.ip} has abuse confidence ${worst.score}%`,
      detail,
      why: "Shared hosting and CDN addresses collect reports from other tenants. Check whether the IP is dedicated.",
      source: "abuse",
    }]
  }
  return []
}

function exposureSignals(hosts: ExposureInfo[]): Signal[] {
  const signals: Signal[] = []
  const tags = new Set(hosts.flatMap((host) => host.tags.map((tag) => tag.toLowerCase())))

  const hostile = ["c2", "malware", "compromised"].filter((tag) => tags.has(tag))
  if (hostile.length > 0) {
    signals.push({
      severity: "critical",
      title: `Tagged ${hostile.join(" / ")} by Shodan`,
      why: "Based on fingerprints of the services running on the host.",
      source: "exposure",
    })
  }
  if (tags.has("vpn") || tags.has("proxy")) {
    signals.push({ severity: "low", title: "VPN or proxy endpoint", why: "Hides the true source of traffic.", source: "exposure" })
  }
  if (tags.has("honeypot")) {
    signals.push({ severity: "info", title: "Honeypot", why: "Research decoy. Connections are logged.", source: "exposure" })
  }

  const vulns = [...new Set(hosts.flatMap((host) => host.vulns))]
  if (vulns.length > 0) {
    signals.push({
      severity: "medium",
      title: `${plural(vulns.length, "known vulnerability")} on exposed services`,
      detail: `${vulns.slice(0, 5).join(", ")}${vulns.length > 5 ? " …" : ""}`,
      why: "Inferred from software versions in service banners. Not verified.",
      source: "exposure",
    })
  }

  const ports = [...new Set(hosts.flatMap((host) => host.ports))].sort((a, b) => a - b)
  const risky = ports.filter((port) => RISKY_PORTS[port])
  if (risky.length > 0) {
    signals.push({
      severity: "medium",
      title: "Sensitive services exposed",
      detail: risky.map((port) => `${RISKY_PORTS[port]} (${port})`).join(", "),
      why: "Frequent targets for brute-force and ransomware when reachable from the internet.",
      source: "exposure",
    })
  }
  if (ports.length > 0) {
    signals.push({
      severity: "info",
      title: `${plural(ports.length, "open port")} (Shodan)`,
      detail: `${ports.slice(0, 12).join(", ")}${ports.length > 12 ? " …" : ""}`,
      source: "exposure",
    })
  }
  return signals
}

/** Turns raw source data into ranked findings and an overall verdict. */
export function evaluate(evidence: Evidence, now = Date.now()): { signals: Signal[]; verdict: Verdict } {
  const signals: Signal[] = []
  const {
    target,
    dns,
    registration,
    network,
    exposure,
    certificates,
    live,
    threatFeed,
    urlscan,
    virustotal,
    abuse,
    sandbox,
  } = evidence

  if (virustotal?.data) signals.push(...virustotalSignals(virustotal.data))
  if (abuse?.data) signals.push(...abuseSignals(abuse.data, target.kind))

  const feed = threatFeed.data
  if (feed?.listed) {
    const threats = [...new Set(feed.hits.map((hit) => hit.threat))].join(", ")
    signals.push(
      feed.active
        ? {
            severity: "critical",
            title: "Serving malware (URLhaus)",
            detail: `${plural(feed.urlCount, "URL")} listed · ${threats}`,
            why: "At least one listed URL is still online.",
            source: "threatFeed",
          }
        : {
            severity: "medium",
            title: "Previously listed on URLhaus",
            detail: `${plural(feed.urlCount, "URL")} listed, none online · ${threats}`,
            why: "Previously used to distribute malware.",
            source: "threatFeed",
          }
    )
  }

  if (exposure?.data) signals.push(...exposureSignals(exposure.data))

  const torFromAbuse = abuse?.data?.some((host) => host.isTor)
  const torFromShodan = exposure?.data?.some((host) => host.tags.some((tag) => tag.toLowerCase() === "tor"))
  if (torFromAbuse || torFromShodan) {
    signals.push({
      severity: "medium",
      title: "Tor exit node",
      why: "Traffic from Tor exits cannot be traced to its origin.",
      source: torFromAbuse ? "abuse" : "exposure",
    })
  }

  const reg = registration.data
  if (reg?.createdAt) {
    const age = daysBetween(Date.parse(reg.createdAt), now)
    const detail = `Registered ${formatIsoDate(reg.createdAt)}${reg.registrar ? ` · ${reg.registrar}` : ""}`
    const why = "Newly registered domains are frequently used for phishing and malware."
    if (age < 30) {
      signals.push({ severity: "high", title: `Domain registered ${plural(age, "day")} ago`, detail, why, source: "registration" })
    } else if (age < 90) {
      signals.push({ severity: "medium", title: `Domain registered ${plural(age, "day")} ago`, detail, why, source: "registration" })
    }
  }
  if (reg?.expiresAt) {
    const left = daysBetween(now, Date.parse(reg.expiresAt))
    if (left < 0) {
      signals.push({ severity: "medium", title: "Registration expired", why: "Can be re-registered by anyone.", source: "registration" })
    } else if (left <= 30) {
      signals.push({ severity: "low", title: `Registration expires in ${plural(left, "day")}`, source: "registration" })
    }
  }
  if (reg?.status.some((status) => /hold/i.test(status))) {
    signals.push({
      severity: "high",
      title: "Domain on hold at the registry",
      detail: reg.status.filter((status) => /hold/i.test(status)).join(", "),
      why: "Registries suspend domains for abuse, legal or billing reasons.",
      source: "registration",
    })
  }

  const records = dns.data
  if (records?.nxdomain) {
    signals.push({ severity: "medium", title: "NXDOMAIN", why: "The domain is not registered or has been removed.", source: "dns" })
  } else if (records && target.kind === "domain") {
    if (records.mx.length === 0) {
      signals.push({ severity: "info", title: "No MX records", why: "The domain cannot receive email.", source: "dns" })
    } else {
      if (!records.txt.some((record) => record.startsWith("v=spf1"))) {
        signals.push({ severity: "low", title: "No SPF record", why: "Any server can send mail as this domain.", source: "dns" })
      }
      if (!records.dmarc) {
        signals.push({ severity: "low", title: "No DMARC policy", why: "Receivers have no policy for spoofed mail.", source: "dns" })
      }
    }
  }

  const check = live.data
  if (check) {
    if (check.tls && !check.tls.trusted) {
      signals.push({
        severity: "high",
        title: "Untrusted TLS certificate",
        detail: check.tls.error,
        why: "Browsers show a certificate warning for this site.",
        source: "live",
      })
    } else if (check.tls?.validTo) {
      const left = daysBetween(now, Date.parse(check.tls.validTo))
      if (left <= 14) {
        signals.push({ severity: "low", title: `TLS certificate expires in ${plural(left, "day")}`, source: "live" })
      }
    }
    if (check.tls?.validFrom) {
      const age = daysBetween(Date.parse(check.tls.validFrom), now)
      if (age < 7) {
        signals.push({
          severity: "low",
          title: `TLS certificate issued ${plural(age, "day")} ago`,
          why: "Fresh certificates often accompany newly deployed phishing sites.",
          source: "live",
        })
      }
    }
    const finalHost = new URL(check.finalUrl).hostname
    if (baseDomain(finalHost) !== baseDomain(target.host)) {
      signals.push({
        severity: "medium",
        title: "Redirects to another domain",
        detail: check.finalUrl,
        why: "Redirect chains are used to hide the final destination.",
        source: "live",
      })
    }
    if (check.finalUrl.startsWith("http:")) {
      signals.push({ severity: "low", title: "No HTTPS", why: "Traffic, including submitted credentials, is unencrypted.", source: "live" })
    }
    const missing = check.securityHeaders.filter((header) => !header.present).length
    if (missing >= 4) {
      signals.push({
        severity: "info",
        title: `${missing}/${check.securityHeaders.length} security headers missing`,
        source: "live",
      })
    }
    if (check.status >= 400) {
      signals.push({ severity: "info", title: `HTTP ${check.status}`, source: "live" })
    }
  } else if (live.status === "error") {
    signals.push({ severity: "info", title: "Live check failed", detail: live.error, source: "live" })
  }

  const page = sandbox?.data
  if (page) {
    if (page.passwordFields > 0 && page.externalFormTargets.length > 0) {
      signals.push({
        severity: "high",
        title: "Password form submits to another site",
        detail: page.externalFormTargets.slice(0, 2).join(", "),
        why: "Credential-harvesting pages send captured passwords to a different host.",
        source: "sandbox",
      })
    } else if (page.passwordFields > 0) {
      signals.push({
        severity: "low",
        title: "Page asks for a password",
        why: "Check that the domain belongs to the brand shown on the page.",
        source: "sandbox",
      })
    }
    // The live check already reports HTTP redirects; this catches script redirects.
    const liveLeftSite = check ? baseDomain(new URL(check.finalUrl).hostname) !== baseDomain(target.host) : false
    if (!liveLeftSite && baseDomain(new URL(page.finalUrl).hostname) !== baseDomain(target.host)) {
      signals.push({
        severity: "medium",
        title: "Browser is redirected to another domain",
        detail: page.finalUrl,
        why: "Script-based redirects hide the destination from simple scanners.",
        source: "sandbox",
      })
    }
    if (page.requests.blocked > 0) {
      signals.push({
        severity: "low",
        title: `${plural(page.requests.blocked, "request")} to non-public addresses blocked`,
        why: "Public pages have no reason to call private addresses.",
        source: "sandbox",
      })
    }
  }

  const host = network.data?.[0]
  if (host?.asn) {
    signals.push({
      severity: "info",
      title: `AS${host.asn}${host.asName ? ` · ${host.asName}` : ""}`,
      detail: [host.prefix, host.country].filter(Boolean).join(" · ") || undefined,
      source: "network",
    })
  }

  if (certificates.data && certificates.data.subdomains.length > 0) {
    signals.push({
      severity: "info",
      title: `${plural(certificates.data.subdomains.length, "hostname")} in CT logs`,
      why: "Useful for pivoting to related infrastructure.",
      source: "certificates",
    })
  }
  if (urlscan.status === "ok") {
    signals.push({ severity: "info", title: "urlscan.io scan submitted (private)", source: "urlscan" })
  }

  signals.sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))

  const coreSources =
    target.kind === "ip" ? [network.status, live.status] : [dns.status, registration.status, live.status]
  const reputationAnswered = [virustotal?.status, abuse?.status].includes("ok")
  const verdict: Verdict = signals.some((s) => s.severity === "critical")
    ? "malicious"
    : signals.some((s) => s.severity === "high")
      ? "suspicious"
      : coreSources.every((status) => status === "error") && !reputationAnswered
        ? "inconclusive"
        : "no_known_threats"

  return { signals, verdict }
}
