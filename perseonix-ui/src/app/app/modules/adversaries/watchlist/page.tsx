import type { Metadata } from "next"
import { WatchlistView } from "@/components/adversaries/watchlist-view"
import { requireModule } from "@/lib/auth/dal"
import { ADVERSARIES_MODULE_KEY } from "@/lib/adversaries/meta"
import { listWatchlist } from "@/lib/adversaries/watch"

export const metadata: Metadata = {
  title: "My watchlist",
}

export default async function WatchlistPage() {
  const { user } = await requireModule(ADVERSARIES_MODULE_KEY)
  const actors = await listWatchlist(user.id)
  return <WatchlistView actors={actors} />
}
