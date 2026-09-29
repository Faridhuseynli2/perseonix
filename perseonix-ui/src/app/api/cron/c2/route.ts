import { NextResponse } from "next/server"
import { runC2Ingestion } from "@/lib/c2/ingest"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Scheduled C2 hunt — hit hourly by a systemd timer on the server. Pulls Feodo
 * (free) + Shodan counts (free) + a rotating Shodan search subset. Secret-gated.
 *
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/c2
 */
async function handle(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured." }, { status: 503 })
  const auth = req.headers.get("authorization") ?? ""
  const provided = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : req.headers.get("x-cron-key")?.trim()
  if (provided !== secret) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 })

  const result = await runC2Ingestion()
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}

export async function POST(req: Request) {
  return handle(req)
}
export async function GET(req: Request) {
  return handle(req)
}
