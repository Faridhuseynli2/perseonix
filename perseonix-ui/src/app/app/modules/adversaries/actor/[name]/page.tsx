import type { Metadata } from "next"
import { ActorIntel } from "@/components/adversaries/actor-intel"
import { requireModule } from "@/lib/auth/dal"
import { getGroup, resolveGroupSlug } from "@/lib/adversaries/data"
import { ADVERSARIES_MODULE_KEY } from "@/lib/adversaries/meta"
import { isWatching, osintSlug } from "@/lib/adversaries/watch"
import { newsForEntity } from "@/lib/intel/news"

export async function generateMetadata({
  params,
}: PageProps<"/app/modules/adversaries/actor/[name]">): Promise<Metadata> {
  const { name } = await params
  return { title: `${decodeURIComponent(name)} · Threat Actor` }
}

export default async function ActorIntelPage({ params }: PageProps<"/app/modules/adversaries/actor/[name]">) {
  const { user } = await requireModule(ADVERSARIES_MODULE_KEY)
  const { name: raw } = await params
  const name = decodeURIComponent(raw)

  const curatedSlug = resolveGroupSlug(name)
  const group = curatedSlug ? getGroup(curatedSlug) ?? null : null
  const queryNames = group ? [group.name, ...group.aliasNames] : [name]
  const watchSlug = group?.slug ?? osintSlug(name)

  const [intel, watching] = await Promise.all([
    newsForEntity("actor", queryNames),
    isWatching(user.id, watchSlug),
  ])

  return <ActorIntel name={name} group={group} intel={intel} watchSlug={watchSlug} watching={watching} />
}
