import "server-only"
import { chromium, type Browser, type Response } from "playwright-core"
import { BLOCKED_HEADER, startSandboxProxy } from "@/lib/investigate/sandbox/proxy"
import type { SandboxCapture, SandboxHost } from "@/lib/investigate/types"

// Opens the target in a headless Chromium: one shared browser, a fresh
// incognito context per capture, all traffic through the SSRF-safe proxy.
// Needs a Chromium binary: `npx playwright-core install chromium-headless-shell`,
// or SANDBOX_BROWSER_PATH pointing at Chrome/Chromium.

const NAV_TIMEOUT_MS = 15_000
const SETTLE_MS = 1_500
const VIEWPORT = { width: 1280, height: 800 }
const MAX_CONCURRENT = 2
const MAX_HOSTS = 40

export function sandboxEnabled() {
  return process.env.SANDBOX_DISABLED !== "1"
}

export type CaptureResult = { data: SandboxCapture; screenshot: Buffer | null }

/** A failure we can explain to customers. */
class CaptureError extends Error {
  constructor(
    message: string,
    readonly timedOut = false
  ) {
    super(message)
  }
}

type Slots = { active: number; waiting: (() => void)[] }
const globalState = globalThis as typeof globalThis & {
  __pxSandboxBrowser?: Promise<Browser>
  __pxSandboxSlots?: Slots
}
const slots = (globalState.__pxSandboxSlots ??= { active: 0, waiting: [] })

async function acquire() {
  if (slots.active < MAX_CONCURRENT) {
    slots.active++
    return
  }
  await new Promise<void>((resolve) => slots.waiting.push(resolve))
}

function release() {
  const next = slots.waiting.shift()
  if (next) next()
  else slots.active--
}

async function launch() {
  const proxy = await startSandboxProxy()
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.SANDBOX_BROWSER_PATH || undefined,
    // "<-loopback>" sends even localhost through the proxy, which refuses it.
    proxy: { server: proxy.server, username: proxy.username, password: proxy.password, bypass: "<-loopback>" },
    args: [
      "--disable-quic",
      "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-sync",
      "--disable-extensions",
      "--mute-audio",
      "--no-first-run",
    ],
  })
  browser.on("disconnected", () => {
    globalState.__pxSandboxBrowser = undefined
  })
  return browser
}

function getBrowser() {
  const pending = (globalState.__pxSandboxBrowser ??= launch())
  pending.catch(() => {
    if (globalState.__pxSandboxBrowser === pending) globalState.__pxSandboxBrowser = undefined
  })
  return pending
}

