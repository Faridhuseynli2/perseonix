import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AdversaryProfile } from "@/components/adversaries/adversary-profile"
import { requireModule } from "@/lib/auth/dal"
import { getActorCampaigns, getGroup, getMitre, getRegion, relatedGroups } from "@/lib/adversaries/data"
import { ADVERSARIES_MODULE_KEY } from "@/lib/adversaries/meta"
import { isWatching } from "@/lib/adversaries/watch"

export async function generateMetadata({
  params,
}: PageProps<"/app/modules/adversaries/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const group = getGroup(slug)
  return { title: group ? `${group.name} · Adversary Intelligence` : "Threat actor" }
}

export default async function AdversaryProfilePage({
  params,
}: PageProps<"/app/modules/adversaries/[slug]">) {
  const { user } = await requireModule(ADVERSARIES_MODULE_KEY)
  const { slug } = await params
  const group = getGroup(slug)
  if (!group) notFound()

  return (
    <AdversaryProfile
      group={group}
      region={getRegion(group.region)}
      related={relatedGroups(group)}
      mitre={getMitre(group.slug)}
      campaigns={getActorCampaigns(group.slug)}
      watching={await isWatching(user.id, group.slug)}
    />
  )
}
