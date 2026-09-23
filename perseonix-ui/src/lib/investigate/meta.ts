// Shared by server and client components: keep free of server-only imports.
import type { SignalSeverity, SourceKey, TargetKind, Verdict } from "@/lib/investigate/types"

export const INVESTIGATE_MODULE_KEY = "investigate"

export const KIND_LABELS: Record<TargetKind, string> = {
  domain: "Domain",
  ip: "IP address",
  url: "URL",
}

export const VERDICTS: Record<Verdict, { label: string; description: string; rule: string }> = {
  malicious: {
    label: "Malicious",
    description: "Flagged as malicious by security vendors, abuse reports or threat feeds.",
    rule: "One or more critical findings",
  },
  suspicious: {
    label: "Suspicious",
    description: "High-risk indicators found. Handle with caution.",
    rule: "One or more high findings",
  },
  no_known_threats: {
    label: "No known threats",
    description: "Nothing was flagged in the sources checked. This is not a guarantee of safety.",
    rule: "No critical or high findings",
  },
  inconclusive: {
    label: "Inconclusive",
    description: "Core sources did not respond. Run the investigation again.",
    rule: "Core sources unavailable",
  },
}

export const VERDICT_ORDER: Verdict[] = ["malicious", "suspicious", "no_known_threats", "inconclusive"]

export const SEVERITY_ORDER: SignalSeverity[] = ["critical", "high", "medium", "low", "info"]

export const SEVERITY_MEANING: Record<SignalSeverity, string> = {
  critical: "Confirmed malicious activity",
  high: "Strong risk indicator",
  medium: "Needs review",
  low: "Weak indicator",
  info: "Context",
}

export type SourceGroup = "reputation" | "infrastructure" | "behaviour"

export const SOURCE_GROUPS: { key: SourceGroup; label: string }[] = [
  { key: "reputation", label: "Reputation" },
  { key: "infrastructure", label: "Infrastructure" },
  { key: "behaviour", label: "Behaviour" },
]

/** Every source an investigation can use, in the order reports present them. */
export const SOURCES: Record<
  SourceKey,
  { label: string; provider: string; group: SourceGroup; description: string; appliesTo: TargetKind[] }
> = {
  virustotal: {
    label: "Vendor detections",
    provider: "VirusTotal",
    group: "reputation",
    description: "Verdicts from 90+ antivirus engines, URL filters and blocklists.",
    appliesTo: ["domain", "ip", "url"],
  },
  abuse: {
    label: "Abuse reports",
    provider: "AbuseIPDB",
    group: "reputation",
    description: "Reports filed by network operators in the last 90 days.",
    appliesTo: ["domain", "ip", "url"],
  },
  threatFeed: {
    label: "Malware URL feed",
    provider: "abuse.ch URLhaus",
    group: "reputation",
    description: "Known malware distribution URLs.",
    appliesTo: ["domain", "ip", "url"],
  },
  dns: {
    label: "DNS records",
    provider: "Cloudflare & Google resolvers",
    group: "infrastructure",
    description: "A, AAAA, MX, NS, TXT, CAA and SOA records, SPF and DMARC.",
    appliesTo: ["domain", "url"],
  },
  registration: {
    label: "Registration",
    provider: "RDAP",
    group: "infrastructure",
    description: "Registrar, creation and expiry dates, registry status.",
    appliesTo: ["domain", "url"],
  },
  network: {
    label: "Network & hosting",
    provider: "Team Cymru · RDAP",
    group: "infrastructure",
    description: "ASN, network owner, country and abuse contact.",
    appliesTo: ["domain", "ip", "url"],
  },
  geo: {
    label: "Geolocation",
    provider: "GeoLite2 via RIPEstat",
    group: "infrastructure",
    description: "Approximate location of the IP address.",
    appliesTo: ["domain", "ip", "url"],
  },
  certificates: {
    label: "Certificate transparency",
    provider: "Cert Spotter · crt.sh",
    group: "infrastructure",
    description: "Certificates and hostnames from public CT logs.",
    appliesTo: ["domain", "url"],
  },
  exposure: {
    label: "Internet exposure",
    provider: "Shodan",
    group: "infrastructure",
    description: "Open ports, service banners and CVEs from Shodan scans.",
    appliesTo: ["domain", "ip", "url"],
  },
  live: {
    label: "Live check",
    provider: "Perseonix probe",
    group: "behaviour",
    description: "HTTP response, redirects, TLS certificate and security headers. Page scripts are not executed.",
    appliesTo: ["domain", "ip", "url"],
  },
  sandbox: {
    label: "Page capture",
    provider: "Perseonix sandbox",
    group: "behaviour",
    description: "Opens the page in an isolated browser: screenshot, redirects and every host it contacts.",
    appliesTo: ["domain", "ip", "url"],
  },
  urlscan: {
    label: "Sandbox scan",
    provider: "urlscan.io (private)",
    group: "behaviour",
    description: "Full browser render with screenshot.",
    appliesTo: ["domain", "url"],
  },
}

export const SOURCE_ORDER = Object.keys(SOURCES) as SourceKey[]

/** "1 port", "3 ports", "2 IP addresses", "4 known vulnerabilities". */
export function plural(count: number, word: string) {
  if (count === 1) return `${count} ${word}`
  if (/(s|x|z|ch|sh)$/.test(word)) return `${count} ${word}es`
  if (/[^aeiou]y$/.test(word)) return `${count} ${word.slice(0, -1)}ies`
  return `${count} ${word}s`
}

const regionNames = new Intl.DisplayNames(["en"], { type: "region" })

/** "GB" → "United Kingdom"; falls back to the code itself. */
export function countryName(code?: string) {
  if (!code) return undefined
  try {
    return regionNames.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

/** Quick client-side guess for the input badge; the server does the real validation. */
export function detectKind(raw: string): TargetKind | null {
  const value = raw.trim()
  if (!value) return null
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value) || /[/?#]/.test(value)) return "url"
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return "ip"
  if (value.includes(":") && /^\[?[\da-f:.]+\]?$/i.test(value)) return "ip"
  if (/^[^\s.:]+(\.[^\s.:]+)+$/.test(value)) return "domain"
  if (/^[^\s.:]+(\.[^\s.:]+)+:\d+$/.test(value)) return "url"
  return null
}

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" })

export function formatIsoDate(iso?: string | null) {
  if (!iso) return "—"
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date)
}
