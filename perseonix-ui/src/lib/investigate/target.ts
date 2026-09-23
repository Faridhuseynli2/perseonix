import "server-only"
import { isIP } from "node:net"
import { domainToASCII } from "node:url"
import { isPublicAddress } from "@/lib/investigate/address"
import type { TargetKind } from "@/lib/investigate/types"

export type Target = {
  input: string
  kind: TargetKind
  /** Canonical form: the domain, the IP, or the normalised URL. */
  value: string
  /** Hostname or IP that network sources query. */
  host: string
  url?: string
}

/** A problem with what the user typed; its message is shown to them. */
export class TargetError extends Error {}

const DOMAIN = /^(?=.{1,253}$)(?:(?!-)[a-z0-9-]{1,63}(?<!-)\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/

function normalizeHost(raw: string) {
  const host = raw.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase()
  if (isIP(host)) {
    if (!isPublicAddress(host)) {
      throw new TargetError("Private, loopback and reserved IP addresses can't be investigated.")
    }
    return host
  }
  const ascii = domainToASCII(host)
  if (!ascii || !DOMAIN.test(ascii)) {
    throw new TargetError("That doesn't look like a valid domain, IP address or URL.")
  }
  return ascii
}

export function parseTarget(raw: string): Target {
  const input = raw.trim()
  if (!input) throw new TargetError("Enter a domain, IP address or URL.")
  if (input.length > 2048) throw new TargetError("That input is too long to investigate.")

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input)
  const bare = input.replace(/^\[|\]$/g, "")

  if (!hasScheme && isIP(bare)) {
    const host = normalizeHost(bare)
    return { input, kind: "ip", value: host, host }
  }
  if (!hasScheme && !/[/?#:]/.test(input)) {
    const host = normalizeHost(input)
    return { input, kind: "domain", value: host, host }
  }

  let url: URL
  try {
    url = new URL(hasScheme ? input : `http://${input}`)
  } catch {
    throw new TargetError("That URL couldn't be understood.")
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TargetError("Only http:// and https:// URLs can be investigated.")
  }
  const host = normalizeHost(url.hostname)
  // Never forward embedded credentials, and fragments never reach a server anyway.
  url.username = ""
  url.password = ""
  url.hash = ""
  const value = url.toString()
  return { input, kind: "url", value, host, url: value }
}
