import { requireModule } from "@/lib/auth/dal"
import { INVESTIGATE_MODULE_KEY } from "@/lib/investigate/meta"
import { fetchUrlscanResult } from "@/lib/investigate/sources/urlscan"
import { getInvestigation } from "@/lib/investigate/store"

/** Polled by the report page until urlscan.io finishes the private scan. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireModule(INVESTIGATE_MODULE_KEY)
  const { id } = await params
  const investigation = await getInvestigation(user, id)

  const submission = investigation.report.urlscan.data
  if (!submission) return Response.json({ state: "error", message: "No scan was submitted." }, { status: 404 })

  try {
    const poll = await fetchUrlscanResult(submission.uuid)
    return Response.json(poll, { headers: { "cache-control": "no-store" } })
  } catch {
    return Response.json({ state: "error", message: "Couldn't reach urlscan.io." }, { status: 502 })
  }
}
