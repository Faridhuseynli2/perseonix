import { recordAudit } from "@/lib/audit"
import { requireModule } from "@/lib/auth/dal"
import { INVESTIGATE_MODULE_KEY } from "@/lib/investigate/meta"
import { pdfFilename, renderInvestigationPdf } from "@/lib/investigate/pdf/document"
import { readCapture } from "@/lib/investigate/sandbox/storage"
import { getInvestigation } from "@/lib/investigate/store"

/** Renders the saved investigation as a branded PDF report. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireModule(INVESTIGATE_MODULE_KEY)
  const { id } = await params
  const investigation = await getInvestigation(user, id)

  const screenshot = investigation.report.sandbox?.data?.screenshot ? await readCapture(investigation.id) : null
  const data = { ...investigation, generatedAt: new Date(), generatedBy: user.name, screenshot }
  const pdf = await renderInvestigationPdf(data)

  await recordAudit({
    actor: { id: user.id, email: user.email },
    action: "investigation.exported",
    target: { type: "investigation", id: investigation.id, label: investigation.query },
    metadata: { format: "pdf" },
  })

  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${pdfFilename(data)}"`,
      "cache-control": "private, no-store",
    },
  })
}
