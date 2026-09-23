import "server-only"
import { normalizeDomain } from "@/lib/brand/domain"

// Certificate Transparency discovery via crt.sh (free, public infrastructure —
// no commercial-licensing constraint). Surfaces lookalike domains "in the wild"
// that carry a TLS certificate (as nearly all phishing sites do), including
// creative variants our permutation set won't enumerate.

const TIMEOUT_MS = 25_000
const USER_AGENT = "Perseonix-Corvael/1.0 (+https://perseonix.local)"

export type CtHit = { domain: string; firstSeen: Date | null; issuer: string | null }

/** Query crt.sh for certificates whose names contain the brand token. */
export async function searchCertificates(token: string): Promise<Map<string, CtHit>> {
  const hits = new Map<string, CtHit>()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const url = `https://crt.sh/?q=${encodeURIComponent(token)}&output=json`
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
    })
    if (!res.ok) return hits
    const rows = (await res.json()) as { name_value?: string; entry_timestamp?: string; issuer_name?: string }[]
    if (!Array.isArray(rows)) return hits

    for (const row of rows) {
      const names = String(row.name_value ?? "").split(/\n/)
      const ts = row.entry_timestamp ? new Date(row.entry_timestamp.replace(" ", "T")) : null
      const issuer = extractIssuer(row.issuer_name)
      for (const raw of names) {
        const name = normalizeDomain(raw.replace(/^\*\./, ""))
        if (!name || name.includes("*") || !name.includes(".")) continue
        const existing = hits.get(name)
        if (!existing) {
          hits.set(name, { domain: name, firstSeen: ts, issuer })
        } else if (ts && (!existing.firstSeen || ts < existing.firstSeen)) {
          existing.firstSeen = ts // keep the earliest sighting
        }
      }
    }
    return hits
  } catch {
    return hits // network/timeout → treat as no CT hits, don't fail the scan
  } finally {
    clearTimeout(timer)
  }
}

function extractIssuer(issuerName?: string): string | null {
  if (!issuerName) return null
  const m = issuerName.match(/O\s*=\s*"?([^",]+)"?/i)
  return m ? m[1].trim() : null
}
