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