function webHost(url: string) {
  if (!/^https?:/i.test(url)) return null
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

/** Rough "same organisation" test; good enough without a public-suffix list. */
const baseDomain = (host: string) => host.replace(/^www\./, "").split(".").slice(-2).join(".")

function describe(error: unknown) {
  const message = error instanceof Error ? error.message : ""
  if (/timeout/i.test(message)) return new CaptureError(`The page didn't load within ${NAV_TIMEOUT_MS / 1000} seconds.`, true)
  if (/TUNNEL|PROXY/i.test(message)) return new CaptureError("The site couldn't be reached, or it points to a non-public address.")
  if (/ERR_NAME|ERR_ADDRESS|ERR_CONNECTION|ERR_EMPTY|ERR_SSL/i.test(message)) return new CaptureError("The site couldn't be reached.")
  return new CaptureError("The page couldn't be rendered.")
}

async function captureOnce(
  browser: Browser,
  url: string,
  ipFor: (host: string) => string | undefined
): Promise<CaptureResult> {
  const started = Date.now()
  const major = browser.version().split(".")[0]
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    // A plain desktop Chrome: phishing kits hide from "HeadlessChrome".
    userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`,
    locale: "en-US",
    timezoneId: "UTC",
    ignoreHTTPSErrors: true,
    acceptDownloads: false,
    serviceWorkers: "block",
    permissions: [],
  })

  try {
    const page = await context.newPage()
    context.on("page", (popup) => {
      if (popup !== page) void popup.close().catch(() => undefined)
    })
    page.on("dialog", (dialog) => void dialog.dismiss().catch(() => undefined))

    const hosts = new Map<string, { requests: number; blocked: number }>()
    const counts = { total: 0, failed: 0, blocked: 0 }
    const committed: string[] = []

    page.on("request", (request) => {
      const host = webHost(request.url())
      if (!host) return
      counts.total++
      const entry = hosts.get(host) ?? { requests: 0, blocked: 0 }
      entry.requests++
      hosts.set(host, entry)
    })
    const markBlocked = (host: string | null) => {
      counts.blocked++
      const entry = host ? hosts.get(host) : undefined
      if (entry) entry.blocked++
    }
    page.on("requestfailed", (request) => {
      const host = webHost(request.url())
      if (!host) return
      if (/TUNNEL|PROXY/i.test(request.failure()?.errorText ?? "")) markBlocked(host)
      else counts.failed++
    })
    page.on("response", (response) => {
      if (response.headers()[BLOCKED_HEADER]) markBlocked(webHost(response.url()))
    })
    page.on("framenavigated", (frame) => {
      if (frame !== page.mainFrame()) return
      const current = frame.url()
      if (/^https?:/i.test(current) && committed.at(-1) !== current) committed.push(current)
    })

    let response: Response | null = null
    let loaded = true
    try {
      response = await page.goto(url, { waitUntil: "load", timeout: NAV_TIMEOUT_MS })
    } catch (error) {
      // A document that committed but never finished loading is still worth a screenshot.
      if (committed.length === 0) throw describe(error)
      loaded = false
    }
    if (response?.headers()[BLOCKED_HEADER]) {
      throw new CaptureError("The site points to a non-public address, so it wasn't opened.")
    }
    if (!webHost(page.url())) throw new CaptureError("The site couldn't be reached.")
    await page.waitForTimeout(SETTLE_MS)

    const finalUrl = page.url()
    const redirectHops: string[] = []
    for (let hop = response?.request().redirectedFrom(); hop; hop = hop.redirectedFrom()) {
      redirectHops.unshift(hop.url())
    }
    const navigations = [...redirectHops, ...committed].filter((value, index, all) => all[index - 1] !== value)

    const title = (await page.title().catch(() => "")).trim().slice(0, 200) || undefined
    const forms = await page
      .evaluate(() => ({
        passwords: document.querySelectorAll("input[type=password]").length,
        targets: Array.from(document.forms)
          .filter((form) => form.querySelector("input[type=password]"))
          .map((form) => form.action),
      }))
      .catch(() => ({ passwords: 0, targets: [] as string[] }))
    const image = await page.screenshot({ type: "jpeg", quality: 78, timeout: 10_000 }).catch(() => null)

    const site = baseDomain(webHost(finalUrl) ?? "")
    const hostList: SandboxHost[] = [...hosts]
      .map(([host, entry]) => ({
        host,
        ip: ipFor(host),
        requests: entry.requests,
        blocked: entry.blocked,
        thirdParty: baseDomain(host) !== site,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, MAX_HOSTS)

    return {
      data: {
        requestedUrl: url,
        finalUrl,
        title,
        status: response?.status(),
        loaded,
        screenshot: image ? { ...VIEWPORT } : null,
        navigations: navigations.slice(0, 20),
        requests: counts,
        hosts: hostList,
        passwordFields: forms.passwords,
        externalFormTargets: [
          ...new Set(
            forms.targets.filter((action) => {
              const host = webHost(action)
              return host !== null && baseDomain(host) !== site
            })
          ),
        ].slice(0, 5),
        tookMs: Date.now() - started,
      },
      screenshot: image,
    }
  } finally {
    await context.close().catch(() => undefined)
  }
}

/** Tries each candidate URL in turn (e.g. https, then http) and captures the first that renders. */
export async function capturePage(candidates: string[]): Promise<CaptureResult> {
  const browser = await getBrowser().catch(() => {
    throw new CaptureError("The sandbox browser isn't available on this server.")
  })
  const proxy = await startSandboxProxy()
  await acquire()
  try {
    let lastError: unknown = new CaptureError("The page couldn't be rendered.")
    for (const url of candidates) {
      try {
        return await captureOnce(browser, url, proxy.ipFor)
      } catch (error) {
        lastError = error instanceof CaptureError ? error : describe(error)
        if (lastError instanceof CaptureError && lastError.timedOut) break
      }
    }
    throw lastError
  } finally {
    release()
  }
}
