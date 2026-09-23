import "server-only"
import { SOURCE_USER_AGENT } from "@/lib/investigate/sources/http"
import type { Registration } from "@/lib/investigate/types"

// rdap.org redirects each query to the authoritative registry or RIR server.
const RDAP_BOOTSTRAP = "https://rdap.org"

type VcardField = [string, Record<string, unknown>, string, unknown]
type RdapEntity = {
  roles?: string[]
  vcardArray?: [string, VcardField[]]
  publicIds?: { type: string; identifier: string }[]
  entities?: RdapEntity[]
}
type RdapEvent = { eventAction: string; eventDate: string }

type RdapDomain = {
  entities?: RdapEntity[]
  events?: RdapEvent[]
  status?: string[]
  nameservers?: { ldhName?: string }[]
  secureDNS?: { delegationSigned?: boolean }
}

type RdapNetwork = {
  name?: string
  handle?: string
  startAddress?: string
  endAddress?: string
  country?: string
  cidr0_cidrs?: { v4prefix?: string; v6prefix?: string; length: number }[]
  entities?: RdapEntity[]
}

async function fetchRdap<T>(path: string): Promise<{ data: T; server: string } | null> {
  const response = await fetch(`${RDAP_BOOTSTRAP}/${path}`, {
    headers: { accept: "application/rdap+json, application/json", "user-agent": SOURCE_USER_AGENT },
    signal: AbortSignal.timeout(8000),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`The registry responded with HTTP ${response.status}.`)
  return { data: (await response.json()) as T, server: new URL(response.url).host }
}

function vcardValue(entity: RdapEntity | undefined, field: string) {
  const value = entity?.vcardArray?.[1]?.find((entry) => entry[0] === field)?.[3]
  return typeof value === "string" ? value : undefined
}

/** Entities can be nested (e.g. an abuse contact under the registrar). */
function findEntity(entities: RdapEntity[] | undefined, role: string): RdapEntity | undefined {
  for (const entity of entities ?? []) {
    if (entity.roles?.includes(role)) return entity
    const nested = findEntity(entity.entities, role)
    if (nested) return nested
  }
  return undefined
}

function eventDate(events: RdapEvent[] | undefined, action: string) {
  return events?.find((event) => event.eventAction === action)?.eventDate
}

/**
 * RDAP only knows registered domains, not subdomains. Without a public-suffix
 * list we try the shortest candidates first (example.com, then example.co.uk).
 */
export async function lookupRegistration(host: string): Promise<Registration | null> {
  const labels = host.split(".")
  for (let size = 2; size <= Math.min(labels.length, 4); size++) {
    const candidate = labels.slice(-size).join(".")
    const result = await fetchRdap<RdapDomain>(`domain/${candidate}`)
    if (!result) continue

    const domain = result.data
    const registrar = findEntity(domain.entities, "registrar")
    return {
      domain: candidate,
      registrar: vcardValue(registrar, "fn"),
      registrarIanaId: registrar?.publicIds?.find((id) => id.type === "IANA Registrar ID")
        ?.identifier,
      createdAt: eventDate(domain.events, "registration"),
      expiresAt: eventDate(domain.events, "expiration"),
      updatedAt: eventDate(domain.events, "last changed"),
      status: domain.status ?? [],
      nameservers: (domain.nameservers ?? [])
        .map((server) => server.ldhName?.toLowerCase())
        .filter((name): name is string => Boolean(name)),
      dnssec: domain.secureDNS?.delegationSigned,
      rdapServer: result.server,
    }
  }
  return null
}

export async function lookupIpRegistration(ip: string) {
  const result = await fetchRdap<RdapNetwork>(`ip/${ip}`)
  if (!result) return null

  const network = result.data
  const cidr = network.cidr0_cidrs?.[0]
  const owner = findEntity(network.entities, "registrant") ?? findEntity(network.entities, "administrative")
  return {
    networkName: network.name,
    networkRange: cidr
      ? `${cidr.v4prefix ?? cidr.v6prefix}/${cidr.length}`
      : network.startAddress && network.endAddress
        ? `${network.startAddress} – ${network.endAddress}`
        : undefined,
    country: network.country,
    owner: vcardValue(owner, "fn"),
    abuseEmail: vcardValue(findEntity(network.entities, "abuse"), "email"),
  }
}
