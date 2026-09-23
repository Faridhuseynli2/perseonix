import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { DeleteUserForm } from "@/components/admin/delete-user-form"
import { ResetPasswordForm } from "@/components/admin/reset-password-form"
import {
  Notice,
  PageHeader,
  Panel,
  PlanBadge,
  RoleBadge,
  StatusBadge,
  TermBadge,
} from "@/components/admin/ui"
import { UserForm } from "@/components/admin/user-form"
import { Button } from "@/components/ui/button"
import { getUserDetail, listCompanyOptions, listModules } from "@/lib/admin/queries"
import { auditLabel } from "@/lib/audit-labels"
import { requireAdmin } from "@/lib/auth/dal"
import { evaluationEnded, formatDate, termStatus } from "@/lib/customers"
import { formatDateTime } from "@/lib/format"
import { deleteUser, resetUserPassword, setUserStatus, updateUser } from "../actions"

export const metadata: Metadata = {
  title: "User details",
}

const notices: Record<string, string> = {
  created:
    "User created. Share the temporary password through a secure channel — it isn't stored anywhere you can view it again.",
}

export default async function UserDetailPage({
  params,
  searchParams,
}: PageProps<"/app/admin/users/[id]">) {
  const admin = await requireAdmin()
  const { id } = await params
  const { notice } = await searchParams

  const [user, companies, catalog] = await Promise.all([
    getUserDetail(id),
    listCompanyOptions(),
    listModules(),
  ])
  const isSelf = user.id === admin.id
  const active = user.status === "active"
  const noticeText = typeof notice === "string" ? notices[notice] : undefined
  const companyTerm =
    user.organizationPlan && termStatus(user.organizationPlan, user.organizationEndsAt)

  const facts: [string, string][] = [
    ["Created", formatDateTime(user.createdAt)],
    ["Last sign-in", formatDateTime(user.lastLoginAt)],
    ["Password changed", formatDateTime(user.passwordChangedAt)],
    ["Active sessions", String(user.activeSessions)],
    ["Must change password", user.mustChangePassword ? "Yes" : "No"],
  ]

  return (
    <div className="mx-auto max-w-[1400px]">
      <Link
        href="/app/admin/users"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        All users
      </Link>
      <div className="mt-4">
        <PageHeader
          eyebrow={isSelf ? "Your account" : user.organizationName ? `User · ${user.organizationName}` : "User"}
          title={user.name}
          description={user.email}
          actions={
            <>
              <RoleBadge role={user.role} />
              <StatusBadge status={user.status} />
            </>
          }
        />
      </div>

      {noticeText && (
        <div className="mt-6">
          <Notice tone="success">{noticeText}</Notice>
        </div>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Profile & access" description="Account type, company, identity and licensed modules.">
          <UserForm
            mode="edit"
            action={updateUser.bind(null, user.id)}
            companies={companies}
            modules={catalog}
            defaults={{
              name: user.name,
              email: user.email,
              role: user.role,
              organizationId: user.organizationId,
              modules: user.moduleKeys,
            }}
            lockRole={isSelf}
          />
        </Panel>

        <div className="grid content-start gap-6">
          <Panel title="Company">
            {user.organizationId && user.organizationPlan && companyTerm ? (
              <div className="grid gap-3">
                <Link
                  href={`/app/admin/customers/${user.organizationId}`}
                  className="text-base font-semibold text-ink hover:text-glow"
                >
                  {user.organizationName}
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <PlanBadge plan={user.organizationPlan} />
                  <TermBadge status={companyTerm} />
                </div>
                {user.organizationEndsAt && (
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {user.organizationPlan === "poc" ? "POC ends" : "Renews"}{" "}
                    {formatDate(user.organizationEndsAt)}
                  </p>
                )}
                {user.role === "user" &&
                  evaluationEnded(user.organizationPlan, user.organizationEndsAt) && (
                    <Notice tone="error">
                      The company&apos;s POC has ended, so this user can&apos;t sign in until
                      it&apos;s extended or converted to Licensed.
                    </Notice>
                  )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <PlanBadge plan="internal" />
                Perseonix staff — no customer company
              </div>
            )}
          </Panel>

          <Panel title="Account">
            <dl className="grid gap-3 text-sm">
              {facts.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="text-right text-foreground/90">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          {isSelf ? (
            <Notice tone="info">
              This is your own account. Use{" "}
              <Link href="/change-password" className="font-medium underline underline-offset-2">
                Change password
              </Link>{" "}
              to update your password. Role, status and deletion are locked for your own account.
            </Notice>
          ) : (
            <>
              <Panel title="Reset password" description="Sets a new password and signs the user out everywhere.">
                <ResetPasswordForm action={resetUserPassword.bind(null, user.id)} />
              </Panel>

              <Panel
                title="Account status"
                description={
                  active
                    ? "Disabling blocks sign-in immediately, ends all sessions and frees a seat."
                    : "This account can't sign in until it's re-enabled. Re-enabling takes a seat."
                }
              >
                <form action={setUserStatus.bind(null, user.id, active ? "disabled" : "active")}>
                  <Button
                    type="submit"
                    variant={active ? "destructive" : "outline"}
                    className="h-10 w-full rounded-md"
                  >
                    {active ? "Disable account" : "Re-enable account"}
                  </Button>
                </form>
              </Panel>

              <Panel
                tone="danger"
                title="Delete user"
                description="Permanently removes the account and its module grants. Audit history is kept."
              >
                <DeleteUserForm action={deleteUser.bind(null, user.id)} email={user.email} />
              </Panel>
            </>
          )}

          <Panel title="Recent activity">
            {user.activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <ul className="divide-y divide-ink/[0.05]">
                {user.activity.map((entry) => (
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
