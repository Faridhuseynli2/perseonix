import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { CveDetail } from "@/components/intel/cve-detail"
import { requireModule } from "@/lib/auth/dal"
import { INTEL_MODULE_KEY } from "@/lib/intel/connectors"
import { getCve } from "@/lib/intel/cve"

export async function generateMetadata({ params }: PageProps<"/app/modules/intel/cve/[cveId]">): Promise<Metadata> {
  const { cveId } = await params
  return { title: `${decodeURIComponent(cveId)} · CVE Feed` }
}

export default async function CveDetailPage({ params }: PageProps<"/app/modules/intel/cve/[cveId]">) {
  await requireModule(INTEL_MODULE_KEY)
  const { cveId } = await params
  const cve = await getCve(decodeURIComponent(cveId))
  if (!cve) notFound()
  return <CveDetail cve={cve} />
}
