import "server-only"
import { SOURCE_USER_AGENT } from "@/lib/investigate/sources/http"
import { envLimit, remember, reserve } from "@/lib/investigate/sources/quota"
import { connectorActive, connectorKey } from "@/lib/connectors/service"
import type { AbuseInfo } from "@/lib/investigate/types"

// Optional provider: AbuseIPDB crowd-sourced abuse reports. Requires ABUSEIPDB_API_KEY.
const API = "https://api.abuseipdb.com/api/v2/check"
const CACHE_MS = 60 * 60_000
const MAX_AGE_DAYS = 90
const MAX_RECENT = 8
const MAX_CATEGORIES = 8

// https://www.abuseipdb.com/categories
const CATEGORIES: Record<number, string> = {
  1: "DNS compromise",
  2: "DNS poisoning",
  3: "Fraud orders",
  4: "DDoS attack",
  5: "FTP brute-force",
  6: "Ping of death",
  7: "Phishing",
  8: "Fraud VoIP",
  9: "Open proxy",
  10: "Web spam",
  11: "Email spam",
  12: "Blog spam",
  13: "VPN IP",
  14: "Port scan",
  15: "Hacking",
  16: "SQL injection",
  17: "Spoofing",
  18: "Brute-force",
  19: "Bad web bot",
  20: "Exploited host",
  21: "Web app attack",
  22: "SSH",
  23: "IoT targeted",
}

const categoryName = (id: number) => CATEGORIES[id] ?? `Category ${id}`

function apiKey() {
  return connectorKey("abuseipdb")
}

export function abuseipdbEnabled() {
  return connectorActive("abuseipdb")
}

type RawReport = { reportedAt?: string; categories?: number[]; reporterCountryCode?: string | null }

type RawCheck = {
  abuseConfidenceScore?: number
  totalReports?: number
  numDistinctUsers?: number
  lastReportedAt?: string | null
  usageType?: string | null
  isp?: string | null
  domain?: string | null
  hostnames?: string[]
  countryCode?: string | null
  isTor?: boolean
  isWhitelisted?: boolean | null
  reports?: RawReport[]
}

export function lookupAbuse(ip: string): Promise<AbuseInfo> {
  return remember(`abuseipdb:${ip}`, CACHE_MS, async () => {
    const key = apiKey()
    if (!key) throw new Error("AbuseIPDB is not configured.")
    if (reserve("abuseipdb", { perDay: envLimit("ABUSEIPDB_DAILY_LIMIT", 1000) })) {
      throw new Error("AbuseIPDB's daily lookup quota is used up. It resets at 00:00 UTC.")
    }

    // `verbose` is a bare flag that adds the individual reports.
    const response = await fetch(
      `${API}?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=${MAX_AGE_DAYS}&verbose`,
      {
        headers: { key, accept: "application/json", "user-agent": SOURCE_USER_AGENT },
        signal: AbortSignal.timeout(10_000),
      }
    )
    if (response.status === 401 || response.status === 403) throw new Error("AbuseIPDB rejected the API key.")
    if (response.status === 429) throw new Error("AbuseIPDB's quota was reached. Try again later.")
    if (response.status === 422) throw new Error("AbuseIPDB couldn't check this address.")
    if (!response.ok) throw new Error(`AbuseIPDB responded with HTTP ${response.status}.`)

    const { data } = (await response.json()) as { data?: RawCheck }
    if (!data) throw new Error("AbuseIPDB returned an unexpected response.")

    const reports = [...(data.reports ?? [])].sort(
      (a, b) => Date.parse(b.reportedAt ?? "") - Date.parse(a.reportedAt ?? "")
    )
    const counts = new Map<number, number>()
    for (const report of reports) {
      for (const id of new Set(report.categories ?? [])) counts.set(id, (counts.get(id) ?? 0) + 1)
    }

    return {
      ip,
      score: data.abuseConfidenceScore ?? 0,
      totalReports: data.totalReports ?? 0,
      distinctReporters: data.numDistinctUsers ?? 0,
      lastReportedAt: data.lastReportedAt ?? undefined,
      usageType: data.usageType ?? undefined,
      isp: data.isp ?? undefined,
      domain: data.domain ?? undefined,
      hostnames: (data.hostnames ?? []).slice(0, 10),
      countryCode: data.countryCode ?? undefined,
      isTor: Boolean(data.isTor),
      isWhitelisted: Boolean(data.isWhitelisted),
      categories: [...counts]
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_CATEGORIES)
        .map(([id, count]) => ({ name: categoryName(id), count })),
      sampled: reports.length,
      // Reporter comments are free text from third parties (and can name other
      // victims), so only dates, categories and countries are kept.
      recent: reports.slice(0, MAX_RECENT).map((report) => ({
        reportedAt: report.reportedAt ?? "",
        categories: (report.categories ?? []).map(categoryName),
        reporterCountry: report.reporterCountryCode ?? undefined,
      })),
      permalink: `https://www.abuseipdb.com/check/${encodeURIComponent(ip)}`,
    }
  })
}
