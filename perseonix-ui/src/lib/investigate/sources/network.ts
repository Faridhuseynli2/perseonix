import "server-only"
import { isIP } from "node:net"
import { expandIpv6 } from "@/lib/investigate/address"
import { resolver, reverseDns } from "@/lib/investigate/sources/dns"
import { lookupIpRegistration } from "@/lib/investigate/sources/rdap"
import type { NetworkInfo } from "@/lib/investigate/types"

function txtFields(records: string[][]) {
  return records[0]?.join("").split("|").map((field) => field.trim()) ?? []
}

/** IP-to-ASN mapping via Team Cymru's free DNS service. */
async function lookupAsn(ip: string) {
  const zone =
    isIP(ip) === 4
      ? `${ip.split(".").reverse().join(".")}.origin.asn.cymru.com`
      : `${[...(expandIpv6(ip) ?? "")].reverse().join(".")}.origin6.asn.cymru.com`

  const origin = txtFields(await resolver.resolveTxt(zone))
  // "15169 | 8.8.8.0/24 | US | arin | 2023-12-28" — several ASNs may be space-separated.
  const asn = Number(origin[0]?.split(" ")[0])
  if (!Number.isFinite(asn) || asn === 0) return null

  const name = txtFields(await resolver.resolveTxt(`AS${asn}.asn.cymru.com`).catch(() => []))
  return {
    asn,
    prefix: origin[1] || undefined,
    country: origin[2] || undefined,
    registry: origin[3]?.toUpperCase() || undefined,
    // "15169 | US | arin | 2000-03-30 | GOOGLE - Google LLC, US"
    asName: name[4] || undefined,
  }
}

export async function lookupNetwork(ip: string): Promise<NetworkInfo> {
  const [asn, registration, ptr] = await Promise.allSettled([
    lookupAsn(ip),
    lookupIpRegistration(ip),
    reverseDns(ip),
  ])
  if (asn.status === "rejected" && registration.status === "rejected") {
    throw new Error("Network ownership sources were unreachable.")
  }

  const asnData = asn.status === "fulfilled" ? asn.value : null
  const rdap = registration.status === "fulfilled" ? registration.value : null
  return {
    ip,
    asn: asnData?.asn,
    asName: asnData?.asName,
    prefix: asnData?.prefix,
    country: asnData?.country ?? rdap?.country,
    registry: asnData?.registry,
    networkName: rdap?.networkName,
    networkRange: rdap?.networkRange,
    owner: rdap?.owner,
    abuseEmail: rdap?.abuseEmail,
    reverseDns: ptr.status === "fulfilled" ? ptr.value : [],
  }
}
