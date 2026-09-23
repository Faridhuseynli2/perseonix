"use server"

import { revalidatePath } from "next/cache"
import type { ActionState } from "@/lib/action-state"
import { recordAudit } from "@/lib/audit"
import { requireAdmin } from "@/lib/auth/dal"
import { getConnector } from "@/lib/connectors/config"
import {
  connectorStoreReady,
  removeConnectorKey,
  saveConnectorKey,
  setConnectorEnabled,
} from "@/lib/connectors/service"
import { formText } from "@/lib/validation"

const MAX_KEY_LENGTH = 512
const NOT_READY = "Restart the dev server once to finish setting up connectors, then try again."

/** Enable or disable a connector without touching its key. */
export async function toggleConnector(id: string, enabled: boolean) {
  const admin = await requireAdmin()
  const connector = getConnector(id)
  if (!connector) return
  if (!(await connectorStoreReady())) return

  await setConnectorEnabled(id, enabled, admin.id)
  await recordAudit({
    actor: admin,
    action: enabled ? "connector.enabled" : "connector.disabled",
    target: { type: "connector", id, label: connector.name },
  })
  revalidatePath("/app/admin/connectors")
}

/** Save (or replace) a connector's API key. The key is never echoed back. */
export async function saveConnectorKeyAction(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin()
  const connector = getConnector(id)
  if (!connector) return { error: "Unknown connector." }

  const key = formText(formData, "apiKey").trim()
  if (!key) return { error: "Enter an API key." }
  if (key.length > MAX_KEY_LENGTH) return { error: "That key looks too long." }
  if (!(await connectorStoreReady())) return { error: NOT_READY }

  await saveConnectorKey(id, key, admin.id)
  await recordAudit({
    actor: admin,
    action: "connector.key_set",
    target: { type: "connector", id, label: connector.name },
    // Only the last 4 characters are recorded — never the key itself.
    metadata: { keyHint: `••••${key.slice(-4)}` },
  })
  revalidatePath("/app/admin/connectors")
  return { success: `${connector.name} key saved.` }
}

/** Remove a saved key, falling back to the environment variable if one is set. */
export async function removeConnectorKeyAction(id: string) {
  const admin = await requireAdmin()
  const connector = getConnector(id)
  if (!connector) return
  if (!(await connectorStoreReady())) return

  await removeConnectorKey(id, admin.id)
  await recordAudit({
    actor: admin,
    action: "connector.key_removed",
    target: { type: "connector", id, label: connector.name },
  })
  revalidatePath("/app/admin/connectors")
}
