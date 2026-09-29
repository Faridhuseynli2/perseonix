import "server-only"
import { loadConnectorRuntime } from "@/lib/connectors/service"
import { parseTarget, type Target } from "@/lib/investigate/target"
import { lookupAbuse, abuseipdbEnabled } from "@/lib/investigate/sources/abuseipdb"
import { lookupCertificates } from "@/lib/investigate/sources/certificates"
import { lookupDns } from "@/lib/investigate/sources/dns"
import { lookupGeo } from "@/lib/investigate/sources/geo"
import { lookupNetwork } from "@/lib/investigate/sources/network"
import { lookupRegistration } from "@/lib/investigate/sources/rdap"
import { lookupExposure, shodanEnabled } from "@/lib/investigate/sources/shodan"
import { lookupThreatFeed, threatFeedEnabled } from "@/lib/investigate/sources/urlhaus"

// ── Graph model ──────────────────────────────────────────────────────────────
// A link-analysis graph for infrastructure pivoting. Every node has a stable id
// ("<kind>:<value>") so the client can dedupe as the analyst expands outward.

export type GNodeKind =
  | "domain"
  | "ip"
  | "asn"
  | "cert"
  | "service"
  | "cve"
  | "malware"
  | "verdict"
  | "registrar"

export type GNode = {
  id: string
  kind: GNodeKind
  label: string
  sub?: string // secondary line (org, issuer, country…)
  value: string // the raw value used to expand (host/ip/…)
  expandable: boolean
  danger?: boolean // render as a threat (malicious verdict / vuln)
  meta?: Record<string, unknown>
}

export type GEdge = { source: string; target: string; label?: string }
export type GraphFragment = { nodes: GNode[]; edges: GEdge[] }

const node = (n: GNode): GNode => n
const MAX_FANOUT = 14 // keep each expansion legible

function dedupe(frag: GraphFragment): GraphFragment {
  const nodes = new Map<string, GNode>()
  for (const n of frag.nodes) if (!nodes.has(n.id)) nodes.set(n.id, n)
  const seen = new Set<string>()
  const edges: GEdge[] = []
  for (const e of frag.edges) {
    const k = `${e.source}->${e.target}:${e.label ?? ""}`
    if (e.source !== e.target && !seen.has(k)) {
      seen.add(k)
      edges.push(e)
    }
  }
  return { nodes: [...nodes.values()], edges }
}

const domainId = (d: string) => `domain:${d.toLowerCase()}`
const ipId = (ip: string) => `ip:${ip}`

/** First-degree neighbours of a domain. */
async function expandDomain(host: string): Promise<GraphFragment> {
  const self = domainId(host)
  const nodes: GNode[] = []
  const edges: GEdge[] = []

  await loadConnectorRuntime()
  const [dns, certs, reg, feed] = await Promise.allSettled([
    lookupDns(host),
    lookupCertificates(host),
    lookupRegistration(host),
    threatFeedEnabled() ? lookupThreatFeed({ input: host, kind: "domain", value: host, host } as Target) : Promise.resolve(null),
  ])

  if (dns.status === "fulfilled" && dns.value) {
    for (const ip of [...dns.value.a, ...dns.value.aaaa].slice(0, MAX_FANOUT)) {
      nodes.push(node({ id: ipId(ip), kind: "ip", label: ip, value: ip, expandable: true }))
      edges.push({ source: self, target: ipId(ip), label: "resolves" })
    }
    for (const ns of dns.value.ns.slice(0, 4)) {
      const d = ns.replace(/\.$/, "")
      nodes.push(node({ id: domainId(d), kind: "domain", label: d, sub: "nameserver", value: d, expandable: true }))
      edges.push({ source: self, target: domainId(d), label: "NS" })
    }
    for (const mx of dns.value.mx.slice(0, 3)) {
      const d = mx.exchange.replace(/\.$/, "")
      nodes.push(node({ id: domainId(d), kind: "domain", label: d, sub: "mail server", value: d, expandable: true }))
      edges.push({ source: self, target: domainId(d), label: "MX" })
    }
  }

  if (certs.status === "fulfilled" && certs.value) {
    const rel = certs.value.subdomains.filter((s) => s.toLowerCase() !== host.toLowerCase()).slice(0, MAX_FANOUT)
    for (const s of rel) {
      nodes.push(node({ id: domainId(s), kind: "domain", label: s, sub: "same certificate", value: s, expandable: true }))
      edges.push({ source: self, target: domainId(s), label: "cert" })
    }
    const c = certs.value.certificates[0]
    if (c) {
      const id = `cert:${host.toLowerCase()}`
      nodes.push(node({ id, kind: "cert", label: c.commonName || host, sub: `issuer: ${c.issuer}`, value: c.commonName, expandable: false, meta: { notBefore: c.notBefore, notAfter: c.notAfter, names: c.dnsNames?.slice(0, 20) } }))
      edges.push({ source: self, target: id, label: "TLS" })
    }
  }

  if (reg.status === "fulfilled" && reg.value?.registrar) {
    const id = `registrar:${reg.value.registrar.toLowerCase()}`
    nodes.push(node({ id, kind: "registrar", label: reg.value.registrar, sub: "registrar", value: reg.value.registrar, expandable: false, meta: { createdAt: reg.value.createdAt, expiresAt: reg.value.expiresAt } }))
    edges.push({ source: self, target: id, label: "registered by" })
  }

  if (feed.status === "fulfilled" && feed.value?.listed) {
    const id = `verdict:urlhaus:${host}`
    nodes.push(node({ id, kind: "verdict", label: feed.value.active ? "Serving malware" : "Malware history", sub: "abuse.ch URLhaus", value: host, expandable: false, danger: true, meta: { urlCount: feed.value.urlCount } }))
    edges.push({ source: self, target: id, label: "flagged" })
  }

  return dedupe({ nodes, edges })
}

