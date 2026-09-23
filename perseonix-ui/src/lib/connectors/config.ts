// Catalog of third-party integrations, shared by server and client. No secrets.
// A connector's API key (when it needs one) is managed by administrators and
// stored server-side; the environment variable is the fallback.

export type ConnectorCategory =
  | "Threat Investigation"
  | "Adversary Intelligence"
  | "Ransomware Tracker"
  | "Credential Exposure"

export type Connector = {
  id: string
  name: string
  provider: string
  category: ConnectorCategory
  description: string
  /** True when the connector authenticates with an API key. */
  requiresKey: boolean
  /** Environment variable used as the fallback key. */
  envVar?: string
  docsUrl: string
  /** Short licensing caveat shown to the admin. */
  licenseNote?: string
}

export const CONNECTORS: Connector[] = [
  {
    id: "shodan",
    name: "Shodan",
    provider: "shodan.io",
    category: "Threat Investigation",
    description: "Internet-exposure data: open ports, service banners, CVEs and tags.",
    requiresKey: true,
    envVar: "SHODAN_API_KEY",
    docsUrl: "https://account.shodan.io",
    licenseNote: "Showing data to paying customers needs a Shodan agreement.",
  },
  {
    id: "virustotal",
    name: "VirusTotal",
    provider: "virustotal.com",
    category: "Threat Investigation",
    description: "Verdicts from 90+ antivirus engines, URL filters and blocklists.",
    requiresKey: true,
    envVar: "VIRUSTOTAL_API_KEY",
    docsUrl: "https://www.virustotal.com/gui/my-apikey",
    licenseNote: "Free public API is non-commercial (4/min, 500/day). Premium for commercial use.",
  },
  {
    id: "abuseipdb",
    name: "AbuseIPDB",
    provider: "abuseipdb.com",
    category: "Threat Investigation",
    description: "Crowd-sourced IP abuse reports and confidence score.",
    requiresKey: true,
    envVar: "ABUSEIPDB_API_KEY",
    docsUrl: "https://www.abuseipdb.com/account/api",
    licenseNote: "Free plan is non-commercial (1,000/day). Paid plan for commercial use.",
  },
  {
    id: "urlhaus",
    name: "URLhaus",
    provider: "abuse.ch",
    category: "Threat Investigation",
    description: "Malware-distribution URL feed from abuse.ch.",
    requiresKey: true,
    envVar: "ABUSECH_AUTH_KEY",
    docsUrl: "https://auth.abuse.ch",
    licenseNote: "Commercial use requires a Spamhaus subscription.",
  },
  {
    id: "urlscan",
    name: "urlscan.io",
    provider: "urlscan.io",
    category: "Threat Investigation",
    description: "Private sandbox scans with screenshots.",
    requiresKey: true,
    envVar: "URLSCAN_API_KEY",
    docsUrl: "https://urlscan.io/user/profile/",
    licenseNote: "Commercial use requires an agreement with urlscan.io.",
  },
  {
    id: "hibp",
    name: "Have I Been Pwned",
    provider: "haveibeenpwned.com",
    category: "Credential Exposure",
    description:
      "Breach lookup by email address. Password checks use HIBP's free k-anonymity range API and need no key.",
    requiresKey: true,
    envVar: "HIBP_API_KEY",
    docsUrl: "https://haveibeenpwned.com/API/Key",
    licenseNote:
      "Email breach lookups need a paid HIBP API key (commercial use allowed). Password checks are free and need no key.",
  },
  {
    id: "ransomware_live",
    name: "Ransomware.live",
    provider: "ransomware.live",
    category: "Ransomware Tracker",
    description: "Ransomware groups and their claimed victims (leak-site activity).",
    // The free v2 API needs no key; paste a PRO key here to switch to the paid tier.
    requiresKey: false,
    envVar: "RANSOMWARE_LIVE_API_KEY",
    docsUrl: "https://www.ransomware.live/api",
    licenseNote:
      "Free v2 API is personal-use only (1 req/min). Business use needs a PRO key or an alternative source.",
  },
]

/** A connector plus its resolved runtime state, safe to pass to the client. */
export type ConnectorView = Connector & {
  enabled: boolean
  configured: boolean
  active: boolean
  keySource: "saved" | "environment" | null
  keyHint: string | null
  updatedAt: string | null
}

export const CONNECTOR_CATEGORIES: ConnectorCategory[] = [
  "Threat Investigation",
  "Adversary Intelligence",
  "Ransomware Tracker",
  "Credential Exposure",
]

export function getConnector(id: string): Connector | undefined {
  return CONNECTORS.find((c) => c.id === id)
}
