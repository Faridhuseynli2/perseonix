import "server-only"
import { SOURCE_USER_AGENT } from "@/lib/investigate/sources/http"
import type { CertificateEntry, CertificateInfo } from "@/lib/investigate/types"

const MAX_CERTIFICATES = 10
const MAX_HOSTNAMES = 200

/** A provider answered but has nothing for this host — let the other provider try. */
class NoCertificates extends Error {}

type CertSpotterIssuance = {
  dns_names?: string[]
  issuer?: { friendly_name?: string; name?: string }
  not_before?: string
  not_after?: string
}

type CrtShEntry = {
  issuer_name?: string
  common_name?: string
  name_value?: string
  not_before?: string
  not_after?: string
}

/** "C=US, O=Let's Encrypt, CN=R11" → "Let's Encrypt" */
function organisationFromDn(dn?: string) {
  if (!dn) return undefined
  return /(?:^|,\s*)O=("?)([^,"]+)\1/.exec(dn)?.[2] ?? /(?:^|,\s*)CN=([^,]+)/.exec(dn)?.[1]
}

function toIso(value?: string) {
  if (!value) return ""
  // crt.sh omits the zone; its timestamps are UTC.
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`).toISOString()
}

function summarise(entries: CertificateEntry[], host: string, source: string): CertificateInfo {
  const newestFirst = [...entries].sort((a, b) => b.notBefore.localeCompare(a.notBefore))
  const hostnames = new Set<string>()
  for (const entry of entries) {
    for (const name of entry.dnsNames) {
      const clean = name.toLowerCase().replace(/^\*\./, "")
      if (clean === host || clean.endsWith(`.${host}`)) hostnames.add(clean)
    }
  }
  return {
    total: entries.length,
    certificates: newestFirst.slice(0, MAX_CERTIFICATES),
    subdomains: [...hostnames].sort().slice(0, MAX_HOSTNAMES),
    source,
  }
}

async function fromCertSpotter(host: string, signal: AbortSignal): Promise<CertificateInfo> {
  const url = new URL("https://api.certspotter.com/v1/issuances")
  url.searchParams.set("domain", host)
  url.searchParams.set("include_subdomains", "true")
  url.searchParams.append("expand", "dns_names")
  url.searchParams.append("expand", "issuer")

  const response = await fetch(url, {
    headers: { "user-agent": SOURCE_USER_AGENT },
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
  })
  if (!response.ok) throw new Error(`Cert Spotter responded with HTTP ${response.status}.`)
  const issuances = (await response.json()) as CertSpotterIssuance[]
  if (!Array.isArray(issuances)) throw new Error("Cert Spotter returned an unexpected response.")
  if (issuances.length === 0) throw new NoCertificates()

  const entries = issuances.map<CertificateEntry>((issuance) => ({
    commonName: issuance.dns_names?.[0] ?? host,
    issuer: issuance.issuer?.friendly_name ?? organisationFromDn(issuance.issuer?.name) ?? "Unknown",
    notBefore: toIso(issuance.not_before),
    notAfter: toIso(issuance.not_after),
    dnsNames: issuance.dns_names ?? [],
  }))
  return summarise(entries, host, "Cert Spotter")
}

async function fromCrtSh(host: string, signal: AbortSignal): Promise<CertificateInfo> {
  const url = new URL("https://crt.sh/")
  url.searchParams.set("q", host)
  url.searchParams.set("output", "json")
  url.searchParams.set("exclude", "expired")

  const response = await fetch(url, {
    headers: { "user-agent": SOURCE_USER_AGENT },
    signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]),
  })
  if (!response.ok) throw new Error(`crt.sh responded with HTTP ${response.status}.`)
  const rows = (await response.json()) as CrtShEntry[]
  if (!Array.isArray(rows)) throw new Error("crt.sh returned an unexpected response.")
  if (rows.length === 0) throw new NoCertificates()

  const entries = rows.map<CertificateEntry>((row) => ({
    commonName: row.common_name ?? host,
    issuer: organisationFromDn(row.issuer_name) ?? "Unknown",
    notBefore: toIso(row.not_before),
    notAfter: toIso(row.not_after),
    dnsNames: (row.name_value ?? "").split("\n").filter(Boolean),
  }))
  return summarise(entries, host, "crt.sh")
}

/**
 * Asks both public CT search services at once and keeps the first useful
 * answer: Cert Spotter is fast, crt.sh covers what Cert Spotter refuses.
 */
export async function lookupCertificates(host: string): Promise<CertificateInfo | null> {
  const controller = new AbortController()
  try {
    return await Promise.any([
      fromCertSpotter(host, controller.signal),
      fromCrtSh(host, controller.signal),
    ])
  } catch (error) {
    const failures = error instanceof AggregateError ? error.errors : [error]
    if (failures.every((failure) => failure instanceof NoCertificates)) return null
    throw new Error("Certificate transparency logs couldn't be reached.")
  } finally {
    // Cancel whichever request lost the race.
    controller.abort()
  }
}
