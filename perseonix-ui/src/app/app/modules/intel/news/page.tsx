import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, KeyRound, Newspaper } from "lucide-react"
import { NewsConsole } from "@/components/intel/news-console"
import { NewsFilters } from "@/components/intel/news-filters"
import { requireModule } from "@/lib/auth/dal"
import { getConnector, INTEL_MODULE_KEY } from "@/lib/intel/connectors"
import {
  computeCorroboration,
  getArticle,
  listArticlesAdvanced,
  listSavedFilters,
  newsFacets,
  newsStats,
  topMentions,
  type NewsFilter,
} from "@/lib/intel/news"
import { getOrgContext, scoreArticles } from "@/lib/intel/news-relevance"

export const metadata: Metadata = { title: "Threat News · Threat Intelligence" }

const RANGE_MIN: Record<string, number> = { "1h": 60, "24h": 1440, "3d": 4320, "7d": 10080, "30d": 43200 }

function ago(iso: string | null): string {
  if (!iso) return "—"
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return "<1h"
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default async function ThreatNewsPage({ searchParams }: PageProps<"/app/modules/intel/news">) {
  const { user } = await requireModule(INTEL_MODULE_KEY)
  const isAdmin = user.role === "admin"
  const connector = getConnector("news")!
  const sp = await searchParams

  const list = (k: string) => {
    const v = sp?.[k]
    return typeof v === "string" ? v.split(",").filter(Boolean) : []
  }
  const range = typeof sp?.range === "string" ? sp.range : ""
  const focusId = typeof sp?.a === "string" ? sp.a : ""

  const filter: NewsFilter = {
    severities: list("sev"),
    categories: list("cat"),
    sources: list("source"),
    regions: list("region"),
    ttps: list("ttp"),
    actors: list("actor"),
    malware: list("malware"),
    sectors: list("sector"),
    sinceMinutes: RANGE_MIN[range] ?? 0,
    limit: 300,
  }
  const hasFilter =
    range !== "" || Object.entries(filter).some(([k, v]) => Array.isArray(v) && v.length > 0 && k !== "limit")

  const [rowsBase, stats, facets, trendingActors, saved] = await Promise.all([
    listArticlesAdvanced(filter),
    newsStats(),
    newsFacets(),
    topMentions("actor", 8),
    listSavedFilters(user.id),
  ])

  // Deep-link focus: pull an out-of-filter article in so it can be selected.
  let rows = rowsBase
  if (focusId && !rows.some((r) => r.id === focusId)) {
    const focused = await getArticle(focusId)
    if (focused) rows = [focused, ...rows]
  }

  // Multi-source corroboration + org-relevance scoring (our differentiators).
  rows = await computeCorroboration(rows)
  rows = scoreArticles(rows, await getOrgContext(user))

  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      <Link
        href="/app/modules/intel"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Threat Intelligence
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.22em] text-glow uppercase">Threat Intelligence // Threat News</p>
          <h1 className="mt-2 flex items-center gap-2.5 font-display text-[26px] leading-none font-semibold tracking-tight text-ink lg:text-[30px]">
            <Newspaper className="size-6 text-glow" />
            Threat News
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span>{stats.total} articles</span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            <span>{stats.last24h} in last 24h</span>
            <span aria-hidden className="text-muted-foreground/30">/</span>
            <span>updated {ago(stats.lastAt)} ago</span>
          </div>
        </div>
        {isAdmin && (
          <Link
            href="/app/admin/connectors/modules?connector=news"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/12 bg-ink/[0.03] px-3 text-sm text-foreground/85 transition-colors hover:bg-ink/[0.07] hover:text-ink"
          >
            <KeyRound className="size-4" />
            Ingestion key
          </Link>
        )}
      </header>

      <NewsFilters facets={facets} savedFilters={saved} />

      <NewsConsole
        rows={rows}
        trendingActors={trendingActors}
        hasFilter={hasFilter}
        endpoint={connector.endpoint}
        initialSelectedId={focusId || undefined}
      />
    </div>
  )
}
