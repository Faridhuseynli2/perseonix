/**
 * Public marketing content for perseonix.com.
 *
 * PLACEHOLDER DATA: every figure, report, threat-actor codename and location
 * below is illustrative. Replace with verified numbers and published research
 * before launch.
 */

import {
  Activity,
  Boxes,
  Bug,
  Lock,
  Network,
  Radar,
  Server,
  type LucideIcon,
} from "lucide-react"

export const announcement = {
  tag: "PTRU",
  text: "H2 2026 Threat Landscape Report: ransomware access brokers pivot to edge appliances",
  href: "#research",
}

export const stats = [
  { value: "3.8B+", label: "Indicators indexed", detail: "IOCs, credentials & artefacts" },
  { value: "240+", label: "Adversary clusters tracked", detail: "State-aligned, eCrime & hacktivist" },
  { value: "1,600+", label: "Closed sources monitored", detail: "Markets, forums & channels" },
  { value: "24/7", label: "Analyst coverage", detail: "Follow-the-sun research desk" },
]

/** Perseonix Corvael currently ships a single module: Attack Surface Management. */
export const talosModule = {
  id: "attack-surface",
  icon: Network,
  title: "Attack Surface Management",
  summary:
    "Continuously discover, inventory and assess every internet-facing asset you own — including the ones nobody told security about.",
}

export type Capability = {
  icon: LucideIcon
  title: string
  body: string
  tags: string[]
}

export const asmCapabilities: Capability[] = [
  {
    icon: Radar,
    title: "Continuous asset discovery",
    body: "Domains, subdomains, IP ranges and cloud assets found automatically — starting from a single seed domain.",
    tags: ["Subdomains", "IP ranges", "ASN mapping"],
  },
  {
    icon: Server,
    title: "Exposed services",
    body: "Open ports, admin panels, remote-access gateways and databases reachable from the internet, fingerprinted and ranked.",
    tags: ["Open ports", "Admin panels", "RDP / SSH"],
  },
  {
    icon: Boxes,
    title: "Cloud & shadow IT",
    body: "Forgotten staging sites, public storage buckets and third-party hosted assets surfaced before attackers find them.",
    tags: ["Public buckets", "Staging sites", "SaaS sprawl"],
  },
  {
    icon: Bug,
    title: "Outdated & vulnerable software",
    body: "Software versions detected on your assets are matched to known CVEs and ranked by real-world exploitation.",
    tags: ["Version detection", "CVE matching", "Patch priority"],
  },
  {
    icon: Lock,
    title: "DNS & certificate hygiene",
    body: "Expiring or weak certificates, dangling DNS records and subdomain-takeover risks flagged as soon as they appear.",
    tags: ["TLS expiry", "Dangling DNS", "Takeover risk"],
  },
  {
    icon: Activity,
    title: "Exposure scoring & alerts",
    body: "Every change to your perimeter is scored and routed to the right owner — new asset, new port, new risk.",
    tags: ["Risk score", "Change alerts", "Asset ownership"],
  },
]

export const intelCycle = [
  {
    step: "01",
    title: "Collection",
    body: "Automated collection across the open, deep and dark web, combined with analyst-led access to closed communities.",
  },
  {
    step: "02",
    title: "Processing",
    body: "Signals are normalised, de-duplicated and enriched into STIX 2.1 objects with a confidence score attached.",
  },
  {
    step: "03",
    title: "Analysis",
    body: "Threat hunters validate, attribute and map every finding to MITRE ATT&CK and to your own asset inventory.",
  },
  {
    step: "04",
    title: "Dissemination",
    body: "Prioritised alerts, finished intelligence and machine-readable feeds are delivered where your team already works.",
  },
]

export const featuredReport = {
  type: "Threat Landscape Report",
  date: "2026-09-08",
  title: "Edge appliances are the new front door",
  summary:
    "How ransomware access brokers shifted from phishing to VPN and firewall exploitation in H2 2026 — and which sectors paid the price.",
  meta: ["42 pages", "118 IOCs", "31 ATT&CK techniques"],
}

export type ResearchItem = {
  type: string
  date: string
  title: string
  sector: string
  restricted?: boolean
}

