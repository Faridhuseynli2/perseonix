import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import {
  EmptyState,
  Notice,
  PageHeader,
  Panel,
  TermBadge,
  tableHeadClass,
} from "@/components/admin/ui"
import { buttonVariants } from "@/components/ui/button"
import { listCustomers } from "@/lib/admin/queries"
import { formatDate, termStatus, todayIso } from "@/lib/customers"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Customers",
}

type Customer = Awaited<ReturnType<typeof listCustomers>>[number]

function CustomerTable({
  customers,
  kind,
  today,
}: {
  customers: Customer[]
  kind: "poc" | "licensed"
  today: string
}) {
  if (customers.length === 0) {
    return (
      <EmptyState
        title={kind === "poc" ? "No POCs running" : "No licensed customers yet"}
        body={
          kind === "poc"
            ? "Start a proof of concept to give a prospect time-boxed access."
            : "Convert a POC or create a licensed customer to see it here."
        }
      />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead className="border-b border-ink/[0.06]">
          <tr>
            <th scope="col" className={tableHeadClass}>Company</th>
            <th scope="col" className={tableHeadClass}>
              {kind === "poc" ? "POC window" : "License term"}
            </th>
            <th scope="col" className={tableHeadClass}>Status</th>
            <th scope="col" className={tableHeadClass}>Seats</th>
            <th scope="col" className={tableHeadClass}>Contact</th>
            <th scope="col" className={tableHeadClass}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/[0.05]">
          {customers.map((customer) => {
            const term = termStatus(customer.plan, customer.endsAt, today)
            const full = customer.seatLimit !== null && customer.activeUsers >= customer.seatLimit
            return (
              <tr key={customer.id} className="transition-colors hover:bg-ink/[0.02]">
                <td className="px-5 py-3.5">
                  <Link
                    href={`/app/admin/customers/${customer.id}`}
                    className="font-medium text-ink hover:text-glow"
                  >
                    {customer.name}
                  </Link>
                  <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                    {customer.userCount} {customer.userCount === 1 ? "user" : "users"}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-xs whitespace-nowrap text-foreground/80">
                  {formatDate(customer.startsAt)} → {formatDate(customer.endsAt)}
                </td>
                <td className="px-5 py-3.5">
                  <TermBadge status={term} />
                </td>
                <td className="px-5 py-3.5 tabular-nums">
                  <span className={full ? "text-signal" : "text-foreground/85"}>
                    {customer.activeUsers}
                  </span>
                  <span className="text-muted-foreground"> / {customer.seatLimit ?? "∞"}</span>
                </td>
                <td className="px-5 py-3.5">
                  {customer.contactName || customer.contactEmail ? (
                    <>
                      <span className="block text-foreground/85">{customer.contactName ?? "—"}</span>
                      <span className="block text-xs text-muted-foreground">
                        {customer.contactEmail}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/app/admin/customers/${customer.id}`}
                    className="text-xs font-medium text-glow hover:text-ink"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default async function CustomersPage({
  searchParams,
}: PageProps<"/app/admin/customers">) {
  const { notice } = await searchParams
  const customers = await listCustomers()
  const today = todayIso()

  const pocs = customers.filter((c) => c.plan === "poc")
  const licensed = customers.filter((c) => c.plan === "licensed")
  const terms = customers.map((c) => termStatus(c.plan, c.endsAt, today))

  const summary = [
    { label: "Licensed customers", value: licensed.length },
    {
      label: "Active POCs",
      value: pocs.filter((c) => termStatus(c.plan, c.endsAt, today).tone !== "ended").length,
    },
    { label: "Ending within 14 days", value: terms.filter((t) => t.tone === "ending").length, warn: true },
    { label: "Ended / expired", value: terms.filter((t) => t.tone === "ended").length },
  ]

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        eyebrow="Management"
        title="Customers"
        description="Every company with access to Perseonix Corvael — evaluations and paying customers kept apart."
        actions={
          <Link
            href="/app/admin/customers/new"
            className={cn(buttonVariants(), "h-9 gap-2 rounded-md px-4")}
          >
            <Plus />
            New customer
          </Link>
        }
      />

      {notice === "deleted" && (
        <div className="mt-6">
          <Notice tone="success">Customer deleted.</Notice>
        </div>
      )}

      <dl className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <div
            key={item.label}
            className="flex flex-col rounded-xl border border-ink/[0.07] bg-navy-800/60 p-5"
          >
            <dt className="mt-1 text-xs text-muted-foreground">{item.label}</dt>
            <dd
              className={cn(
                "order-first text-3xl font-semibold tracking-tight tabular-nums",
                item.warn && item.value > 0 ? "text-signal" : "text-ink"
              )}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-6">
        <Panel
          flush
          title={`Proof of concept · ${pocs.length}`}
          description="Time-boxed evaluations. Users lose access automatically after the end date; convert a company to Licensed from its page when the deal closes."
        >
          <CustomerTable customers={pocs} kind="poc" today={today} />
        </Panel>
        <Panel
          flush
          title={`Licensed customers · ${licensed.length}`}
          description="Paying customers and their contract terms."
        >
          <CustomerTable customers={licensed} kind="licensed" today={today} />
        </Panel>
      </div>
    </div>
  )
}
