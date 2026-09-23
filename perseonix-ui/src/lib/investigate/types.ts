// Report shapes shared by the server (sources, storage) and the client (report UI).

export type TargetKind = "domain" | "ip" | "url"

export type SourceStatus = "ok" | "empty" | "error" | "skipped"

/** Every source reports its own outcome, so one failing lookup never hides the others. */
export type SourceResult<T> = {
  status: SourceStatus
  data?: T
  /** Why the source failed or was skipped — safe to show to customers. */
  error?: string
  tookMs?: number
}

export type DnsRecords = {
  nxdomain: boolean
  a: string[]
  aaaa: string[]
  cname: string[]
  mx: { exchange: string; priority: number }[]
  ns: string[]
  txt: string[]
  caa: string[]
  dmarc?: string
  soa?: { nsname: string; hostmaster: string; serial: number }
}

export type Registration = {
  /** The registered domain the lookup resolved to, e.g. example.co.uk for www.example.co.uk. */
  domain: string
  registrar?: string
  registrarIanaId?: string
  createdAt?: string
  expiresAt?: string
  updatedAt?: string
  status: string[]
  nameservers: string[]
  dnssec?: boolean
  rdapServer?: string
}

export type NetworkInfo = {
  ip: string
  asn?: number
  asName?: string
  prefix?: string
  country?: string
  registry?: string
  networkName?: string
  networkRange?: string
  owner?: string
  abuseEmail?: string
  reverseDns: string[]
}

export type CertificateEntry = {
  commonName: string
  issuer: string
  notBefore: string
  notAfter: string
  dnsNames: string[]
}

export type CertificateInfo = {
  total: number
  certificates: CertificateEntry[]
  subdomains: string[]
  source: string
}

export type LiveCheck = {
  requestedUrl: string
  finalUrl: string
  status: number
  redirects: { url: string; status: number }[]
  ip?: string
  title?: string
  server?: string
  contentType?: string
  securityHeaders: { name: string; present: boolean }[]
  tls?: {
    protocol?: string
    subject?: string
    issuer?: string
    validFrom?: string
    validTo?: string
    altNames: number
    trusted: boolean
    error?: string
  }
  tookMs: number
}

export type ThreatFeedHit = {
  url: string
  status: string
  threat: string
  dateAdded: string
  tags: string[]
}

export type ThreatFeedResult = {
  listed: boolean
  /** True when at least one listed URL is still serving malware. */
  active: boolean
  urlCount: number
  hits: ThreatFeedHit[]
  reference?: string
}

export type UrlscanSubmission = {
  uuid: string
  visibility: "private"
  submittedAt: string
}

export type UrlscanSummary = {
  url?: string
  domain?: string
  ip?: string
  country?: string
  server?: string
  title?: string
  status?: number
  malicious: boolean
  score: number
  categories: string[]
  brands: string[]
  requests?: number
  domains?: number
}

export type UrlscanPoll =
  | { state: "pending" }
  | { state: "gone" }
  | { state: "done"; summary: UrlscanSummary }
  | { state: "error"; message: string }

export type ExposureService = {
  port: number
  transport: string
  product?: string
  version?: string
  module?: string
  title?: string
  lastSeen?: string
}

/** What an internet-wide scanner (Shodan) has seen listening on a host. */
export type ExposureInfo = {
  ip: string
  ports: number[]
  services: ExposureService[]
  /** CVE ids Shodan infers from service versions; not verified exploitation. */
  vulns: string[]
  tags: string[]
  os?: string
  org?: string
  isp?: string
  hostnames: string[]
  lastUpdate?: string
}

export type VirusTotalEngineHit = {
  engine: string
  category: "malicious" | "suspicious"
  /** The vendor's own label, e.g. "phishing", when it says more than the category. */
  label?: string
}

