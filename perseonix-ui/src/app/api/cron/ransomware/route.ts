import { NextResponse } from "next/server"
import { connectorActive, connectorKey, loadConnectorRuntime } from "@/lib/connectors/service"
import { runIngestion } from "@/lib/ransomware/ingest"
import { RANSOMWARE_SOURCE_ID } from "@/lib/ransomware/meta"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * Scheduled ransomware refresh — hit hourly by a systemd timer / cron on the server
 * (curl to localhost). Replaces the old manual "Refresh data" button. Protected by a
 * shared secret so nothing outside the box can trigger an ingest.
 *
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/ransomware
 */
async function handle(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET is not configured." }, { status: 503 })
  }
  const auth = req.headers.get("authorization") ?? ""
  const provided = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : req.headers.get("x-cron-key")?.trim()
  if (provided !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 })
  }

  await loadConnectorRuntime()
  if (!connectorActive(RANSOMWARE_SOURCE_ID)) {
    return NextResponse.json({ ok: false, error: "The Ransomware.live connector is disabled." }, { status: 409 })
  }

  const result = await runIngestion({ apiKey: connectorKey(RANSOMWARE_SOURCE_ID) })
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}

export async function POST(req: Request) {
  return handle(req)
}

export async function GET(req: Request) {
  return handle(req)
}
