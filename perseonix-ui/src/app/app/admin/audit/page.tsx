import type { Metadata } from "next"
import { EmptyState, PageHeader, Panel, tableHeadClass } from "@/components/admin/ui"
import { listAuditLogs } from "@/lib/admin/queries"
import { auditLabel, describeMetadata } from "@/lib/audit-labels"
import { formatDateTime } from "@/lib/format"

export const metadata: Metadata = {
  title: "Audit log",
}

const LIMIT = 200

export default async function AuditLogPage() {
  const entries = await listAuditLogs(LIMIT)

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        eyebrow="Administration"
        title="Audit log"
        description="Every sign-in and administrative change, newest first. Entries can't be edited or deleted from the portal."
      />

      <Panel className="mt-8" flush title={`Latest ${Math.min(entries.length, LIMIT)} events`}>
        {entries.length === 0 ? (
          <EmptyState title="No events yet" body="Sign-ins and admin changes will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-ink/[0.06]">
                <tr>
                  <th scope="col" className={tableHeadClass}>When</th>
                  <th scope="col" className={tableHeadClass}>Actor</th>
                  <th scope="col" className={tableHeadClass}>Event</th>
                  <th scope="col" className={tableHeadClass}>Target</th>
                  <th scope="col" className={tableHeadClass}>IP</th>
                  <th scope="col" className={tableHeadClass}>Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/[0.05]">
                {entries.map((entry) => (
                  <tr key={entry.id} className="align-top transition-colors hover:bg-ink/[0.02]">
                    <td className="px-5 py-3 font-mono text-xs whitespace-nowrap text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-foreground/85">{entry.actorEmail ?? "system"}</td>
                    <td className="px-5 py-3">
                      <span className="block text-ink">{auditLabel(entry.action)}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{entry.action}</span>
                    </td>
                    <td className="px-5 py-3 text-foreground/85">{entry.targetLabel ?? "—"}</td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {entry.ipAddress ?? "—"}
                    </td>
                    <td className="max-w-md px-5 py-3 font-mono text-[11px] break-words text-muted-foreground">
                      {describeMetadata(entry.metadata) || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
