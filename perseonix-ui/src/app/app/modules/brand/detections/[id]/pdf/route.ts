import { recordAudit } from "@/lib/audit"
import { requireModule } from "@/lib/auth/dal"
import { BRAND_MODULE_KEY } from "@/lib/brand/meta"
import { brandPdfFilename, renderBrandPdf } from "@/lib/brand/pdf"
import { readBrandCapture } from "@/lib/brand/screenshot-store"
import { getDetection } from "@/lib/brand/store"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireModule(BRAND_MODULE_KEY)
  const { id } = await params
  const detection = await getDetection(user, id)
  if (!detection) return new Response("Not found", { status: 404 })

  const screenshot = detection.screenshotAt ? await readBrandCapture(id) : null
  const pdf = await renderBrandPdf({ detection, generatedBy: user.name, generatedAt: new Date(), screenshot })

  await recordAudit({
    actor: { id: user.id, email: user.email },
    action: "brand.report_exported",
    target: { type: "brand_detection", id: detection.id, label: detection.domain },
    metadata: { format: "pdf" },
  })

  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${brandPdfFilename(detection)}"`,
      "cache-control": "private, no-store",
    },
  })
}
