import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, UserPlus } from "lucide-react"
import { CustomerForm } from "@/components/admin/customer-form"
import { Notice, PageHeader, Panel, PlanBadge, StatusBadge, TermBadge } from "@/components/admin/ui"
import { Button, buttonVariants } from "@/components/ui/button"
import { getCustomerDetail } from "@/lib/admin/queries"
import { auditLabel } from "@/lib/audit-labels"
import { PLAN_LABELS, formatDate, termStatus } from "@/lib/customers"
import { formatDateTime, initials } from "@/lib/format"
import { cn } from "@/lib/utils"
import { deleteCustomer, updateCustomer } from "../actions"

export const metadata: Metadata = {
  title: "Customer details",
}

const notices: Record<string, string> = {
  created: "Customer created. Add the users who should get access.",
}

export default async function CustomerDetailPage({
  params,
  searchParams,
}: PageProps<"/app/admin/customers/[id]">) {
  const { id } = await params
  const { notice } = await searchParams
  const customer = await getCustomerDetail(id)

  const term = termStatus(customer.plan, customer.endsAt)
  const activeUsers = customer.users.filter((u) => u.status === "active" && u.role === "user").length
  const noticeText = typeof notice === "string" ? notices[notice] : undefined

  const facts: [string, string][] = [
    ["Plan", PLAN_LABELS[customer.plan]],
    [customer.plan === "poc" ? "POC window" : "License term", `${formatDate(customer.startsAt)} → ${formatDate(customer.endsAt)}`],
    [
      "Time remaining",
      term.daysLeft === null ? "Open-ended" : term.daysLeft < 0 ? `Ended ${-term.daysLeft} days ago` : `${term.daysLeft} days`,
    ],
    ["Seats in use", `${activeUsers} / ${customer.seatLimit ?? "unlimited"}`],
    ["Customer since", formatDateTime(customer.createdAt)],
  ]

  return (
    <div className="mx-auto max-w-[1400px]">
      <Link
        href="/app/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        All customers
      </Link>
      <div className="mt-4">
        <PageHeader
          eyebrow={customer.plan === "poc" ? "Proof of concept" : "Licensed customer"}
          title={customer.name}
          description={
            [customer.contactName, customer.contactEmail].filter(Boolean).join(" · ") || undefined
          }
          actions={
            <>
              <PlanBadge plan={customer.plan} />
              <TermBadge status={term} />
            </>
          }
        />
      </div>

      {noticeText && (
        <div className="mt-6">
          <Notice tone="success">{noticeText}</Notice>
        </div>
      )}
      {customer.users.length === 0 && (
        <div className="mt-6">
          <Notice tone="info">
            {customer.name} has no sign-in accounts yet.{" "}
            <Link
              href={`/app/admin/users/new?organizationId=${customer.id}`}
              className="font-medium underline underline-offset-2"
            >
              Add a user
            </Link>{" "}
            — a temporary password is generated and shown once, ready to send.
          </Notice>
        </div>
      )}
      {term.tone === "ended" && (
        <div className="mt-6">
          <Notice tone="error">
            {customer.plan === "poc"
              ? `This POC ended on ${formatDate(customer.endsAt)}. Its users are signed out and can't sign in — extend the end date or convert to Licensed to restore access.`
              : `This license expired on ${formatDate(customer.endsAt)}. Users still have access; renew the term or disable them.`}
          </Notice>
        </div>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Panel title="Plan & details" description="Commercial status, term, seats and contact.">
          <CustomerForm
            mode="edit"
            action={updateCustomer.bind(null, customer.id)}
            defaults={{
              name: customer.name,
              plan: customer.plan,
              startsAt: customer.startsAt,
              endsAt: customer.endsAt,
              seatLimit: customer.seatLimit,
              contactName: customer.contactName,
              contactEmail: customer.contactEmail,
              notes: customer.notes,
            }}
          />
        </Panel>

        <div className="grid content-start gap-6">
          <Panel title="At a glance">
            <dl className="grid gap-3 text-sm">
              {facts.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right text-foreground/90">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel
            flush
            title={`Users · ${customer.users.length}`}
            description="Accounts opened for this company."
            action={
              <Link
                href={`/app/admin/users/new?organizationId=${customer.id}`}
                className={cn(buttonVariants(), "h-8 gap-1.5 rounded-md px-3 text-xs")}
              >
                <UserPlus />
                Add user
              </Link>
            }
          >
            {customer.users.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                No users yet. Add the first account for {customer.name}.
              </p>
            ) : (
              <ul className="divide-y divide-ink/[0.05]">
                {customer.users.map((user) => (
                  <li key={user.id}>
                    <Link
                      href={`/app/admin/users/${user.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-ink/[0.02]"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-navy-600 font-mono text-[11px] font-semibold text-glow ring-1 ring-ink/10">
                        {initials(user.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{user.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {user.email}
                          {user.modules.length > 0 && ` · ${user.modules.map((m) => m.key.toUpperCase()).join(", ")}`}
                        </span>
                      </span>
                      <StatusBadge status={user.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            tone="danger"
            title="Delete customer"
            description={
              customer.users.length === 0
                ? "Removes the company record. Audit history is kept."
                : "Delete or move this company's users first."
            }
          >
            <form action={deleteCustomer.bind(null, customer.id)}>
              <Button
                type="submit"
                variant="destructive"
                disabled={customer.users.length > 0}
                className="h-10 w-full rounded-md"
              >
                Delete customer
              </Button>
            </form>
          </Panel>

          <Panel title="Recent activity">
            {customer.activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <ul className="divide-y divide-ink/[0.05]">
                {customer.activity.map((entry) => (
                  <li key={entry.id} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="text-sm text-ink">{auditLabel(entry.action)}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      {formatDateTime(entry.createdAt)} · {entry.actorEmail ?? "system"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
