import "server-only"
import { connectorKey, loadConnectorRuntime } from "@/lib/connectors/service"

export type Breach = {
  name: string
  title: string
  domain: string
  breachDate: string
  addedDate: string
  pwnCount: number
  dataClasses: string[]
  isVerified: boolean
}

export type EmailCheckResult =
  | { status: "found"; breaches: Breach[] }
  | { status: "clean" }
  | { status: "no_key" }
  | { status: "bad_key" }
  | { status: "rate_limited"; retryAfter?: number }
  | { status: "error" }

// Basic RFC-ish email shape; HIBP itself is the final validator.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value) && value.length <= 254
}

export function normalizeDomain(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("@").pop()!
}

export function isDomain(value: string): boolean {
  return DOMAIN_RE.test(value) && value.length <= 253
}

type BreachMeta = { title: string; date: string; dataClasses: string[]; pwnCount: number }
let breachCatalog: Map<string, BreachMeta> | null = null

/** All HIBP breaches (name → metadata). Free, no key; cached per process. */
async function getBreachCatalog(): Promise<Map<string, BreachMeta>> {
  if (breachCatalog) return breachCatalog
  const map = new Map<string, BreachMeta>()
  try {
    const res = await fetch("https://haveibeenpwned.com/api/v3/breaches", {
      headers: { "user-agent": "Perseonix-Credential-Exposure", accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    })
    if (res.ok) {
      const raw = (await res.json()) as Array<Record<string, unknown>>
      for (const b of raw) {
        map.set(String(b.Name), {
          title: String(b.Title ?? b.Name),
          date: String(b.BreachDate ?? ""),
          dataClasses: Array.isArray(b.DataClasses) ? (b.DataClasses as string[]) : [],
          pwnCount: Number(b.PwnCount ?? 0),
        })
      }
      breachCatalog = map
    }
  } catch {
    /* fall through with empty map */
  }
  return map
}

export type DomainBreach = {
  name: string
  title: string
  date: string
  accountCount: number
  hasPasswords: boolean
  dataClasses: string[]
}
export type DomainSampleAccount = { alias: string; breachCount: number; hasPassword: boolean }

export type DomainBreachResult =
  | {
      status: "found"
      accounts: number
      accountsWithPasswords: number
      totalExposures: number
      breaches: DomainBreach[]
      sample: DomainSampleAccount[]
    }
  | { status: "clean" }
  | { status: "no_key" }
  | { status: "bad_key" }
  | { status: "not_verified" }
  | { status: "error" }

/**
 * All breached accounts on a domain, via HIBP's domain search. Requires a paid
 * HIBP key AND the domain to be verified in that HIBP account (403 otherwise).
 * This is the enterprise "every exposed employee" view.
 */
export async function checkDomainBreaches(domainRaw: string): Promise<DomainBreachResult> {
  const domain = normalizeDomain(domainRaw)
  if (!isDomain(domain)) return { status: "error" }

  await loadConnectorRuntime()
  const key = connectorKey("hibp")
  if (!key) return { status: "no_key" }

  let res: Response
  try {
    res = await fetch(
      `https://haveibeenpwned.com/api/v3/breacheddomain/${encodeURIComponent(domain)}`,
      {
        headers: {
          "hibp-api-key": key,
          "user-agent": "Perseonix-Credential-Exposure",
          accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      }
    )
  } catch {
    return { status: "error" }
  }

  if (res.status === 401) return { status: "bad_key" }
  if (res.status === 403) return { status: "not_verified" }
  if (res.status === 404) return { status: "clean" }
  if (!res.ok) return { status: "error" }

  let byAlias: Record<string, string[]>
  try {
    byAlias = (await res.json()) as Record<string, string[]>
  } catch {
    return { status: "error" }
  }
  const aliases = Object.keys(byAlias ?? {})
  if (aliases.length === 0) return { status: "clean" }

  const catalog = await getBreachCatalog()
  const hasPw = (names: string[]) =>
    names.some((n) => catalog.get(n)?.dataClasses.includes("Passwords"))

  let accountsWithPasswords = 0
  let totalExposures = 0
  const breachAgg = new Map<string, number>()
  for (const alias of aliases) {
    const names = byAlias[alias] ?? []
    totalExposures += names.length
    if (hasPw(names)) accountsWithPasswords++
    for (const n of names) breachAgg.set(n, (breachAgg.get(n) ?? 0) + 1)
  }

  const breaches: DomainBreach[] = Array.from(breachAgg.entries())
    .map(([name, accountCount]) => {
      const meta = catalog.get(name)
      return {
        name,
        title: meta?.title ?? name,
        date: meta?.date ?? "",
        accountCount,
        hasPasswords: meta?.dataClasses.includes("Passwords") ?? false,
        dataClasses: meta?.dataClasses ?? [],
      }
    })
    .sort((a, b) => b.accountCount - a.accountCount)
    .slice(0, 15)

  const sample: DomainSampleAccount[] = aliases
    .map((alias) => ({
      alias,
      breachCount: (byAlias[alias] ?? []).length,
      hasPassword: hasPw(byAlias[alias] ?? []),
    }))
    .sort((a, b) => Number(b.hasPassword) - Number(a.hasPassword) || b.breachCount - a.breachCount)
    .slice(0, 60)

  return {
    status: "found",
    accounts: aliases.length,
    accountsWithPasswords,
    totalExposures,
    breaches,
    sample,
  }
}

/**
 * Looks up an email address against Have I Been Pwned's breach corpus. Requires
 * a paid HIBP API key configured in Connectors (server-side only). Returns which
 * breaches an address appears in and what data classes leaked — never a
 * plaintext password (HIBP does not expose them, and neither do we).
 */
export async function checkEmailBreaches(emailRaw: string): Promise<EmailCheckResult> {
  const email = emailRaw.trim().toLowerCase()
  if (!isEmail(email)) return { status: "error" }

  await loadConnectorRuntime()
  const key = connectorKey("hibp")
  if (!key) return { status: "no_key" }

  const url = `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(
    email
  )}?truncateResponse=false`

  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        "hibp-api-key": key,
        "user-agent": "Perseonix-Credential-Exposure",
        accept: "application/json",
      },
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    })
  } catch {
    return { status: "error" }
  }

  if (res.status === 404) return { status: "clean" }
  if (res.status === 401 || res.status === 403) return { status: "bad_key" }
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("retry-after")) || undefined
    return { status: "rate_limited", retryAfter }
  }
  if (!res.ok) return { status: "error" }

  try {
    const raw = (await res.json()) as Array<Record<string, unknown>>
    const breaches: Breach[] = raw.map((b) => ({
      name: String(b.Name ?? ""),
      title: String(b.Title ?? b.Name ?? "Unknown"),
      domain: String(b.Domain ?? ""),
      breachDate: String(b.BreachDate ?? ""),
      addedDate: String(b.AddedDate ?? ""),
      pwnCount: Number(b.PwnCount ?? 0),
      dataClasses: Array.isArray(b.DataClasses) ? (b.DataClasses as string[]) : [],
      isVerified: Boolean(b.IsVerified),
    }))
    // Most recent breach first.
    breaches.sort((a, b) => (a.breachDate < b.breachDate ? 1 : -1))
    return breaches.length ? { status: "found", breaches } : { status: "clean" }
  } catch {
    return { status: "error" }
  }
}
