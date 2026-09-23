import "server-only"
import http, { type IncomingHttpHeaders, type IncomingMessage } from "node:http"
import https from "node:https"
import { lookup } from "node:dns/promises"
import { isIP, type LookupFunction } from "node:net"
import type { TLSSocket } from "node:tls"
import { hostForUrl, isPublicAddress } from "@/lib/investigate/address"
import type { Target } from "@/lib/investigate/target"
import type { LiveCheck } from "@/lib/investigate/types"

const MAX_REDIRECTS = 5
const HOP_TIMEOUT_MS = 6000
const MAX_BODY_BYTES = 256 * 1024
const USER_AGENT = "Mozilla/5.0 (compatible; PerseonixCorvael/1.0; +https://perseonix.com)"

const SECURITY_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
]

/** A failure we can explain to the user. `blocked` means we refused to connect. */
class ProbeError extends Error {
  constructor(
    message: string,
    readonly blocked = false
  ) {
    super(message)
  }
}

type Address = { address: string; family: number }

/**
 * SSRF guard: resolve the host ourselves, refuse it if *any* answer is internal,
 * and later pin the connection to the vetted address so a second DNS answer
 * (rebinding) can't redirect it.
 */
export async function resolvePublicAddress(host: string): Promise<Address> {
  const family = isIP(host)
  if (family) {
    if (!isPublicAddress(host)) throw new ProbeError("That address is internal, so it wasn't contacted.", true)
    return { address: host, family }
  }
  let records: Address[]
  try {
    records = await lookup(host, { all: true, verbatim: true })
  } catch {
    throw new ProbeError("The host does not resolve.")
  }
  if (records.length === 0) throw new ProbeError("The host does not resolve.")
  if (records.some((record) => !isPublicAddress(record.address))) {
    throw new ProbeError("The host resolves to an internal address, so it wasn't contacted.", true)
  }
  return records[0]
}

function friendlyError(error: unknown): ProbeError {
  if (error instanceof ProbeError) return error
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : ""
  switch (code) {
    case "ECONNREFUSED":
      return new ProbeError("The server refused the connection.")
    case "ECONNRESET":
      return new ProbeError("The server reset the connection.")
    case "EHOSTUNREACH":
    case "ENETUNREACH":
      return new ProbeError("The server is unreachable.")
    case "EPROTO":
      return new ProbeError("The TLS handshake failed.")
    default:
      return new ProbeError("The site couldn't be reached.")
  }
}

