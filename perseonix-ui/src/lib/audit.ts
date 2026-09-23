import "server-only"
import { getDb } from "@/db"
import { auditLogs } from "@/db/schema"
import { getRequestMeta } from "@/lib/request"

export type AuditEntry = {
  actor: { id: string; email: string } | null
  action: string
  target?: { type: string; id: string; label?: string }
  metadata?: Record<string, unknown>
}

export async function recordAudit({ actor, action, target, metadata }: AuditEntry) {
  const { ipAddress } = await getRequestMeta()
  const db = await getDb()
  await db.insert(auditLogs).values({
    actorId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    action,
    targetType: target?.type ?? null,
    targetId: target?.id ?? null,
    targetLabel: target?.label ?? null,
    metadata: metadata ?? null,
    ipAddress,
  })
}
