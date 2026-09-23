import "server-only"

// Keeps free-tier API keys inside their provider's limits and avoids paying for
// the same lookup twice. In-process: counters reset when the server restarts.

type Window = { minute: number[]; day: string; dayCount: number }
type Entry = { expires: number; value: Promise<unknown> }

const globalStore = globalThis as typeof globalThis & {
  __pxQuota?: Map<string, Window>
  __pxLookupCache?: Map<string, Entry>
}
const windows = (globalStore.__pxQuota ??= new Map<string, Window>())
const cache = (globalStore.__pxLookupCache ??= new Map<string, Entry>())

const MAX_CACHE_ENTRIES = 1000

/** Positive integer from the environment, or the fallback. */
export function envLimit(name: string, fallback: number) {
  const value = Number(process.env[name])
  return Number.isInteger(value) && value > 0 ? value : fallback
}

/**
 * Reserves one request against a provider's limits.
 * Returns which limit was hit, or null when the request may go ahead.
 */
export function reserve(provider: string, limits: { perMinute?: number; perDay?: number }) {
  const now = Date.now()
  const today = new Date(now).toISOString().slice(0, 10)
  const window = windows.get(provider) ?? { minute: [], day: today, dayCount: 0 }
  if (window.day !== today) {
    window.day = today
    window.dayCount = 0
  }
  window.minute = window.minute.filter((at) => now - at < 60_000)
  windows.set(provider, window)

  if (limits.perDay && window.dayCount >= limits.perDay) return "day" as const
  if (limits.perMinute && window.minute.length >= limits.perMinute) return "minute" as const
  window.minute.push(now)
  window.dayCount++
  return null
}

/**
 * Memoises a lookup for `ttlMs`, sharing in-flight requests. Failures are not
 * cached, so the next investigation retries them.
 */
export function remember<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = cache.get(key)
  if (hit && hit.expires > now) return hit.value as Promise<T>

  const value = load()
  cache.set(key, { expires: now + ttlMs, value })
  value.catch(() => cache.delete(key))

  if (cache.size > MAX_CACHE_ENTRIES) {
    for (const [staleKey, entry] of cache) {
      if (cache.size <= MAX_CACHE_ENTRIES || entry.expires > now) break
      cache.delete(staleKey)
    }
    // Still full of fresh entries: drop the oldest.
    if (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!)
  }
  return value
}
