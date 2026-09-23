import "server-only"
import type { CaaRecord, MxRecord, SoaRecord } from "node:dns"
import { Resolver } from "node:dns/promises"
import type { DnsRecords } from "@/lib/investigate/types"

// Public resolvers by default: an ISP or corporate resolver may sinkhole the
// very domains customers want to investigate.
function createResolver() {
  const resolver = new Resolver({ timeout: 3000, tries: 2 })
  const servers = (process.env.DNS_RESOLVERS ?? "1.1.1.1,8.8.8.8")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean)
  resolver.setServers(servers)
  return resolver
}

export const resolver = createResolver()

const NO_DATA = new Set(["ENODATA", "ENONAME", "ENOTFOUND"])

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : ""
}

type Soft<T> = { value: T; failed: boolean; nxdomain: boolean }

/** Missing records are normal; only resolver failures count as errors. */
async function soft<T>(query: Promise<T>, empty: T): Promise<Soft<T>> {
  try {
    return { value: await query, failed: false, nxdomain: false }
  } catch (error) {
    const code = errorCode(error)
    if (NO_DATA.has(code)) return { value: empty, failed: false, nxdomain: code === "ENOTFOUND" }
    return { value: empty, failed: true, nxdomain: false }
  }
}

function formatCaa(record: CaaRecord) {
  const [tag, value] =
    Object.entries(record).find(([key]) => key !== "critical") ?? ["", ""]
  return `${record.critical ? "critical " : ""}${tag} "${value}"`
}

export async function lookupDns(host: string): Promise<DnsRecords> {
  const [a, aaaa, cname, mx, ns, txt, caa, soa, dmarc] = await Promise.all([
    soft<string[]>(resolver.resolve4(host), []),
    soft<string[]>(resolver.resolve6(host), []),
    soft<string[]>(resolver.resolveCname(host), []),
    soft<MxRecord[]>(resolver.resolveMx(host), []),
    soft<string[]>(resolver.resolveNs(host), []),
    soft<string[][]>(resolver.resolveTxt(host), []),
    soft<CaaRecord[]>(resolver.resolveCaa(host), []),
    soft<SoaRecord | null>(resolver.resolveSoa(host), null),
    soft<string[][]>(resolver.resolveTxt(`_dmarc.${host}`), []),
  ])

  if ([a, aaaa, mx, ns, txt, soa].every((result) => result.failed)) {
    throw new Error("The DNS resolvers did not respond.")
  }

  return {
    nxdomain: a.nxdomain && aaaa.nxdomain,
    a: a.value,
    aaaa: aaaa.value,
    cname: cname.value,
    mx: [...mx.value].sort((x, y) => x.priority - y.priority),
    ns: ns.value.map((server) => server.toLowerCase()).sort(),
    txt: txt.value.map((parts) => parts.join("")),
    caa: caa.value.map(formatCaa),
    dmarc: dmarc.value.map((parts) => parts.join("")).find((r) => r.startsWith("v=DMARC1")),
    soa: soa.value
      ? { nsname: soa.value.nsname, hostmaster: soa.value.hostmaster, serial: soa.value.serial }
      : undefined,
  }
}

export async function reverseDns(ip: string) {
  return (await soft<string[]>(resolver.reverse(ip), [])).value
}
