import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { CustomerForm } from "@/components/admin/customer-form"
import { PageHeader, Panel } from "@/components/admin/ui"
import { listModules } from "@/lib/admin/queries"
import { addDaysIso, todayIso } from "@/lib/customers"
import { createCustomer } from "../actions"

export const metadata: Metadata = {
  title: "New customer",
}

export default async function NewCustomerPage() {
  const modules = await listModules()
  const today = todayIso()

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/app/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        All customers
      </Link>
      <div className="mt-4">
        <PageHeader
          eyebrow="Management"
          title="New customer"
          description="Register the company, choose POC or Licensed, and open the first sign-in account in one step."
        />
      </div>
      <Panel className="mt-8">
        <CustomerForm
          mode="create"
          action={createCustomer}
          modules={modules.map(({ key, name }) => ({ key, name }))}
          defaults={{
            name: "",
            plan: "poc",
            startsAt: today,
            // POCs typically run for 30 days.
            endsAt: addDaysIso(today, 30),
            seatLimit: 5,
            contactName: null,
            contactEmail: null,
            notes: null,
          }}
        />
      </Panel>
    </div>
  )
}
