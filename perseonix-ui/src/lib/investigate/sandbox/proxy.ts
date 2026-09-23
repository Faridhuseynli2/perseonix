import "server-only"
import { randomBytes } from "node:crypto"
import http, { type IncomingMessage, type ServerResponse } from "node:http"
import net, { type AddressInfo } from "node:net"
import type { Duplex } from "node:stream"
import { resolvePublicAddress } from "@/lib/investigate/sources/live"

// Every request the sandbox browser makes goes through this local proxy. It
// resolves each host itself, refuses anything that isn't a public address and
// connects to the vetted IP, so a page can't reach internal services or use DNS
// rebinding. Only our browser holds the credentials.

export type SandboxProxy = {
  server: string
  username: string
  password: string
  /** The public IP the proxy connected to for a host, when known. */
  ipFor: (host: string) => string | undefined
}

/** Marks responses the proxy refused, so the capture can report them as blocked. */
export const BLOCKED_HEADER = "x-perseonix-sandbox"

const UPSTREAM_TIMEOUT_MS = 20_000
const MAX_REMEMBERED_HOSTS = 5_000

const globalState = globalThis as typeof globalThis & { __pxSandboxProxy?: Promise<SandboxProxy> }
const resolved = new Map<string, string>()

async function vet(host: string) {
  const address = await resolvePublicAddress(host.replace(/^\[|\]$/g, ""))
  resolved.set(host.toLowerCase(), address.address)
  if (resolved.size > MAX_REMEMBERED_HOSTS) resolved.delete(resolved.keys().next().value!)
  return address
}

/** "example.com:443" or "[2001:db8::1]:443" → host and port. */
function splitAuthority(authority: string) {
  const match = /^\[?([^\]]+?)\]?:(\d+)$/.exec(authority)
  return match ? { host: match[1], port: Number(match[2]) } : null
}

function start(): Promise<SandboxProxy> {
  const username = "sandbox"
  const password = randomBytes(18).toString("base64url")
  const expected = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
  const authorized = (request: IncomingMessage) => request.headers["proxy-authorization"] === expected

  const onRequest = (request: IncomingMessage, response: ServerResponse) => {
    if (!authorized(request)) {
      response.writeHead(407, { "proxy-authenticate": 'Basic realm="sandbox"' }).end()
      return
    }
    let target: URL
    try {
      target = new URL(request.url ?? "")
    } catch {
      response.writeHead(400).end()
      return
    }
    if (target.protocol !== "http:") {
      response.writeHead(400).end()
      return
    }
    vet(target.hostname).then(
      (address) => {
        const headers: http.OutgoingHttpHeaders = { ...request.headers, host: target.host }
        delete headers["proxy-authorization"]
        delete headers["proxy-connection"]
        const upstream = http.request(
          {
            host: address.address,
            family: address.family,
            port: Number(target.port) || 80,
            method: request.method,
            path: `${target.pathname}${target.search}`,
            headers,
            timeout: UPSTREAM_TIMEOUT_MS,
          },
          (upstreamResponse) => {
            response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers)
            upstreamResponse.pipe(response)
          }
        )
        upstream.on("timeout", () => upstream.destroy(new Error("timeout")))
        upstream.on("error", () => {
          if (!response.headersSent) response.writeHead(502)
          response.end()
        })
        request.pipe(upstream)
      },
      () => {
        response
          .writeHead(403, { [BLOCKED_HEADER]: "blocked", "content-type": "text/plain" })
          .end("Blocked by the Perseonix sandbox: the host is not a public address.")
      }
    )
  }

  const onConnect = (request: IncomingMessage, client: Duplex, head: Buffer) => {
    client.on("error", () => client.destroy())
    if (!authorized(request)) {
      client.end('HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="sandbox"\r\n\r\n')
      return
    }
    const authority = splitAuthority(request.url ?? "")
    if (!authority) {
      client.end("HTTP/1.1 400 Bad Request\r\n\r\n")
      return
    }
    vet(authority.host).then(
      (address) => {
        const upstream = net.connect({ host: address.address, family: address.family, port: authority.port })
        upstream.setTimeout(UPSTREAM_TIMEOUT_MS, () => upstream.destroy())
        upstream.once("connect", () => {
          client.write("HTTP/1.1 200 Connection Established\r\n\r\n")
          if (head.length > 0) upstream.write(head)
          upstream.pipe(client)
          client.pipe(upstream)
        })
        upstream.on("error", () => {
          if (client.writable) client.end("HTTP/1.1 502 Bad Gateway\r\n\r\n")
        })
        client.on("close", () => upstream.destroy())
      },
      () => client.end(`HTTP/1.1 403 Forbidden\r\n${BLOCKED_HEADER}: blocked\r\n\r\n`)
    )
  }

  return new Promise((resolve, reject) => {
    const server = http.createServer(onRequest)
    server.on("connect", onConnect)
    server.once("error", reject)
    // Loopback only; the credentials keep other local processes out.
    server.listen(0, "127.0.0.1", () => {
      server.unref()
      const { port } = server.address() as AddressInfo
      resolve({
        server: `http://127.0.0.1:${port}`,
        username,
        password,
        ipFor: (host) => resolved.get(host.toLowerCase()),
      })
    })
  })
}

export function startSandboxProxy() {
  const pending = (globalState.__pxSandboxProxy ??= start())
  pending.catch(() => {
    if (globalState.__pxSandboxProxy === pending) globalState.__pxSandboxProxy = undefined
  })
  return pending
}
