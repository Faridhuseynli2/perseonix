import "server-only"
import { hostForUrl, isPublicAddress } from "@/lib/investigate/address"
import { loadConnectorRuntime } from "@/lib/connectors/service"
import { SOURCE_ORDER } from "@/lib/investigate/meta"
import { capturePage, sandboxEnabled } from "@/lib/investigate/sandbox/capture"
import { evaluate } from "@/lib/investigate/signals"
import { abuseipdbEnabled, lookupAbuse } from "@/lib/investigate/sources/abuseipdb"
import { lookupCertificates } from "@/lib/investigate/sources/certificates"
import { lookupDns } from "@/lib/investigate/sources/dns"
import { lookupGeo } from "@/lib/investigate/sources/geo"
import { liveCheck } from "@/lib/investigate/sources/live"
import { lookupNetwork } from "@/lib/investigate/sources/network"
import { lookupRegistration } from "@/lib/investigate/sources/rdap"
import { lookupExposure, shodanEnabled } from "@/lib/investigate/sources/shodan"
import { lookupThreatFeed, threatFeedEnabled } from "@/lib/investigate/sources/urlhaus"
import { submitUrlscan, urlscanEnabled } from "@/lib/investigate/sources/urlscan"
import { lookupVirusTotal, virustotalEnabled } from "@/lib/investigate/sources/virustotal"
import type { Target } from "@/lib/investigate/target"
import type { InvestigationReport, SourceKey, SourceResult } from "@/lib/investigate/types"

const LIVE_BUDGET_MS = 25_000
const CAPTURE_BUDGET_MS = 35_000
const MAX_NETWORK_LOOKUPS = 3
const MAX_EXPOSURE_LOOKUPS = 2
const MAX_ABUSE_LOOKUPS = 2
const MAX_GEO_LOOKUPS = 3

function customerSafeMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") return "The source timed out."
    if (error.message === "fetch failed") return "The source couldn't be reached."
    return error.message
  }
  return "The lookup failed."
}

async function capture<T>(task: () => Promise<T | null>): Promise<SourceResult<T>> {
  const started = Date.now()
  try {
    const data = await task()
    return data === null
      ? { status: "empty", tookMs: Date.now() - started }
      : { status: "ok", data, tookMs: Date.now() - started }
  } catch (error) {
    return { status: "error", error: customerSafeMessage(error), tookMs: Date.now() - started }
  }
}

const skipped = <T>(reason: string): SourceResult<T> => ({ status: "skipped", error: reason })

function withBudget<T>(promise: Promise<T>, ms: number, message: string) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms)
    }),
  ]).finally(() => clearTimeout(timer))
}

/** What the sandbox browser opens: the exact URL, or https then http for bare hosts. */
function captureTargets(target: Target) {
  if (target.url) return [target.url]
  const host = hostForUrl(target.host)
  return [`https://${host}/`, `http://${host}/`]
}

export type InvestigationRun = {
  report: InvestigationReport
  /** The sandbox screenshot, stored outside the report. */
  screenshot: Buffer | null
}

