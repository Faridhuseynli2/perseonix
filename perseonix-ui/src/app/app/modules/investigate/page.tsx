import type { Metadata } from "next"
import Link from "next/link"
import { EmptyState, Panel, tableHeadClass } from "@/components/admin/ui"
import { InvestigateForm } from "@/components/investigate/investigate-form"
import { KindBadge, VerdictBadge } from "@/components/investigate/report"
import { requireModule } from "@/lib/auth/dal"
import { formatDateTime } from "@/lib/format"
import { INVESTIGATE_MODULE_KEY, SOURCES, SOURCE_GROUPS } from "@/lib/investigate/meta"
import { investigationSources } from "@/lib/investigate/run"
import { getInvestigationUsage, listRecentInvestigations } from "@/lib/investigate/store"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Threat Investigation",
}

export default async function InvestigatePage({
  searchParams,
}: PageProps<"/app/modules/investigate">) {
  const { user, module } = await requireModule(INVESTIGATE_MODULE_KEY)
  const { q } = await searchParams
  const [recent, usage] = await Promise.all([
    listRecentInvestigations(user),
    getInvestigationUsage(user),
  ])
  const sources = await investigationSources()
  const enabledCount = sources.filter((source) => source.enabled).length
  const isAdmin = user.role === "admin"
  const percent = usage.limit ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0

  return (
    <div className="mx-auto max-w-[1400px]">
      <div>
        <p className="eyebrow text-glow">Module</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{module.name}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Investigate domains, IP addresses and URLs across {enabledCount} intelligence sources.
        </p>
      </div>

      <section className="relative mt-8 overflow-hidden rounded-2xl border border-ink/[0.07] bg-navy-800/60 p-6 lg:p-8">
        <div aria-hidden className="dot-backdrop pointer-events-none absolute inset-0 opacity-50" />
        <div className="relative">
          <InvestigateForm initialQuery={typeof q === "string" ? q.slice(0, 2048) : ""} />
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          flush
          title="Recent investigations"
          description={
            isAdmin
              ? "Across every customer."
              : user.organizationName
                ? `Shared with everyone at ${user.organizationName}.`
                : "Your recent lookups."
          }
        >
          {recent.length === 0 ? (
            <EmptyState
              title="No investigations yet"
              body="Search above to run your first lookup. Every report is saved here for your team."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-ink/[0.06]">
                  <tr>
                    <th scope="col" className={tableHeadClass}>Target</th>
                    <th scope="col" className={tableHeadClass}>Verdict</th>
                    <th scope="col" className={tableHeadClass}>Top finding</th>
                    <th scope="col" className={tableHeadClass}>By</th>
                    <th scope="col" className={tableHeadClass}>When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/[0.05]">
                  {recent.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-ink/[0.02]">
                      <td className="max-w-[26rem] px-5 py-3">
                        <Link
                          href={`/app/modules/investigate/${row.id}`}
                          className="block truncate font-mono text-[13px] text-ink hover:text-glow"
                        >
                          {row.query}
                        </Link>
                        <span className="mt-1 flex">
                          <KindBadge kind={row.kind} />
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <VerdictBadge verdict={row.verdict} />
                      </td>
                      <td className="max-w-[18rem] px-5 py-3 text-foreground/80">
                        <span className="line-clamp-1">{row.topSignal ?? "—"}</span>
                        {row.signalCount > 1 && (
                          <span className="text-xs text-muted-foreground">+{row.signalCount - 1} more</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {row.userName ?? "—"}
                        {isAdmin && row.organizationName && (
                          <span className="block text-foreground/70">{row.organizationName}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs whitespace-nowrap text-muted-foreground">
                        {formatDateTime(row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="grid content-start gap-6">
          <Panel title="Today's usage">
            {usage.limit === null ? (
              <p className="text-sm text-muted-foreground">
                <span className="text-2xl font-semibold text-ink tabular-nums">{usage.used}</span>{" "}
                today · unlimited for administrators
              </p>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-2xl font-semibold text-ink tabular-nums">
                    {usage.used}
                    <span className="text-sm font-normal text-muted-foreground"> / {usage.limit}</span>
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">Resets 00:00 UTC</span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Investigations used today"
                  aria-valuenow={usage.used}
                  aria-valuemin={0}
                  aria-valuemax={usage.limit}
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/[0.06]"
                >
                  <div
                    className={cn(
                      "h-full rounded-full",
                      percent >= 90 ? "bg-signal" : "bg-linear-to-r from-brand to-glow"
                    )}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </>
            )}
          </Panel>

          <Panel title="Intelligence sources">
            <div className="grid gap-5">
              {SOURCE_GROUPS.map((group) => (
                <div key={group.key}>
                  <p className="eyebrow text-[10px]">{group.label}</p>
                  <ul className="mt-2.5 grid gap-3">
                    {sources
                      .filter((source) => SOURCES[source.key].group === group.key)
                      .map(({ key, enabled }) => (
                        <li key={key} className="flex items-start gap-3">
                          <span
                            aria-hidden
                            className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", enabled ? "bg-ok" : "bg-ink/20")}
                          />
                          <span className="min-w-0">
                            <span className={cn("block text-sm", enabled ? "text-ink" : "text-muted-foreground")}>
                              {SOURCES[key].label}
                              <span className="font-normal text-muted-foreground"> · {SOURCES[key].provider}</span>
                            </span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                              {enabled ? SOURCES[key].description : "Not configured"}
                            </span>
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