/** How security vendors aggregated by VirusTotal classify the indicator. */
export type VirusTotalInfo = {
  kind: TargetKind
  indicator: string
  /** Set when the URL itself was unknown and its domain/IP was looked up instead. */
  fallbackFrom?: string
  stats: { malicious: number; suspicious: number; harmless: number; undetected: number; timeout: number }
  /** Vendors that flagged it (malicious first), capped. */
  engines: VirusTotalEngineHit[]
  /** VirusTotal community score; negative means the community distrusts it. */
  reputation?: number
  votes: { harmless: number; malicious: number }
  categories: string[]
  tags: string[]
  threatNames: string[]
  popularity?: { provider: string; rank: number }
  owner?: string
  asn?: number
  country?: string
  network?: string
  firstSeenAt?: string
  lastAnalysisAt?: string
  permalink: string
}

export type AbuseReport = { reportedAt: string; categories: string[]; reporterCountry?: string }

/** Crowd-sourced abuse reports for one IP address (AbuseIPDB). */
export type AbuseInfo = {
  ip: string
  /** 0–100: how confident AbuseIPDB is that the address is abusive. */
  score: number
  totalReports: number
  distinctReporters: number
  lastReportedAt?: string
  usageType?: string
  isp?: string
  domain?: string
  hostnames: string[]
  countryCode?: string
  isTor: boolean
  isWhitelisted: boolean
  /** Attack categories across the most recent reports, most frequent first. */
  categories: { name: string; count: number }[]
  /** How many recent reports the categories were counted from. */
  sampled: number
  recent: AbuseReport[]
  permalink: string
}

/** Approximate position of an IP address (MaxMind GeoLite2). */
export type GeoLocation = {
  ip: string
  latitude: number
  longitude: number
  city?: string
  countryCode?: string
  /** False when the database only knows the country; the point is then a country default. */
  cityLevel: boolean
  /** The prefix the location applies to. */
  network?: string
}

export type SandboxHost = {
  host: string
  ip?: string
  requests: number
  /** Requests the sandbox refused because they pointed at a non-public address. */
  blocked: number
  /** Served from a different site than the page itself. */
  thirdParty: boolean
}

/** What happened when the page was opened in the isolated browser. */
export type SandboxCapture = {
  requestedUrl: string
  finalUrl: string
  title?: string
  status?: number
  /** False when the page hadn't finished loading in time; the screenshot shows what had rendered. */
  loaded: boolean
  /** Viewport size in CSS pixels; the image itself is captured at 2x for zooming. */
  screenshot: { width: number; height: number } | null
  /** Main-frame URLs in order: HTTP redirects, then script navigations. */
  navigations: string[]
  requests: { total: number; failed: number; blocked: number }
  hosts: SandboxHost[]
  passwordFields: number
  /** Where password forms submit, when that is a different site than the page. */
  externalFormTargets: string[]
  tookMs: number
}

export type SourceKey =
  | "virustotal"
  | "abuse"
  | "threatFeed"
  | "dns"
  | "registration"
  | "network"
  | "geo"
  | "certificates"
  | "exposure"
  | "live"
  | "sandbox"
  | "urlscan"

export type SignalSeverity = "critical" | "high" | "medium" | "low" | "info"

export type Signal = {
  severity: SignalSeverity
  title: string
  /** The evidence: what was observed. */
  detail?: string
  /** Why it matters to an analyst. Absent on reports saved before explanations existed. */
  why?: string
  source?: SourceKey
}

export type Verdict = "malicious" | "suspicious" | "no_known_threats" | "inconclusive"

export type InvestigationReport = {
  target: { input: string; kind: TargetKind; value: string; host: string }
  dns: SourceResult<DnsRecords>
  registration: SourceResult<Registration>
  network: SourceResult<NetworkInfo[]>
  certificates: SourceResult<CertificateInfo>
  live: SourceResult<LiveCheck>
  threatFeed: SourceResult<ThreatFeedResult>
  urlscan: SourceResult<UrlscanSubmission>
  // Added after the first reports were saved, so older reports lack them.
  exposure?: SourceResult<ExposureInfo[]>
  virustotal?: SourceResult<VirusTotalInfo>
  abuse?: SourceResult<AbuseInfo[]>
  geo?: SourceResult<GeoLocation[]>
  sandbox?: SourceResult<SandboxCapture>
  signals: Signal[]
  verdict: Verdict
  generatedAt: string
  tookMs: number
}
