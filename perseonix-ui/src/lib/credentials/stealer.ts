import "server-only"

// Infostealer (stealer-log) exposure for a domain, via Hudson Rock's free
// Cavalier OSINT endpoint. No key required; intended for checking a domain you
// own. Returns how many staff / customer / third-party credentials were found
// in infostealer logs — the "device was infected with malware" signal that
// SpyCloud, SOCRadar and Recorded Future sell. NOTE: confirm Hudson Rock's
// terms before using this in a paid product (see intel-source-licensing memory).

export type StealerApp = { url: string; type: string; occurrence: number }

export type StealerResult =
  | {
      status: "ok"
      total: number
      employees: number
      users: number
      thirdParties: number
      lastEmployee: string | null
      lastUser: string | null
      apps: StealerApp[]
      globalStealers: number
    }
  | { status: "error" }

const epochish = (d: unknown): string | null => {
  const s = typeof d === "string" ? d : ""
  if (!s || s.startsWith("1970")) return null
  const t = new Date(s)
  return Number.isNaN(t.getTime()) ? null : s
}

export async function checkDomainStealer(domain: string): Promise<StealerResult> {
  const url = `https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-domain?domain=${encodeURIComponent(
    domain
  )}`
  let res: Response
  try {
    res = await fetch(url, {
      headers: { "user-agent": "Perseonix-Credential-Exposure", accept: "application/json" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    })
  } catch {
    return { status: "error" }
  }
  if (!res.ok) return { status: "error" }

  try {
    const d = (await res.json()) as Record<string, unknown>
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0)
    const rawApps = (((d.data as Record<string, unknown>)?.all_urls as unknown[]) ?? []) as Record<
      string,
      unknown
    >[]
    const apps: StealerApp[] = rawApps
      .map((a) => ({
        url: String(a.url ?? ""),
        type: String(a.type ?? ""),
        occurrence: num(a.occurrence),
      }))
      .filter((a) => a.url)
      .slice(0, 10)
    return {
      status: "ok",
      total: num(d.total),
      employees: num(d.employees),
      users: num(d.users),
      thirdParties: num(d.third_parties),
      lastEmployee: epochish(d.last_employee_compromised),
      lastUser: epochish(d.last_user_compromised),
      apps,
      globalStealers: num(d.totalStealers),
    }
  } catch {
    return { status: "error" }
  }
}
