import "server-only"
import { headers } from "next/headers"

// How many reverse proxies in front of the app append to X-Forwarded-For.
// Everything to the left of their entries is client-controlled, so it's never trusted.
const TRUSTED_PROXY_COUNT = Math.max(0, Number(process.env.TRUSTED_PROXY_COUNT ?? 1) || 0)

function clientIp(h: Headers) {
  const chain =
    h
      .get("x-forwarded-for")
      ?.split(",")
      .map((entry) => entry.trim())
      .filter(Boolean) ?? []
  if (TRUSTED_PROXY_COUNT > 0 && chain.length >= TRUSTED_PROXY_COUNT) {
    return chain[chain.length - TRUSTED_PROXY_COUNT]
  }
  return h.get("x-real-ip")?.trim() || null
}

/** Absolute sign-in URL for credentials handed to new users. */
export async function getLoginUrl() {
  if (process.env.APP_URL) return new URL("/login", process.env.APP_URL).toString()
  const host = (await headers()).get("host") ?? "localhost:3000"
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host)
  return `${isLocal ? "http" : "https"}://${host}/login`
}

export async function getRequestMeta() {
  const h = await headers()
  return {
    ipAddress: clientIp(h),
    userAgent: h.get("user-agent")?.slice(0, 512) ?? null,
  }
}

/**
 * Whether the current request reached us over HTTPS. NODE_ENV alone can't
 * tell us this (a production deploy may still be served over plain HTTP if
 * no reverse proxy/TLS is set up yet), so prefer signals tied to the actual
 * connection: a reverse proxy's X-Forwarded-Proto header, then the
 * configured public APP_URL. Cookies marked `secure` are silently dropped by
 * browsers on non-HTTPS connections, so defaulting to true here would break
 * sessions entirely on HTTP deployments.
 */
export async function isSecureRequest() {
  const proto = (await headers()).get("x-forwarded-proto")
  if (proto) return proto.split(",")[0]?.trim().toLowerCase() === "https"
  if (process.env.APP_URL) return process.env.APP_URL.startsWith("https://")
  return false
}
