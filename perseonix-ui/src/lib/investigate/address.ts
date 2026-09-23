import "server-only"
import { BlockList, isIP } from "node:net"

// Special-purpose and internal ranges (RFC 6890 and friends). Anything in here
// is never investigated or contacted, so the live check can't be pointed at
// our own infrastructure or a customer's internal network.
const reserved = new BlockList()

for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  reserved.addSubnet(network, prefix, "ipv4")
}

// IPv4-mapped addresses (::ffff:0:0/96) are deliberately absent: BlockList
// treats that subnet as covering every IPv4 address. They're unwrapped below.
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  reserved.addSubnet(network, prefix, "ipv6")
}

/** "::ffff:10.0.0.1" or "::ffff:a00:1" → "10.0.0.1"; anything else → null. */
function unwrapMappedIpv4(address: string) {
  const lower = address.toLowerCase()
  const dotted = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(lower)
  if (dotted) return dotted[1]
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower)
  if (!hex) return null
  const high = parseInt(hex[1], 16)
  const low = parseInt(hex[2], 16)
  return [high >> 8, high & 255, low >> 8, low & 255].join(".")
}

/** True only for globally routable unicast addresses. */
export function isPublicAddress(address: string): boolean {
  const version = isIP(address)
  if (version === 0) return false
  if (version === 6) {
    const mapped = unwrapMappedIpv4(address)
    if (mapped) return isPublicAddress(mapped)
  }
  return !reserved.check(address, version === 4 ? "ipv4" : "ipv6")
}

/** Expands an IPv6 address to 32 hex digits, e.g. for reverse (nibble) lookups. */
export function expandIpv6(address: string): string | null {
  if (isIP(address) !== 6 || address.includes(".")) return null
  const [head, tail] = address.split("::")
  const left = head ? head.split(":") : []
  const right = tail === undefined ? [] : tail ? tail.split(":") : []
  const groups =
    tail === undefined ? left : [...left, ...Array(8 - left.length - right.length).fill("0"), ...right]
  return groups.map((group) => group.padStart(4, "0")).join("")
}

/** Host part suitable for a URL: IPv6 literals need brackets. */
export function hostForUrl(host: string) {
  return isIP(host) === 6 ? `[${host}]` : host
}
