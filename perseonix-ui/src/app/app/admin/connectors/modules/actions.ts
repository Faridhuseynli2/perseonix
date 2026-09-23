"use server"

import { revalidatePath } from "next/cache"
import { recordAudit } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth/dal"
import { getConnector } from "@/lib/intel/connectors"
import {
  createIngestKey,
  deleteIngestKey,
  renameIngestKey,
  revealIngestKey,
  revokeIngestKey,
  type CreateKeyResult,
} from "@/lib/intel/ingest-keys"

const PATH = "/app/admin/connectors/modules"

export async function createKeyAction(connectorKey: string, name: string): Promise<CreateKeyResult> {
  const user = await requireAdmin()
  const res = await createIngestKey(connectorKey, name, user.id)
  if (res.ok) {
    await recordAudit({
      actor: user,
      action: "ingest.key_created",
      target: { type: "ingest_connector", id: connectorKey, label: getConnector(connectorKey)?.name },
      metadata: { prefix: res.prefix, name },
    })
    revalidatePath(PATH)
  }
  return res
}

export async function revokeKeyAction(id: string, connectorKey: string): Promise<void> {
  const user = await requireAdmin()
  await revokeIngestKey(id)
  await recordAudit({
    actor: user,
    action: "ingest.key_revoked",
    target: { type: "ingest_connector", id: connectorKey },
    metadata: { keyId: id },
  })
  revalidatePath(PATH)
}

export async function deleteKeyAction(id: string, connectorKey: string): Promise<void> {
  const user = await requireAdmin()
  await deleteIngestKey(id)
  await recordAudit({
    actor: user,
    action: "ingest.key_deleted",
    target: { type: "ingest_connector", id: connectorKey },
    metadata: { keyId: id },
  })
  revalidatePath(PATH)
}

export async function renameKeyAction(
  id: string,
  connectorKey: string,
  name: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireAdmin()
  const res = await renameIngestKey(id, name)
  if (res.ok) {
    await recordAudit({
      actor: user,
      action: "ingest.key_renamed",
      target: { type: "ingest_connector", id: connectorKey },
      metadata: { keyId: id, name },
    })
    revalidatePath(PATH)
  }
  return res
}

/** Decrypt and return the full key for admin viewing. Every reveal is audited. */
export async function revealKeyAction(
  id: string,
  connectorKey: string
): Promise<{ ok: boolean; key?: string; error?: string }> {
  const user = await requireAdmin()
  const key = await revealIngestKey(id)
  if (!key) return { ok: false, error: "Key not found or unreadable." }
  await recordAudit({
    actor: user,
    action: "ingest.key_revealed",
    target: { type: "ingest_connector", id: connectorKey },
    metadata: { keyId: id },
  })
  return { ok: true, key }
}