export const researchItems: ResearchItem[] = [
  {
    type: "Advisory",
    date: "2026-09-11",
    title: "Obsidian Heron resumes credential-phishing waves against regional banks",
    sector: "Finance",
  },
  {
    type: "Flash report",
    date: "2026-09-02",
    title: "Typosquat cluster impersonates logistics carriers ahead of peak season",
    sector: "Logistics",
  },
  {
    type: "Actor profile",
    date: "2026-08-27",
    title: "Inside the affiliate programme behind Nightglass ransomware",
    sector: "Multi-sector",
    restricted: true,
  },
]

export type Adversary = {
  name: string
  id: string
  type: string
  targets: string
  activity: "High" | "Elevated" | "Moderate" | "Low"
  /** Portrait in /public/adversaries used on the marketing actor cards. */
  portrait?: string
}

export const adversaries: Adversary[] = [
  { name: "Obsidian Heron", id: "PX-APT-17", type: "State-aligned", targets: "Finance · Government", activity: "High", portrait: "/adversaries/warlord-amber.jpg" },
  { name: "Nightglass", id: "PX-RAN-42", type: "Ransomware-as-a-Service", targets: "Manufacturing · Healthcare", activity: "Elevated", portrait: "/adversaries/ghost-hacker.jpg" },
  { name: "Copper Lynx", id: "PX-ECR-08", type: "Initial access broker", targets: "Telecom · Energy", activity: "Moderate", portrait: "/adversaries/operative-bronze.jpg" },
  { name: "Pale Wren", id: "PX-HKT-23", type: "Hacktivist", targets: "Public sector", activity: "Low", portrait: "/adversaries/carbon-cowl.jpg" },
]

export type CoverageNode = { city: string; lat: number; lng: number; hub?: boolean }

export const coverageNodes: CoverageNode[] = [
  { city: "Istanbul", lat: 41.01, lng: 28.98, hub: true },
  { city: "Frankfurt", lat: 50.11, lng: 8.68 },
  { city: "Dubai", lat: 25.2, lng: 55.27, hub: true },
  { city: "Singapore", lat: 1.35, lng: 103.82, hub: true },
  { city: "Tokyo", lat: 35.68, lng: 139.69 },
  { city: "Sydney", lat: -33.87, lng: 151.21 },
  { city: "Johannesburg", lat: -26.2, lng: 28.05 },
  { city: "São Paulo", lat: -23.55, lng: -46.63 },
  { city: "Ashburn", lat: 39.04, lng: -77.49, hub: true },
  { city: "London", lat: 51.51, lng: -0.13 },
]

export const coverageFacts = [
  { value: "14", label: "Underground languages monitored" },
  { value: "38", label: "Countries with active collection" },
  { value: "<15 min", label: "Median critical-alert delivery" },
]

export const sectors = [
  "Banking & Finance",
  "Government & Defence",
  "Telecommunications",
  "Energy & Utilities",
  "Healthcare",
  "Retail & E-commerce",
  "Manufacturing",
  "Aviation & Logistics",
]

export const integrations = {
  standards: ["STIX 2.1", "TAXII 2.1", "MISP", "REST API", "Syslog / CEF", "Webhooks"],
  destinations: ["SIEM", "SOAR", "EDR / XDR", "Threat Intel Platforms", "Ticketing", "Email & Chat"],
}

export const team = [
  { value: "90+", label: "Threat hunters & researchers" },
  { value: "11 yrs", label: "Average analyst experience" },
  { value: "6", label: "Regional research desks" },
]

export const footerNav = [
  {
    title: "Platform",
    links: [
      { label: "Perseonix Corvael", href: "/#talos" },
      { label: "Attack Surface Management", href: "/#platform" },
      { label: "Integrations", href: "/#integrations" },
    ],
  },
  {
    title: "Research",
    links: [
      { label: "Threat Research Unit", href: "/#research" },
      { label: "Adversary tracking", href: "/#adversaries" },
      { label: "Global coverage", href: "/#coverage" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#about" },
      { label: "Login Portal", href: "/login" },
    ],
  },
]
