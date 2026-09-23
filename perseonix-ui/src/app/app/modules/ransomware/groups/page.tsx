import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { GroupCard } from "@/components/ransomware/group-card"
import { ModuleHeader } from "@/components/ransomware/module-header"
import { EmptyData } from "@/components/ransomware/pieces"
import { GroupSearch } from "@/components/ransomware/group-search"
import { requireModule } from "@/lib/auth/dal"
import { lastIngestion, listGroups } from "@/lib/ransomware/data"
import { RANSOMWARE_MODULE_KEY } from "@/lib/ransomware/meta"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Groups · Ransomware Tracker" }

const PER_PAGE = 24
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""

export default async function RansomwareGroupsPage({
  searchParams,
}: PageProps<"/app/modules/ransomware/groups">) {
  const { user } = await requireModule(RANSOMWARE_MODULE_KEY)
  const params = await searchParams

  const q = one(params.q).slice(0, 100)
  const page = Math.max(1, Number(one(params.page)) || 1)

  const [{ items, total }, ingestion] = await Promise.all([
    listGroups({ q }, page, PER_PAGE),
    lastIngestion(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const current = Math.min(page, totalPages)

  const buildQuery = (nextPage: number) => {
    const p = new URLSearchParams()
    if (q) p.set("q", q)
    if (nextPage > 1) p.set("page", String(nextPage))
    const s = p.toString()
    return `/app/modules/ransomware/groups${s ? `?${s}` : ""}`
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <ModuleHeader lastIngestion={ingestion} canRefresh={user.role === "admin"} />

      <GroupSearch value={q} resultCount={total} />

      {items.length === 0 ? (
        <EmptyData canRefresh={user.role === "admin"} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((group) => (
              <GroupCard key={group.slug} group={group} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <Link
                href={buildQuery(current - 1)}
                aria-disabled={current <= 1}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/10 px-3 text-sm transition-colors",
                  current <= 1
                    ? "pointer-events-none text-muted-foreground/40"
                    : "text-muted-foreground hover:bg-ink/[0.04] hover:text-ink"
                )}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Link>
              <span className="font-mono text-xs text-muted-foreground">
                Page {current} of {totalPages}
              </span>
              <Link
                href={buildQuery(current + 1)}
                aria-disabled={current >= totalPages}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/10 px-3 text-sm transition-colors",
                  current >= totalPages
                    ? "pointer-events-none text-muted-foreground/40"
                    : "text-muted-foreground hover:bg-ink/[0.04] hover:text-ink"
                )}
              >
                Next
                <ChevronRight className="size-4" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}
