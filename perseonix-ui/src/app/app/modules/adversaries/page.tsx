import type { Metadata } from "next"
import { AdversaryDirectory } from "@/components/adversaries/adversary-directory"
import { requireModule } from "@/lib/auth/dal"
import { resolveGroupSlug } from "@/lib/adversaries/data"
import { ADVERSARIES_MODULE_KEY, CATEGORY_KEYS, REGION_KEYS } from "@/lib/adversaries/meta"
import { searchNewsActors, topMentions } from "@/lib/intel/news"

export const metadata: Metadata = {
  title: "Adversary Intelligence",
}

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? ""
}

export default async function AdversariesPage({
  searchParams,
}: PageProps<"/app/modules/adversaries">) {
  await requireModule(ADVERSARIES_MODULE_KEY)
  const params = await searchParams

  const region = (REGION_KEYS as readonly string[]).includes(one(params.region)) ? one(params.region) : ""
  const category = (CATEGORY_KEYS as readonly string[]).includes(one(params.category)) ? one(params.category) : ""
  const q = one(params.q).slice(0, 100)

  // Actors seen in Threat News but NOT in the curated APT dataset = "emerging" (dynamic).
  const [osintActors, allNewsActors] = await Promise.all([
    q ? searchNewsActors(q, 12) : Promise.resolve([]),
    topMentions("actor", 1000),
  ])
  const emergingCount = allNewsActors.filter((a) => !resolveGroupSlug(a.value)).length

  return (
    <AdversaryDirectory
      query={{ q, region, category, page: Math.max(1, Number(one(params.page)) || 1) }}
      osintActors={osintActors.filter((a) => !resolveGroupSlug(a.value))}
      emergingCount={emergingCount}
    />
  )
}
