import { requireModule } from "@/lib/auth/dal"
import { INVESTIGATE_MODULE_KEY } from "@/lib/investigate/meta"
import { readCapture } from "@/lib/investigate/sandbox/storage"
import { getInvestigation } from "@/lib/investigate/store"

/** The sandbox screenshot, for people who can see the investigation. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireModule(INVESTIGATE_MODULE_KEY)
  const { id } = await params
  const investigation = await getInvestigation(user, id)

  const image = await readCapture(investigation.id)
  if (!image) return new Response("Screenshot not available", { status: 404 })

  return new Response(new Uint8Array(image), {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "private, max-age=86400",
    },
  })
}
