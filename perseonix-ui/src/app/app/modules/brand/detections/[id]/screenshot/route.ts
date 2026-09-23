import { requireModule } from "@/lib/auth/dal"
import { BRAND_MODULE_KEY } from "@/lib/brand/meta"
import { readBrandCapture } from "@/lib/brand/screenshot-store"
import { getDetection } from "@/lib/brand/store"

/** The sandbox screenshot for a detection, only for people who own the asset. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  const { id } = await params
  const detection = await getDetection(user, id)
  if (!detection) return new Response("Not found", { status: 404 })

  const image = await readBrandCapture(id)
  if (!image) return new Response("Screenshot not available", { status: 404 })

  return new Response(new Uint8Array(image), {
    headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=86400" },
  })
}
