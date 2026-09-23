import "server-only"
import { getDb } from "@/db"
import { connectors as connectorsTable } from "@/db/schema"
import { CONNECTORS, getConnector, type Connector, type ConnectorView } from "@/lib/connectors/config"

// Resolves each connector's key and enabled state, merging admin overrides
// (database) over environment variables. Investigation sources read the runtime
// snapshot synchronously; the admin console reads full state and writes changes.
//
// SECURITY: raw keys never leave the server. `listConnectors` returns only the
// last 4 characters and the source; audit entries never include the key. Keys
// are stored as plaintext in the local database — for production, hold them in a
// secrets manager or encrypt at rest.

type Runtime = { enabled: boolean; apiKey: string | null }

const globalForConnectors = globalThis as typeof globalThis & {
  __pxConnectors?: Map<string, Runtime>
}

function envKey(connector: Connector): string | null {
  return connector.envVar ? process.env[connector.envVar]?.trim() || null : null
}

/**
 * True when a query failed only because the connectors table isn't created yet.
 * Drizzle wraps the driver error ("Failed query: …"), so we walk the cause chain
 * and also check the Postgres "undefined_table" code (42P01).
 */
function isMissingTable(error: unknown): boolean {
  const messages: string[] = []
  for (let current: unknown = error, depth = 0; current && depth < 6; depth++) {
    if (typeof current !== "object") break
    const record = current as { message?: unknown; code?: unknown; cause?: unknown }
    if (record.code === "42P01") return true
    if (typeof record.message === "string") messages.push(record.message)
    current = record.cause
  }
  const combined = messages.join(" ")
  return /connectors/i.test(combined) && /does not exist|no such table/i.test(combined)
}

/**
 * Loads the DB overrides into a process-wide snapshot the sync resolvers read.
 * Before the table exists (first run after the migration, until a restart), it
 * degrades to environment variables instead of throwing, so investigations and
 * the console keep working.
 */
export async function loadConnectorRuntime(): Promise<Map<string, Runtime>> {
  const map = new Map<string, Runtime>()
  try {
    const db = await getDb()
    const rows = await db
      .select({ key: connectorsTable.key, enabled: connectorsTable.enabled, apiKey: connectorsTable.apiKey })
      .from(connectorsTable)
    for (const row of rows) map.set(row.key, { enabled: row.enabled, apiKey: row.apiKey })
  } catch (error) {
    if (!isMissingTable(error)) throw error
  }
  globalForConnectors.__pxConnectors = map
  return map
}

function resolve(id: string): { active: boolean; key: string | null } {
  const connector = getConnector(id)
  if (!connector) return { active: false, key: null }
  const snapshot = globalForConnectors.__pxConnectors?.get(id)
  // Before the snapshot loads, fall back to environment only (startup behaviour).
  const enabled = snapshot?.enabled ?? true
  const key = snapshot?.apiKey ?? envKey(connector)
  const active = enabled && (connector.requiresKey ? Boolean(key) : true)
  return { active, key: active ? key : null }
}

/** Whether a connector should run right now. */
export function connectorActive(id: string): boolean {
  return resolve(id).active
}

/** The key an active connector should use, or null when inactive/unset. */
export function connectorKey(id: string): string | null {
  return resolve(id).key
}

const last4 = (key: string) => (key.length <= 4 ? "••••" : `••••${key.slice(-4)}`)

/** Full state for the admin console. Never includes the raw key. */
export async function listConnectors(): Promise<ConnectorView[]> {
  let rows: { key: string; enabled: boolean; apiKey: string | null; updatedAt: Date }[] = []
  try {
    const db = await getDb()
    rows = await db
      .select({
        key: connectorsTable.key,
        enabled: connectorsTable.enabled,
        apiKey: connectorsTable.apiKey,
        updatedAt: connectorsTable.updatedAt,
      })
      .from(connectorsTable)
  } catch (error) {
    // Table not migrated yet — show environment-based state instead of crashing.
    if (!isMissingTable(error)) throw error
  }
  const byId = new Map(rows.map((r) => [r.key, r]))

  return CONNECTORS.map((connector) => {
    const row = byId.get(connector.id)
    const savedKey = row?.apiKey ?? null
    const envValue = envKey(connector)
    const enabled = row?.enabled ?? true
    const keySource: ConnectorView["keySource"] = savedKey ? "saved" : envValue ? "environment" : null
    const key = savedKey ?? envValue
    const configured = connector.requiresKey ? Boolean(key) : true
    return {
      ...connector,
      enabled,
      configured,
      active: enabled && configured,
      keySource,
      keyHint: key ? last4(key) : null,
      updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
    }
  })
}

/** False until the connectors table exists (i.e. after the first restart post-migration). */
export async function connectorStoreReady(): Promise<boolean> {
  try {
    const db = await getDb()
    await db.select({ key: connectorsTable.key }).from(connectorsTable).limit(1)
    return true
  } catch (error) {
    if (isMissingTable(error)) return false
    throw error
  }
}

async function upsert(id: string, values: Partial<{ enabled: boolean; apiKey: string | null }>, adminId: string) {
  const db = await getDb()
  await db
    .insert(connectorsTable)
    .values({ key: id, updatedById: adminId, ...values })
    .onConflictDoUpdate({
      target: connectorsTable.key,
      set: { ...values, updatedById: adminId, updatedAt: new Date() },
    })
  await loadConnectorRuntime()
}

export async function setConnectorEnabled(id: string, enabled: boolean, adminId: string) {
  await upsert(id, { enabled }, adminId)
}

export async function saveConnectorKey(id: string, apiKey: string, adminId: string) {
  await upsert(id, { apiKey, enabled: true }, adminId)
}

export async function removeConnectorKey(id: string, adminId: string) {
  await upsert(id, { apiKey: null }, adminId)
}