/** First-degree neighbours of an IP. */
async function expandIp(ip: string): Promise<GraphFragment> {
  const self = ipId(ip)
  const nodes: GNode[] = []
  const edges: GEdge[] = []

  await loadConnectorRuntime()
  const [net, geo, exposure, abuse] = await Promise.allSettled([
    lookupNetwork(ip),
    lookupGeo(ip),
    shodanEnabled() ? lookupExposure(ip) : Promise.resolve(null),
    abuseipdbEnabled() ? lookupAbuse(ip) : Promise.resolve(null),
  ])

  if (net.status === "fulfilled" && net.value) {
    const n = net.value
    if (n.asn) {
      const id = `asn:${n.asn}`
      nodes.push(node({ id, kind: "asn", label: `AS${n.asn}`, sub: n.asName ?? n.owner ?? undefined, value: String(n.asn), expandable: false, meta: { owner: n.owner, prefix: n.prefix, country: n.country } }))
      edges.push({ source: self, target: id, label: "hosted on" })
    }
    for (const h of n.reverseDns.slice(0, 6)) {
      const d = h.replace(/\.$/, "")
      nodes.push(node({ id: domainId(d), kind: "domain", label: d, sub: "reverse DNS", value: d, expandable: true }))
      edges.push({ source: self, target: domainId(d), label: "PTR" })
    }
  }

  if (exposure.status === "fulfilled" && exposure.value) {
    const e = exposure.value
    for (const p of e.ports.slice(0, MAX_FANOUT)) {
      const id = `service:${ip}:${p}`
      const svc = e.services.find((s) => (s as { port?: number }).port === p) as { product?: string; transport?: string } | undefined
      nodes.push(node({ id, kind: "service", label: `${p}${svc?.transport ? "/" + svc.transport : ""}`, sub: svc?.product ?? "open port", value: String(p), expandable: false, meta: { product: svc?.product } }))
      edges.push({ source: self, target: id, label: "exposes" })
    }
    for (const v of e.vulns.slice(0, 8)) {
      const id = `cve:${v}`
      nodes.push(node({ id, kind: "cve", label: v, sub: "Shodan-inferred", value: v, expandable: false, danger: true }))
      edges.push({ source: self, target: id, label: "vulnerable" })
    }
    for (const h of e.hostnames.slice(0, 6)) {
      const d = h.replace(/\.$/, "")
      nodes.push(node({ id: domainId(d), kind: "domain", label: d, sub: "Shodan hostname", value: d, expandable: true }))
      edges.push({ source: self, target: domainId(d), label: "hostname" })
    }
  }

  if (abuse.status === "fulfilled" && abuse.value) {
    const a = abuse.value as unknown as { abuseConfidenceScore?: number; totalReports?: number }
    if ((a.abuseConfidenceScore ?? 0) >= 25) {
      const id = `verdict:abuseipdb:${ip}`
      nodes.push(node({ id, kind: "verdict", label: `Abuse ${a.abuseConfidenceScore}%`, sub: `AbuseIPDB · ${a.totalReports ?? 0} reports`, value: ip, expandable: false, danger: true }))
      edges.push({ source: self, target: id, label: "reported" })
    }
  }

  // Stamp geo/org onto the ip node's meta via a returned self-node (client merges).
  if (geo.status === "fulfilled" && geo.value) {
    const loc = [geo.value.city, geo.value.countryCode].filter(Boolean).join(", ")
    nodes.push(node({ id: self, kind: "ip", label: ip, value: ip, expandable: true, sub: loc || undefined, meta: { country: geo.value.countryCode, city: geo.value.city } }))
  }

  return dedupe({ nodes, edges })
}

/** Expand one node into its neighbours (the pivot action). */
export async function expandGraphNode(kind: string, value: string): Promise<GraphFragment> {
  if (kind === "ip") return expandIp(value)
  if (kind === "domain") return expandDomain(value)
  return { nodes: [], edges: [] }
}

/** Build the initial graph from a raw indicator (domain / ip / url). */
export async function buildGraph(raw: string): Promise<{ rootId: string; fragment: GraphFragment; kind: string }> {
  const target = parseTarget(raw)
  const isIp = target.kind === "ip"
  const rootId = isIp ? ipId(target.host) : domainId(target.host)
  const root = node({
    id: rootId,
    kind: isIp ? "ip" : "domain",
    label: target.host,
    value: target.host,
    expandable: true,
    meta: { root: true },
  })
  const frag = isIp ? await expandIp(target.host) : await expandDomain(target.host)
  return { rootId, kind: root.kind, fragment: dedupe({ nodes: [root, ...frag.nodes], edges: frag.edges }) }
}
