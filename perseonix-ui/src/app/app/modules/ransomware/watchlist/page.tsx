import type { Metadata } from "next"
import { RansomwareWatchlistView } from "@/components/ransomware/watchlist-view"
import { requireModule } from "@/lib/auth/dal"
import { RANSOMWARE_MODULE_KEY } from "@/lib/ransomware/meta"
import { listWatches } from "@/lib/ransomware/watch"

export const metadata: Metadata = { title: "Watchlist · Ransomware Tracker" }

export default async function RansomwareWatchlistPage() {
  const { user } = await requireModule(RANSOMWARE_MODULE_KEY)
  const watches = await listWatches(user.id)
  return <RansomwareWatchlistView watches={watches} />
}
