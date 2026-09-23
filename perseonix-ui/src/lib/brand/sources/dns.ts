import "server-only"
import { Resolver } from "node:dns/promises"

// Lightweight DNS checks for candidate domains. A resolving typo-domain (and
// especially one with MX records) is a high-precision signal that it's a real,
// weaponizable lookalike rather than noise.

const TIMEOUT_MS = 3500

export type DnsResult = { resolves: boolean; ips: string[]; hasMx: boolean }

async function withTimeout<T>(p: Promise<T>, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), TIMEOUT_MS)
  })
  try {
    return await Promise.race([p, timeout])
  } finally {
    clearTimeout(timer!)
  }
}

export async function resolveDomain(domain: string): Promise<DnsResult> {
  const resolver = new Resolver({ timeout: TIMEOUT_MS, tries: 1 })
  const [ips, mx] = await Promise.all([
    withTimeout(resolver.resolve4(domain).catch(() => [] as string[]), []),
    withTimeout(resolver.resolveMx(domain).catch(() => [] as { exchange: string }[]), []),
  ])
  return { resolves: ips.length > 0, ips, hasMx: mx.length > 0 }
}

/** Resolve many domains with bounded concurrency. */
export async function resolveMany(
  domains: string[],
  concurrency = 24
): Promise<Map<string, DnsResult>> {
  const out = new Map<string, DnsResult>()
  let i = 0
  async function worker() {
    while (i < domains.length) {
      const d = domains[i++]
      out.set(d, await resolveDomain(d))
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, domains.length) }, worker))
  return out
}