function toIso(value?: string) {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function extractTitle(html: string) {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)
  if (!match) return undefined
  const title = match[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
  return title ? title.slice(0, 200) : undefined
}

function headerValue(headers: IncomingHttpHeaders, name: string) {
  const value = headers[name]
  return Array.isArray(value) ? value.join(", ") : value
}

type Hop = {
  status: number
  headers: IncomingHttpHeaders
  body: string
  tls?: LiveCheck["tls"]
}

function fetchHop(url: URL, target: Address): Promise<Hop> {
  const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) callback(null, [target])
    else callback(null, target.address, target.family)
  }

  return new Promise((resolve, reject) => {
    let tls: LiveCheck["tls"]
    let settled = false
    let response: IncomingMessage | undefined

    const fail = (error: unknown) => {
      if (settled) return
      settled = true
      clearTimeout(deadline)
      reject(friendlyError(error))
    }

    // A hard deadline for the whole hop: socket idle timeouts don't reliably
    // cover a stalled TCP connect. If headers already arrived, keep what we have.
    const deadline = setTimeout(() => {
      if (response) response.destroy()
      else {
        fail(new ProbeError(`No response within ${HOP_TIMEOUT_MS / 1000} seconds.`))
        request.destroy()
      }
    }, HOP_TIMEOUT_MS)

    const client = url.protocol === "https:" ? https : http
    const request = client.request(
      url,
      {
        method: "GET",
        lookup: pinnedLookup,
        agent: false,
        // Inspect broken certificates instead of refusing them.
        rejectUnauthorized: false,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
          "accept-encoding": "identity",
        },
      },
      (incoming) => {
        response = incoming
        const status = incoming.statusCode ?? 0
        const chunks: Buffer[] = []
        let size = 0
        const finish = () => {
          if (settled) return
          settled = true
          clearTimeout(deadline)
          resolve({ status, headers: incoming.headers, body: Buffer.concat(chunks).toString("utf8"), tls })
        }
        const wantsBody =
          String(incoming.headers["content-type"] ?? "").includes("html") && (status < 300 || status >= 400)
        if (!wantsBody) {
          incoming.destroy()
          finish()
          return
        }
        incoming.on("data", (chunk: Buffer) => {
          size += chunk.length
          if (size > MAX_BODY_BYTES) incoming.destroy()
          else chunks.push(chunk)
        })
        incoming.on("end", finish)
        incoming.on("close", finish)
        incoming.on("error", finish)
      }
    )

    request.on("socket", (socket) => {
      if (!("getPeerCertificate" in socket)) return
      const tlsSocket = socket as TLSSocket
      tlsSocket.once("secureConnect", () => {
        const cert = tlsSocket.getPeerCertificate()
        tls = {
          protocol: tlsSocket.getProtocol() ?? undefined,
          // Certificate DN fields can repeat, so they may arrive as arrays.
          subject: [cert?.subject?.CN].flat()[0],
          issuer: [cert?.issuer?.O ?? cert?.issuer?.CN].flat()[0],
          validFrom: toIso(cert?.valid_from),
          validTo: toIso(cert?.valid_to),
          altNames: cert?.subjectaltname ? cert.subjectaltname.split(",").length : 0,
          trusted: tlsSocket.authorized,
          error: tlsSocket.authorized ? undefined : String(tlsSocket.authorizationError ?? "Untrusted certificate"),
        }
      })
    })
    request.on("error", fail)
    request.end()
  })
}

async function probe(start: URL): Promise<LiveCheck> {
  const started = Date.now()
  const redirects: LiveCheck["redirects"] = []
  let url = start
  let tls: LiveCheck["tls"]
  let hop: Hop | undefined
  let address: Address | undefined

  for (let step = 0; step <= MAX_REDIRECTS; step++) {
    address = await resolvePublicAddress(url.hostname.replace(/^\[|\]$/g, ""))
    hop = await fetchHop(url, address)
    if (url.protocol === "https:" && !tls) tls = hop.tls

    const location = headerValue(hop.headers, "location")
    if (hop.status >= 300 && hop.status < 400 && location && step < MAX_REDIRECTS) {
      const next = new URL(location, url)
      if (next.protocol !== "http:" && next.protocol !== "https:") break
      redirects.push({ url: url.toString(), status: hop.status })
      url = next
      continue
    }
    break
  }
  if (!hop) throw new ProbeError("The site couldn't be reached.")

  return {
    requestedUrl: start.toString(),
    finalUrl: url.toString(),
    status: hop.status,
    redirects,
    ip: address?.address,
    title: extractTitle(hop.body),
    server: headerValue(hop.headers, "server"),
    contentType: headerValue(hop.headers, "content-type"),
    securityHeaders: SECURITY_HEADERS.map((name) => ({ name, present: Boolean(hop.headers[name]) })),
    tls,
    tookMs: Date.now() - started,
  }
}

/** Fetches the target like a browser would, without running any of its code. */
export async function liveCheck(target: Target): Promise<LiveCheck> {
  if (target.url) return probe(new URL(target.url))

  // Bare domains and IPs: try HTTPS and plain HTTP together so a silent port
  // doesn't double the wait; HTTPS wins when both answer.
  const host = hostForUrl(target.host)
  const [secure, plain] = await Promise.allSettled([
    probe(new URL(`https://${host}/`)),
    probe(new URL(`http://${host}/`)),
  ])
  if (secure.status === "fulfilled") return secure.value
  if (plain.status === "fulfilled") return plain.value
  throw secure.reason
}
