// Curated C2 / offensive-tooling catalog. Each entry maps a piece of software to
// a Shodan query used to (a) COUNT live endpoints (free — no query credits) and
// (b) SEARCH for actual IP:port endpoints (spends credits, done sparingly).
//
// Queries are editable hunting heuristics, not guarantees — Shodan returns real
// matches for whatever the query expresses. Tune per operator experience.

export type C2Risk = "critical" | "high" | "medium" | "low"

export type C2Def = {
  key: string
  name: string
  category: string
  tags: string[]
  risk: C2Risk
  /** Shodan query for count + search. */
  query: string
  /** Whether the scheduled job should also pull actual endpoints (search = credits). */
  search?: boolean
}

export const C2_CATALOG: C2Def[] = [
  // ── Post-exploitation / C2 frameworks ─────────────────────────────────────
  { key: "cobalt_strike", name: "Cobalt Strike", category: "C2 Framework", tags: ["Cross-platform"], risk: "critical", search: true,
    query: 'ssl.jarm:07d14d16d21d21d07c42d41d00041d24a458a375eef0c576d23a7bab9a9fb1' },
  { key: "metasploit", name: "Metasploit", category: "C2 Framework", tags: ["Cross-platform"], risk: "high", search: true,
    query: 'ssl:"MetasploitSelfSignedCA"' },
  { key: "sliver", name: "Sliver", category: "C2 Framework", tags: ["Cross-platform"], risk: "critical", search: true,
    query: 'ssl.jarm:3fd21b20d00000021c43d21b21b43d41226dd5c6cd6f2b7e5c1d3f0d6a5e9f' },
  { key: "mythic", name: "Mythic", category: "C2 Framework", tags: ["Cross-platform"], risk: "high",
    query: 'ssl.cert.subject.cn:"Mythic"' },
  { key: "havoc", name: "Havoc", category: "C2 Framework", tags: ["Windows"], risk: "high", search: true,
    query: 'http.html:"Havoc" http.component:"demon"' },
  { key: "brute_ratel", name: "Brute Ratel C4", category: "C2 Framework", tags: ["Windows"], risk: "critical",
    query: 'ssl.jarm:2ad2ad0002ad2ad22c42d42d000000faabb8fa2a80c5adf92e19f7e0dca2a9' },
  { key: "poshc2", name: "PoshC2", category: "C2 Framework", tags: ["Cross-platform"], risk: "high",
    query: 'ssl.cert.subject.cn:"P18055077"' },
  { key: "covenant", name: "Covenant", category: "C2 Framework", tags: ["Windows"], risk: "high",
    query: 'ssl.cert.subject.cn:"Covenant"' },
  { key: "deimos", name: "Deimos C2", category: "C2 Framework", tags: ["Cross-platform"], risk: "high",
    query: 'ssl.cert.subject.cn:"deimos"' },

  // ── RATs / stealers / loaders ─────────────────────────────────────────────
  { key: "asyncrat", name: "AsyncRAT", category: "RAT", tags: ["Windows"], risk: "high", search: true,
    query: 'ssl.cert.subject.cn:"AsyncRAT Server"' },
  { key: "quasar", name: "Quasar RAT", category: "RAT", tags: ["Windows"], risk: "high",
    query: 'ssl.cert.subject.cn:"Quasar Server CA"' },
  { key: "dcrat", name: "DcRat", category: "RAT", tags: ["Windows"], risk: "high",
    query: 'ssl.cert.subject.cn:"DcRat Server"' },
  { key: "vshell", name: "Vshell", category: "SSH / C2", tags: ["Windows", "Linux"], risk: "high", search: true,
    query: 'http.favicon.hash:1major_placeholder OR http.html:"vshell"' },
  { key: "xmrig", name: "XMRig Proxy", category: "Cryptominer", tags: ["Cross-platform"], risk: "medium",
    query: 'http.title:"XMRig Proxy"' },

  // ── Offensive / recon tooling analysts also hunt ──────────────────────────
  { key: "interactsh", name: "Interactsh", category: "OOB Interaction", tags: ["Cross-platform"], risk: "low",
    query: 'ssl.cert.subject.cn:"*.oast."' },
  { key: "gophish", name: "Gophish", category: "Phishing Framework", tags: ["Cross-platform"], risk: "medium", search: true,
    query: 'http.favicon.hash:-1298131932' },
  { key: "evilginx", name: "Evilginx", category: "Phishing Proxy", tags: ["Cross-platform"], risk: "high",
    query: 'ssl.cert.subject.cn:"evilginx"' },
  { key: "acunetix", name: "Acunetix", category: "Vulnerability Scanner", tags: ["Cross-platform"], risk: "low",
    query: 'http.favicon.hash:-1274849009' },
  { key: "burp", name: "Burp Suite Collaborator", category: "Recon Tool", tags: ["Cross-platform"], risk: "low",
    query: 'ssl.cert.subject.cn:"*.burpcollaborator.net"' },

  // ── TDS / RMM abused for C2 ───────────────────────────────────────────────
  { key: "keitaro", name: "Keitaro TDS", category: "Traffic Distribution System", tags: ["Cross-platform"], risk: "medium",
    query: 'http.component:"keitaro"' },
  { key: "tactical_rmm", name: "Tactical RMM", category: "Remote Management Tool", tags: ["Windows"], risk: "medium",
    query: 'http.title:"Tactical RMM"' },
]

export const C2_BY_KEY = new Map(C2_CATALOG.map((c) => [c.key, c]))

export const RISK_RANK: Record<C2Risk, number> = { critical: 0, high: 1, medium: 2, low: 3 }

// Stable colours for the stacked "Active C2 Servers" chart + badges.
export const C2_COLORS = [
  "#ff4d5e", "#ff8a3d", "#ffb400", "#00b5fa", "#128eec", "#a56aff",
  "#6ee7b7", "#ff5fd1", "#f59e0b", "#3b82f6", "#94a3b8", "#e0f2fe",
]

export function colorForSoftware(key: string): string {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return C2_COLORS[h % C2_COLORS.length]
}
