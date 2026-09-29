import "server-only"

// abuse.ch Feodo Tracker — active botnet C2 servers (Emotet, QakBot, Dridex,
// IcedID, BumbleBee…). Free, no API key. Exactly the "malware C2" the analyst
// wants, with attribution + ASN + geo already attached.

export type C2Endpoint = {
  ip: string
  port: number
  software: string
  softwareName: string
  category: string | null
  malware: string | null
  tags: string[]
  country: string | null
  asn: number | null
  asName: string | null
  hostname: string | null
  risk: string
  source: string
  status: string
  firstSeen: string | null
  lastSeen: string | null
}

type FeodoRow = {
  ip_address?: string
  port?: number
  status?: string
  hostname?: string | null
  as_number?: number | null
  as_name?: string | null
  country?: string | null
  first_seen?: string | null
  last_online?: string | null
  malware?: string | null
}

const FEODO_URL = "https://feodotracker.abuse.ch/downloads/ipblocklist.json"

const softwareKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")

function toIso(v?: string | null): string | null {
  if (!v) return null
  const d = new Date(v.includes(" ") ? v.replace(" ", "T") + "Z" : v + "T00:00:00Z")
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export async function fetchFeodo(): Promise<C2Endpoint[]> {
  const res = await fetch(FEODO_URL, {
    headers: { "user-agent": "Perseonix-Corvael-Talon/1.0" },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`Feodo Tracker responded with HTTP ${res.status}.`)
  const rows = (await res.json()) as FeodoRow[]
  if (!Array.isArray(rows)) return []

  return rows
    .filter((r) => r.ip_address && r.port && r.malware)
    .map<C2Endpoint>((r) => {
      const fam = r.malware!.trim()
      return {
        ip: r.ip_address!,
        port: r.port!,
        software: softwareKey(fam),
        softwareName: fam,
        category: "Botnet",
        malware: fam,
        tags: ["Windows"],
        country: r.country ?? null,
        asn: r.as_number ?? null,
        asName: r.as_name ?? null,
        hostname: r.hostname ?? null,
        risk: r.status === "online" ? "high" : "medium",
        source: "feodo",
        status: r.status === "online" ? "online" : "offline",
        firstSeen: toIso(r.first_seen),
        lastSeen: toIso(r.last_online),
      }
    })
}
