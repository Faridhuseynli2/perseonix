import { NextResponse } from "next/server"
import { getConnector } from "@/lib/intel/connectors"
import { ingestCves, logIngestRun, type CveInput } from "@/lib/intel/cve"
import { ingestNews, type NewsInput } from "@/lib/intel/news"
import { verifyIngestKey } from "@/lib/intel/ingest-keys"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MAX_ITEMS = 2000

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization")
  if (h?.toLowerCase().startsWith("bearer ")) return h.slice(7).trim()
  return req.headers.get("x-api-key")?.trim() ?? null
}

/**
 * Inbound feed ingestion. Auth: a scoped ingestion key (Module Connectors).
 * POST /api/ingest/v1/<connector>  body: { items: [...] } | [...] | {...}
 */
export async function POST(req: Request, ctx: { params: Promise<{ connector: string }> }) {
  const { connector } = await ctx.params

  if (!getConnector(connector)) {
    return NextResponse.json({ ok: false, error: "Unknown connector." }, { status: 404 })
  }

  const key = bearer(req)
  if (!key) {
    return NextResponse.json({ ok: false, error: "Missing API key." }, { status: 401 })
  }
  const authorizedFor = await verifyIngestKey(key)
  if (!authorizedFor) {
    return NextResponse.json({ ok: false, error: "Invalid or revoked API key." }, { status: 401 })
  }
  if (authorizedFor !== connector) {
    return NextResponse.json(
      { ok: false, error: `This key is scoped to "${authorizedFor}", not "${connector}".` },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "Body must be JSON." }, { status: 400 })
  }

  const items: unknown[] = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { items?: unknown[] }).items)
      ? (body as { items: unknown[] }).items
      : body && typeof body === "object"
        ? [body]
        : []

  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: "No items in payload." }, { status: 400 })
  }
  if (items.length > MAX_ITEMS) {
    return NextResponse.json({ ok: false, error: `Too many items (max ${MAX_ITEMS}).` }, { status: 413 })
  }

  try {
    if (connector === "cve") {
      const res = await ingestCves(items as CveInput[])
      await logIngestRun("cve", {
        received: res.received,
        added: res.added,
        skipped: res.updated + res.dropped,
        status: "ok",
        message: `added ${res.added}, updated ${res.updated}, dropped ${res.dropped}`,
      })
      return NextResponse.json({ ok: true, connector, ...res })
    }
    if (connector === "news") {
      const res = await ingestNews(items as NewsInput[])
      await logIngestRun("news", {
        received: res.received,
        added: res.added,
        skipped: res.updated + res.dropped + res.duplicates,
        status: "ok",
        message: `added ${res.added}, updated ${res.updated}, duplicates ${res.duplicates}, dropped ${res.dropped}`,
      })
      return NextResponse.json({ ok: true, connector, ...res })
    }
    return NextResponse.json({ ok: false, error: `Connector "${connector}" has no ingestion handler yet.` }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingestion failed."
    await logIngestRun(connector, { received: items.length, added: 0, skipped: 0, status: "error", message })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
