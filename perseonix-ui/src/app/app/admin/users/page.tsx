import type { Metadata } from "next"
import { Fragment } from "react"
import Form from "next/form"
import Link from "next/link"
import { Search, UserPlus } from "lucide-react"
import {
  EmptyState,
  Notice,
  PageHeader,
  Panel,
  PlanBadge,
  RoleBadge,
  StatusBadge,
  TermBadge,
  fieldClass,
  tableHeadClass,
} from "@/components/admin/ui"
import { buttonVariants } from "@/components/ui/button"
import { listUsers } from "@/lib/admin/queries"
import { formatDate, termStatus, todayIso, type CustomerPlan } from "@/lib/customers"
import { formatDateTime, initials } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Users",
}

type UserRow = Awaited<ReturnType<typeof listUsers>>[number]
type Segment = "licensed" | "poc" | "internal"

const SEGMENTS: { key: "all" | Segment; label: string }[] = [
  { key: "all", label: "All users" },
  { key: "licensed", label: "Licensed customers" },
  { key: "poc", label: "Proof of concept" },
  { key: "internal", label: "Internal staff" },
]

function segmentOf(user: UserRow): Segment {
  if (user.role === "admin" || !user.organizationId || !user.plan) return "internal"
  return user.plan
}

type CompanyGroup = {
  id: string
  name: string
  plan: CustomerPlan
  endsAt: string | null
  seatLimit: number | null
  users: UserRow[]
}

