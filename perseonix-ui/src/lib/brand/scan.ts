import "server-only"
import { isSelfOrSubdomain, registrableDomain, similarity, splitRegistrable } from "@/lib/brand/domain"
import { generatePermutations, type PermKind } from "@/lib/brand/permutations"
import { resolveDomain, resolveMany } from "@/lib/brand/sources/dns"
import { searchCertificates } from "@/lib/brand/sources/ct"

const PHISH_KEYWORDS = [
  "login", "secure", "account", "verify", "support", "help", "signin", "sign-in", "sso",
  "mail", "webmail", "portal", "update", "payment", "billing", "auth", "vpn",
  "wallet", "confirm", "recovery", "security",
]

const MAX_DNS = 300
const MAX_RESULTS = 60

export type FindingSource = "permutation" | "certificate" | "both"
export type Severity = "high" | "medium" | "low"

export type ScanFinding = {
  domain: string
  kind: PermKind | "ct"
  source: FindingSource
  resolves: boolean
  ips: string[]
  hasMx: boolean
  hasCert: boolean
  punycode: boolean
  keyword: string | null
  similarity: number
  score: number
  severity: Severity
  firstSeen: string | null
  issuer: string | null
}

export type ScanResult = {
  findings: ScanFinding[]
  stats: { screened: number; resolving: number; certs: number; ctHits: number }
}

function isPunycode(domain: string): boolean {
  return domain.split(".").some((p) => p.startsWith("xn--"))
}

// Only count phishing keywords that are ADDED to the brand (not substrings of
// the brand itself, e.g. "pay" inside "paypal").
function matchedKeyword(label: string, brand: string): string | null {
  const stripped = brand ? label.split(brand).join(" ") : label
  return PHISH_KEYWORDS.find((k) => stripped.includes(k)) ?? null
}

function severityFor(score: number): Severity {
  if (score >= 70) return "high"
  if (score >= 45) return "medium"
  return "low"
}

export async function runScan(protectedInput: string): Promise<ScanResult> {
  const protectedDomain = registrableDomain(protectedInput)
  const { label: brand } = splitRegistrable(protectedDomain)

  // 1) Candidate universe: permutations + CT hits (reduced to registrable).
  type Row = { domain: string; kind: PermKind | "ct"; fromPerm: boolean; fromCt: boolean; firstSeen: Date | null; issuer: string | null }
  const rows = new Map<string, Row>()

  for (const c of generatePermutations(protectedDomain)) {
    rows.set(c.domain, { domain: c.domain, kind: c.kind, fromPerm: true, fromCt: false, firstSeen: null, issuer: null })
  }

  const ct = await searchCertificates(brand)
  let ctHits = 0
  for (const hit of ct.values()) {
    const reg = registrableDomain(hit.domain)
    if (isSelfOrSubdomain(reg, protectedDomain) || reg === protectedDomain) continue
    const { label } = splitRegistrable(reg)
    // Keep CT domains that plausibly imitate the brand (precision gate #1).
    const sim = similarity(label, brand)
    const looksLike = label.includes(brand) || sim >= 0.6 || isPunycode(reg)
    if (!looksLike) continue
    ctHits++
    const existing = rows.get(reg)
    if (existing) {
      existing.fromCt = true
      existing.firstSeen = hit.firstSeen
      existing.issuer = hit.issuer
    } else {
      rows.set(reg, { domain: reg, kind: "ct", fromPerm: false, fromCt: true, firstSeen: hit.firstSeen, issuer: hit.issuer })
    }
  }

  // Drop self / protected domain from the universe.
  for (const key of [...rows.keys()]) {
    if (isSelfOrSubdomain(key, protectedDomain) || key === protectedDomain) rows.delete(key)
  }

  // 2) Resolve DNS for the universe (bounded) + the protected domain's own IPs,
  //    so we can suppress the brand's own legitimate properties (same infra).
  const universe = [...rows.keys()].slice(0, MAX_DNS)
  const [dns, ownSelf] = await Promise.all([resolveMany(universe), resolveDomain(protectedDomain)])
  const ownedIps = new Set(ownSelf.ips)

  // 3) Score + precision gate.
  const findings: ScanFinding[] = []
  let resolving = 0
  let certs = 0

  for (const domain of universe) {
    const row = rows.get(domain)!
    const d = dns.get(domain) ?? { resolves: false, ips: [], hasMx: false }
    const { label } = splitRegistrable(domain)
    const sim = similarity(label, brand)
    const puny = isPunycode(domain)
    const keyword = matchedKeyword(label, brand)
    const hasCert = row.fromCt
    if (d.resolves) resolving++
    if (hasCert) certs++

    // Suppress the brand's OWN properties: an exact-label variant resolving to
    // the same infrastructure is almost certainly owned by the customer.
    const sharesOwnIp = d.ips.some((ip) => ownedIps.has(ip))
    if (sharesOwnIp && sim >= 1 && !keyword) continue

    const exactLabel = sim >= 1 // same label, different TLD (often brand-owned)

    // Precision gate — only genuinely suspicious candidates become findings.
    const strong =
      puny ||
      (Boolean(keyword) && (d.resolves || hasCert)) ||
      (!exactLabel && d.resolves && sim >= 0.6) ||
      (!exactLabel && d.hasMx && sim >= 0.6) ||
      (!exactLabel && hasCert && sim >= 0.72) ||
      (exactLabel && (d.resolves || hasCert) && !sharesOwnIp)
    if (!strong) continue

    let score = 0
    score += d.resolves ? 22 : 0
    score += d.hasMx ? 18 : 0
    score += hasCert ? 16 : 0
    score += puny ? 22 : 0
    score += keyword ? 16 : 0
    score += row.kind === "homoglyph" ? 12 : 0
    // Reward close-but-not-identical (real typos) over exact-label TLD variants.
    score += exactLabel ? 6 : Math.round(30 * sim)
    score = Math.min(100, score)
    if (score < 35) continue

    findings.push({
      domain,
      kind: row.kind,
      source: row.fromPerm && row.fromCt ? "both" : row.fromCt ? "certificate" : "permutation",
      resolves: d.resolves,
      ips: d.ips.slice(0, 4),
      hasMx: d.hasMx,
      hasCert,
      punycode: puny,
      keyword,
      similarity: Math.round(sim * 100) / 100,
      score,
      severity: severityFor(score),
      firstSeen: row.firstSeen ? row.firstSeen.toISOString() : null,
      issuer: row.issuer,
    })
  }

  findings.sort((a, b) => b.score - a.score)

  return {
    findings: findings.slice(0, MAX_RESULTS),
    stats: { screened: universe.length, resolving, certs, ctHits },
  }
}
