import { requireModule } from "@/lib/auth/dal"
import { INVESTIGATE_MODULE_KEY } from "@/lib/investigate/meta"
import { fetchUrlscanScreenshot } from "@/lib/investigate/sources/urlscan"
import { getInvestigation } from "@/lib/investigate/store"

/** Proxies the private urlscan.io screenshot so the API key never reaches the browser. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireModule(INVESTIGATE_MODULE_KEY)
  const { id } = await params
  const investigation = await getInvestigation(user, id)

  const submission = investigation.report.urlscan.data
  const upstream = submission ? await fetchUrlscanScreenshot(submission.uuid).catch(() => null) : null
  if (!upstream?.body) return new Response("Screenshot not available", { status: 404 })

  return new Response(upstream.body, {
    headers: {
      "content-type": "image/png",
      "cache-control": "private, max-age=3600",
    },
  })
}