function groupByCompany(rows: UserRow[]) {
  const groups = new Map<string, CompanyGroup>()
  for (const row of rows) {
    if (!row.organizationId || !row.plan) continue
    const group = groups.get(row.organizationId) ?? {
      id: row.organizationId,
      name: row.organizationName ?? "—",
      plan: row.plan,
      endsAt: row.endsAt,
      seatLimit: row.seatLimit,
      users: [],
    }
    group.users.push(row)
    groups.set(row.organizationId, group)
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

function UserCell({ user }: { user: UserRow }) {
  return (
    <Link href={`/app/admin/users/${user.id}`} className="group flex items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-navy-600 font-mono text-[11px] font-semibold text-glow ring-1 ring-ink/10">
        {initials(user.name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-medium text-ink group-hover:text-glow">{user.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
      </span>
    </Link>
  )
}

function ModulesCell({ user }: { user: UserRow }) {
  if (user.role === "admin") return <span className="text-xs text-muted-foreground">All modules</span>
  if (user.modules.length === 0) return <span className="text-xs text-muted-foreground">None</span>
  return (
    <span className="flex flex-wrap gap-1.5">
      {user.modules.map((m) => (
        <span
          key={m.key}
          title={m.name}
          className="rounded border border-brand/25 bg-brand/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-foreground/85 uppercase"
        >
          {m.key}
        </span>
      ))}
    </span>
  )
}

function ManageCell({ user }: { user: UserRow }) {
  return (
    <td className="px-5 py-3 text-right">
      <Link href={`/app/admin/users/${user.id}`} className="text-xs font-medium text-glow hover:text-ink">
        Manage
      </Link>
    </td>
  )
}

function CustomerSegmentPanel({ segment, rows }: { segment: "licensed" | "poc"; rows: UserRow[] }) {
  const groups = groupByCompany(rows)
  const today = todayIso()
  const title = segment === "poc" ? "Proof of concept" : "Licensed customers"

  return (
    <Panel
      flush
      title={`${title} · ${plural(rows.length, "user", "users")} at ${plural(groups.length, "company", "companies")}`}
      description={
        segment === "poc"
          ? "Accounts opened for companies that are evaluating Perseonix Corvael."
          : "Accounts at paying customer companies."
      }
    >
      {rows.length === 0 ? (
        <EmptyState
          title={segment === "poc" ? "No POC users" : "No licensed users"}
          body="Open a customer and use “Add user” to create accounts for its employees."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-ink/[0.06]">
              <tr>
                <th scope="col" className={tableHeadClass}>User</th>
                <th scope="col" className={tableHeadClass}>Status</th>
                <th scope="col" className={tableHeadClass}>Modules</th>
                <th scope="col" className={tableHeadClass}>Last sign-in</th>
                <th scope="col" className={tableHeadClass}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const term = termStatus(group.plan, group.endsAt, today)
                const active = group.users.filter((u) => u.status === "active").length
                return (
                  <Fragment key={group.id}>
                    <tr className="border-y border-ink/[0.06] bg-navy-900/60">
                      <th scope="colgroup" colSpan={5} className="px-5 py-2.5 text-left font-normal">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          <Link
                            href={`/app/admin/customers/${group.id}`}
                            className="text-sm font-semibold text-ink hover:text-glow"
                          >
                            {group.name}
                          </Link>
                          <PlanBadge plan={group.plan} />
                          <TermBadge status={term} />
                          {group.plan === "poc" && term.tone === "ended" && (
                            <span className="text-xs text-alert">Sign-in blocked</span>
                          )}
                          {group.endsAt && (
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {group.plan === "poc" ? "POC ends" : "Renews"} {formatDate(group.endsAt)}
                            </span>
                          )}
                          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                            {active} / {group.seatLimit ?? "∞"} seats
                          </span>
                        </div>
                      </th>
                    </tr>
                    {group.users.map((user) => (
                      <tr key={user.id} className="border-b border-ink/[0.04] transition-colors hover:bg-ink/[0.02]">
                        <td className="py-3 pr-5 pl-9">
                          <UserCell user={user} />
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge status={user.status} />
                        </td>
                        <td className="px-5 py-3">
                          <ModulesCell user={user} />
                        </td>
                        <td className="px-5 py-3 font-mono text-xs whitespace-nowrap text-muted-foreground">
                          {formatDateTime(user.lastLoginAt)}
                        </td>
                        <ManageCell user={user} />
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

function InternalSegmentPanel({ rows }: { rows: UserRow[] }) {
  return (
    <Panel
      flush
      title={`Internal staff · ${plural(rows.length, "user", "users")}`}
      description="Perseonix administrators and accounts without a customer company."
    >
      {rows.length === 0 ? (
        <EmptyState title="No internal accounts" body="Administrators you create appear here." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-ink/[0.06]">
              <tr>
                <th scope="col" className={tableHeadClass}>User</th>
                <th scope="col" className={tableHeadClass}>Role</th>
                <th scope="col" className={tableHeadClass}>Status</th>
                <th scope="col" className={tableHeadClass}>Last sign-in</th>
                <th scope="col" className={tableHeadClass}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/[0.05]">
              {rows.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-ink/[0.02]">
                  <td className="px-5 py-3">
                    <UserCell user={user} />
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex flex-wrap items-center gap-2">
                      <RoleBadge role={user.role} />
                      {user.role === "user" && (
                        <span className="text-xs text-sev-high">No company assigned</span>
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-5 py-3 font-mono text-xs whitespace-nowrap text-muted-foreground">
                    {formatDateTime(user.lastLoginAt)}
                  </td>
                  <ManageCell user={user} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

export default async function UsersPage({ searchParams }: PageProps<"/app/admin/users">) {
  const { q, notice, segment: rawSegment } = await searchParams
  const query = typeof q === "string" ? q.trim().slice(0, 100) : ""
  const segment = SEGMENTS.find((s) => s.key === rawSegment)?.key ?? "all"

  const rows = await listUsers(query)
  const bySegment: Record<Segment, UserRow[]> = { licensed: [], poc: [], internal: [] }
  for (const row of rows) bySegment[segmentOf(row)].push(row)
  const counts = {
    all: rows.length,
    licensed: bySegment.licensed.length,
    poc: bySegment.poc.length,
    internal: bySegment.internal.length,
  }

  const hrefFor = (key: "all" | Segment) => {
    const params = new URLSearchParams()
    if (key !== "all") params.set("segment", key)
    if (query) params.set("q", query)
    const search = params.toString()
    return `/app/admin/users${search ? `?${search}` : ""}`
  }
  const visible: Segment[] = segment === "all" ? ["licensed", "poc", "internal"] : [segment]

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        eyebrow="Management"
        title="Users"
        description="Accounts grouped by the company they were opened for — licensed customers, POCs and internal staff kept apart."
        actions={
          <Link href="/app/admin/users/new" className={cn(buttonVariants(), "h-9 gap-2 rounded-md px-4")}>
            <UserPlus />
            New user
          </Link>
        }
      />

      {notice === "deleted" && (
        <div className="mt-6">
          <Notice tone="success">User deleted.</Notice>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-ink/[0.06]">
        <nav aria-label="User segments" className="-mb-px flex flex-wrap">
          {SEGMENTS.map((s) => {
            const active = s.key === segment
            return (
              <Link
                key={s.key}
                href={hrefFor(s.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 border-b-2 px-3.5 py-3 text-sm transition-colors",
                  active
                    ? "border-glow text-ink"
                    : "border-transparent text-muted-foreground hover:text-ink"
                )}
              >
                {s.label}
                <span className="rounded bg-ink/[0.06] px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
                  {counts[s.key]}
                </span>
              </Link>
            )
          })}
        </nav>
        <Form action="/app/admin/users" role="search" className="relative mb-2">
          {segment !== "all" && <input type="hidden" name="segment" value={segment} />}
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search name, email or company"
            aria-label="Search users"
            className={cn(fieldClass, "h-9 w-72 pl-9")}
          />
        </Form>
      </div>

      {query && (
        <p className="mt-4 text-sm text-muted-foreground">
          Showing results for “{query}”.{" "}
          <Link href={hrefFor(segment)} className="text-glow hover:text-ink" replace>
            Clear search
          </Link>
        </p>
      )}

      <div className="mt-6 grid gap-6">
        {visible.map((key) =>
          key === "internal" ? (
            <InternalSegmentPanel key={key} rows={bySegment.internal} />
          ) : (
            <CustomerSegmentPanel key={key} segment={key} rows={bySegment[key]} />
          )
        )}
      </div>
    </div>
  )
}
