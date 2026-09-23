import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PageHeader, Panel } from "@/components/admin/ui"
import { UserForm } from "@/components/admin/user-form"
import { listCompanyOptions, listModules } from "@/lib/admin/queries"
import { createUser } from "../actions"

export const metadata: Metadata = {
  title: "New user",
}

export default async function NewUserPage({ searchParams }: PageProps<"/app/admin/users/new">) {
  const { organizationId } = await searchParams
  const [companies, modules] = await Promise.all([listCompanyOptions(), listModules()])

  // Arriving from a customer's "Add user" button pre-selects that company.
  const company = companies.find((c) => c.id === organizationId)
  const backHref = company ? `/app/admin/customers/${company.id}` : "/app/admin/users"

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        {company ? company.name : "All users"}
      </Link>
      <div className="mt-4">
        <PageHeader
          eyebrow="Management"
          title={company ? `New user for ${company.name}` : "New user"}
          description="Open an account for a customer employee, or add a Perseonix administrator. You share the temporary password with them."
        />
      </div>
      <Panel className="mt-8">
        <UserForm
          mode="create"
          action={createUser}
          companies={companies}
          modules={modules}
          defaults={{
            name: "",
            email: "",
            role: "user",
            organizationId: company?.id ?? null,
            modules: modules.map((m) => m.key),
          }}
        />
      </Panel>
    </div>
  )
}
