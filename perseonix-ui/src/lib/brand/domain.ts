// Pure domain helpers for the Brand Protection engine: registrable-domain
// extraction (public-suffix aware, pragmatic set), edit distance and similarity.
// No external data — deterministic and testable.

// Common multi-label public suffixes so "acme.co.uk" → registrable "acme.co.uk".
const MULTI_TLD = new Set([
  "co.uk", "org.uk", "gov.uk", "ac.uk", "me.uk", "ltd.uk", "plc.uk",
  "co.jp", "or.jp", "ne.jp", "go.jp", "ac.jp",
  "com.au", "net.au", "org.au", "gov.au", "edu.au",
  "com.tr", "org.tr", "net.tr", "gov.tr", "edu.tr",
  "com.br", "com.cn", "com.mx", "com.ar", "com.sg", "com.hk", "com.tw",
  "com.sa", "com.eg", "com.ua", "com.ph", "com.my", "com.vn", "com.pk",
  "co.in", "co.kr", "co.za", "co.nz", "co.il", "co.id", "co.th",
  "gov.in", "ac.in", "org.in",
])

export function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase()
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "")
  d = d.split("/")[0].split("?")[0].split("#")[0].split(":")[0]
  return d.replace(/\.+$/, "")
}

export function isValidDomain(d: string): boolean {
  return /^(?=.{1,253}$)([a-z0-9](-?[a-z0-9])*\.)+[a-z]{2,}$/.test(d)
}

/** "mail.acme.co.uk" → "acme.co.uk"; "shop.acme.com" → "acme.com". */
export function registrableDomain(domain: string): string {
  const d = normalizeDomain(domain)
  const parts = d.split(".")
  if (parts.length <= 2) return d
  const lastTwo = parts.slice(-2).join(".")
  if (MULTI_TLD.has(lastTwo)) return parts.slice(-3).join(".")
  return lastTwo
}

/** Split registrable domain into the label + suffix: "acme.co.uk" → ["acme","co.uk"]. */
export function splitRegistrable(domain: string): { label: string; tld: string } {
  const reg = registrableDomain(domain)
  const parts = reg.split(".")
  const lastTwo = parts.slice(-2).join(".")
  if (MULTI_TLD.has(lastTwo)) return { label: parts.slice(0, -2).join("."), tld: lastTwo }
  return { label: parts.slice(0, -1).join("."), tld: parts.slice(-1)[0] }
}

export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const prev = new Array(n + 1)
  const curr = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }
  return prev[n]
}

/** 0..1 similarity between two registrable-domain labels (1 = identical). */
export function similarity(a: string, b: string): number {
  if (!a.length && !b.length) return 1
  const dist = levenshtein(a, b)
  return 1 - dist / Math.max(a.length, b.length)
}

/** True when `candidate` is the protected domain itself or a subdomain of it. */
export function isSelfOrSubdomain(candidate: string, protectedDomain: string): boolean {
  const c = normalizeDomain(candidate)
  const p = normalizeDomain(protectedDomain)
  return c === p || c.endsWith(`.${p}`)
}
