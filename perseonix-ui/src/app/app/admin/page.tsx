import type { Metadata } from "next"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  FlaskConical,
  TriangleAlert,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react"
import { PageHeader, Panel, PlanBadge, TermBadge } from "@/components/admin/ui"
import { buttonVariants } from "@/components/ui/button"
import { getAdminOverview } from "@/lib/admin/queries"
import { auditLabel } from "@/lib/audit-labels"
import { ENDING_SOON_DAYS, formatDate } from "@/lib/customers"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Administration",
}

type Tile = {
  label: string
  value: number
  hint: string
  icon: LucideIcon
  href?: string
  warn?: boolean
}

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview()

  const tiles: Tile[] = [
    {
      label: "Licensed customers",
      value: overview.licensedCustomers,
      hint: "Paying companies",
      icon: BadgeCheck,
      href: "/app/admin/customers",
    },
    {
      label: "Active POCs",
      value: overview.activePocs,
      hint: "Evaluations in progress",
      icon: FlaskConical,
      href: "/app/admin/customers",
    },
    {
      label: "Ending soon",
      value: overview.endingSoon,
      hint: `POCs & licenses · ${ENDING_SOON_DAYS} days`,
      icon: CalendarClock,
      href: "/app/admin/customers",
      warn: overview.endingSoon > 0,
    },
    {
      label: "Active users",
      value: overview.activeUsers,
      hint: `${overview.users} total · ${overview.users - overview.activeUsers} disabled`,
      icon: Users,
      href: "/app/admin/users",
    },
    {
      label: "Active sessions",
      value: overview.activeSessions,
      hint: "Signed in right now",
      icon: Activity,
    },
    {
      label: "Failed sign-ins",
      value: overview.failedLogins24h,
      hint: "Last 24 hours",
      icon: TriangleAlert,
      warn: overview.failedLogins24h > 0,
    },
  ]

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        eyebrow="Management"
        title="Platform overview"
        description="Customers, evaluations, accounts and security activity across Perseonix Corvael."
        actions={
          <>
            <Link
              href="/app/admin/customers/new"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-9 rounded-md border-ink/10 bg-ink/[0.03] px-4 hover:bg-ink/[0.07]"
              )}
            >
              New customer
            </Link>
            <Link href="/app/admin/users/new" className={cn(buttonVariants(), "h-9 gap-2 rounded-md px-4")}>
              <UserPlus />
              New user
            </Link>
          </>
        }
      />

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {tiles.map(({ label, value, hint, icon: Icon, href, warn }) => {
          const body = (
            <>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="grid size-8 place-items-center rounded-md bg-brand/10 ring-1 ring-brand/20">
                  <Icon className={cn("size-4", warn ? "text-signal" : "text-glow")} />
                </span>
              </div>
              <p
                className={cn(
                  "mt-4 text-3xl font-semibold tracking-tight tabular-nums",
                  warn ? "text-signal" : "text-ink"
                )}
              >
                {value}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">{hint}</p>
            </>
          )
          const tileClass = "block h-full rounded-xl border border-ink/[0.07] bg-navy-800/60 p-5"
          return (
            <li key={label}>
              {href ? (
                <Link href={href} className={cn(tileClass, "transition-colors hover:border-brand/30")}>
                  {body}
                </Link>
              ) : (
                <div className={tileClass}>{body}</div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-6">
          <Panel
            flush
            title="Upcoming deadlines"
            description="POCs ending and licenses up for renewal in the next 30 days, plus any that lapsed recently."
            action={
              <Link
                href="/app/admin/customers"
                className="inline-flex items-center gap-1 text-xs font-medium text-glow hover:text-ink"
              >
                All customers
                <ArrowRight className="size-3.5" />
              </Link>
            }
          >
            {overview.deadlines.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                Nothing due in the next 30 days.
              </p>
            ) : (
              <ul className="divide-y divide-ink/[0.05]">
                {overview.deadlines.map((customer) => (
                  <li key={customer.id}>
                    <Link
                      href={`/app/admin/customers/${customer.id}`}
                      className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5 transition-colors hover:bg-ink/[0.02]"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                        {customer.name}
                      </span>
                      <PlanBadge plan={customer.plan} />
                      <span className="w-28 font-mono text-[11px] text-muted-foreground">
                        {customer.plan === "poc" ? "Ends" : "Renews"} {formatDate(customer.endsAt)}
                      </span>
                      <TermBadge status={customer.term} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Recent activity"
            description="The latest audited events on the platform."
            action={
              <Link
                href="/app/admin/audit"
                className="inline-flex items-center gap-1 text-xs font-medium text-glow hover:text-ink"
              >
                Full audit log
                <ArrowRight className="size-3.5" />
              </Link>
            }
          >
            {overview.recentAudit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <ul className="divide-y divide-ink/[0.05]">
                {overview.recentAudit.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink">
                        {auditLabel(entry.action)}
                        {entry.targetLabel && (
                          <span className="text-muted-foreground"> · {entry.targetLabel}</span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        by {entry.actorEmail ?? "system"}
                      </p>
                    </div>
                    <time
                      dateTime={entry.createdAt.toISOString()}
                      className="shrink-0 font-mono text-[11px] text-muted-foreground"
                    >
                      {formatDateTime(entry.createdAt)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Module catalog" description="Modules available to license to users.">
          <ul className="grid gap-3">
            {overview.modules.map((m) => (
              <li key={m.key} className="rounded-lg border border-ink/[0.07] bg-navy-900/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-ink">{m.name}</p>
                  <span className="font-mono text-[10px] text-muted-foreground uppercase">{m.key}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.description}</p>
                <p className="mt-3 font-mono text-[11px] text-glow">
                  {m.grants} {m.grants === 1 ? "user" : "users"} licensed
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
