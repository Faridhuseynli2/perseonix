import type { Metadata } from "next"
import { CampaignActivity } from "@/components/adversaries/campaign-activity"
import { requireModule } from "@/lib/auth/dal"
import { campaignYears } from "@/lib/adversaries/data"
import { ADVERSARIES_MODULE_KEY } from "@/lib/adversaries/meta"

export const metadata: Metadata = {
  title: "Threat activity",
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""

export default async function ActivityPage({
  searchParams,
}: PageProps<"/app/modules/adversaries/activity">) {
  await requireModule(ADVERSARIES_MODULE_KEY)
  const params = await searchParams

  const yearParam = Number(one(params.year))
  const year = campaignYears().some((y) => y.year === yearParam) ? yearParam : 0

  return (
    <CampaignActivity
      query={{
        q: one(params.q).slice(0, 100),
        vendor: one(params.vendor),
        year,
        page: Math.max(1, Number(one(params.page)) || 1),
      }}
    />
  )
}