/** Every source runs in parallel; one failing never blocks the others. */
export async function runInvestigation(target: Target): Promise<InvestigationRun> {
  const started = Date.now()
  // Load admin connector overrides so the *Enabled()/key resolvers are current.
  await loadConnectorRuntime()
  const isIp = target.kind === "ip"
  const artifacts: { screenshot: Buffer | null } = { screenshot: null }

  const dnsTask = isIp
    ? Promise.resolve(skipped<never>("Not applicable to IP addresses."))
    : capture(() => lookupDns(target.host))

  // Public IPs behind the target: the IP itself, or what its domain resolves to.
  const ipsTask = (async () => {
    if (isIp) return [target.host]
    const dns = await dnsTask
    return [...(dns.data?.a ?? []), ...(dns.data?.aaaa ?? [])].filter(isPublicAddress)
  })()

  const networkTask = (async () => {
    const ips = (await ipsTask).slice(0, MAX_NETWORK_LOOKUPS)
    if (ips.length === 0) return skipped<never>("The domain has no public A/AAAA records.")
    return capture(() => Promise.all(ips.map(lookupNetwork)))
  })()

  const exposureTask = (async () => {
    if (!shodanEnabled()) return skipped<never>("Not enabled.")
    const ips = (await ipsTask).slice(0, MAX_EXPOSURE_LOOKUPS)
    if (ips.length === 0) return skipped<never>("No public IP addresses to look up.")
    return capture(async () => {
      const hosts = (await Promise.all(ips.map(lookupExposure))).filter((host) => host !== null)
      return hosts.length > 0 ? hosts : null
    })
  })()

  const abuseTask = (async () => {
    if (!abuseipdbEnabled()) return skipped<never>("Not enabled.")
    const ips = (await ipsTask).slice(0, MAX_ABUSE_LOOKUPS)
    if (ips.length === 0) return skipped<never>("No public IP addresses to look up.")
    return capture(() => Promise.all(ips.map(lookupAbuse)))
  })()

  const geoTask = (async () => {
    const ips = (await ipsTask).slice(0, MAX_GEO_LOOKUPS)
    if (ips.length === 0) return skipped<never>("No public IP addresses to locate.")
    return capture(async () => {
      const located = (await Promise.all(ips.map(lookupGeo))).filter((location) => location !== null)
      return located.length > 0 ? located : null
    })
  })()

  const sandboxTask = sandboxEnabled()
    ? capture(async () => {
        const result = await withBudget(
          capturePage(captureTargets(target)),
          CAPTURE_BUDGET_MS,
          "The page capture took too long."
        )
        artifacts.screenshot = result.screenshot
        return result.data
      })
    : Promise.resolve(skipped<never>("Not enabled."))

  const [dns, registration, network, exposure, certificates, live, threatFeed, urlscan, virustotal, abuse, geo, sandbox] =
    await Promise.all([
      dnsTask,
      isIp ? skipped<never>("Not applicable to IP addresses.") : capture(() => lookupRegistration(target.host)),
      networkTask,
      exposureTask,
      isIp ? skipped<never>("Not applicable to IP addresses.") : capture(() => lookupCertificates(target.host)),
      capture(() => withBudget(liveCheck(target), LIVE_BUDGET_MS, "The live check took too long.")),
      threatFeedEnabled() ? capture(() => lookupThreatFeed(target)) : skipped<never>("Not enabled."),
      urlscanEnabled() && !isIp
        ? capture(() => submitUrlscan(target.url ?? `https://${target.host}/`))
        : skipped<never>("Not enabled."),
      virustotalEnabled() ? capture(() => lookupVirusTotal(target)) : skipped<never>("Not enabled."),
      abuseTask,
      geoTask,
      sandboxTask,
    ])

  const evidence = {
    target: { input: target.input, kind: target.kind, value: target.value, host: target.host },
    dns,
    registration,
    network,
    exposure,
    certificates,
    live,
    threatFeed,
    urlscan,
    virustotal,
    abuse,
    geo,
    sandbox,
  }
  return {
    report: {
      ...evidence,
      ...evaluate(evidence),
      generatedAt: new Date().toISOString(),
      tookMs: Date.now() - started,
    },
    screenshot: artifacts.screenshot,
  }
}

const OPTIONAL_SOURCES: Partial<Record<SourceKey, () => boolean>> = {
  virustotal: virustotalEnabled,
  abuse: abuseipdbEnabled,
  threatFeed: threatFeedEnabled,
  exposure: shodanEnabled,
  sandbox: sandboxEnabled,
  urlscan: urlscanEnabled,
}

/** Which sources are active, for the module's "Intelligence sources" panel. */
export async function investigationSources() {
  await loadConnectorRuntime()
  return SOURCE_ORDER.map((key) => ({ key, enabled: OPTIONAL_SOURCES[key]?.() ?? true }))
}
