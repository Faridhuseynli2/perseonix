import type { Metadata } from "next"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ModuleHeader } from "@/components/ransomware/module-header"
import { EmptyData, VictimList } from "@/components/ransomware/pieces"
import { VictimFilterBar } from "@/components/ransomware/victim-filter-bar"
import { requireModule } from "@/lib/auth/dal"
import { facets, lastIngestion, listVictims } from "@/lib/ransomware/data"
import { RANSOMWARE_MODULE_KEY } from "@/lib/ransomware/meta"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Victims · Ransomware Tracker" }

const PER_PAGE = 40
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ""

export default async function RansomwareVictimsPage({
  searchParams,
}: PageProps<"/app/modules/ransomware/victims">) {
  const { user } = await requireModule(RANSOMWARE_MODULE_KEY)
  const params = await searchParams

  const q = one(params.q).slice(0, 200)
  const country = one(params.country)
  const sector = one(params.sector)
  const page = Math.max(1, Number(one(params.page)) || 1)

  const [{ items, total }, facetData, ingestion] = await Promise.all([
    listVictims(q, "all", { page, perPage: PER_PAGE, country: country || undefined, sector: sector || undefined }),
    facets(),
    lastIngestion(),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  const current = Math.min(page, totalPages)

  const buildQuery = (nextPage: number) => {
    const p = new URLSearchParams()
    if (q) p.set("q", q)
    if (country) p.set("country", country)
    if (sector) p.set("sector", sector)
    if (nextPage > 1) p.set("page", String(nextPage))
    const s = p.toString()
    return `/app/modules/ransomware/victims${s ? `?${s}` : ""}`
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <ModuleHeader lastIngestion={ingestion} canRefresh={user.role === "admin"} />

      <VictimFilterBar
        value={{ q, country, sector }}
        countries={facetData.countries}
        sectors={facetData.sectors}
        resultCount={total}
      />

      {items.length === 0 ? (
        <EmptyData canRefresh={user.role === "admin"} />
      ) : (
        <>
          <VictimList items={items} />

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
