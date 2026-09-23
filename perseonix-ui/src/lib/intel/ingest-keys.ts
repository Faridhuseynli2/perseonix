import "server-only"
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from "node:crypto"
import { and, desc, eq, isNull } from "drizzle-orm"
import { getDb } from "@/db"
import { ingestKeys } from "@/db/schema"
import { getConnector } from "@/lib/intel/connectors"

// Management of inbound ingestion API keys ("Module Connectors"). We keep a
// SHA-256 hash (for endpoint verification) AND an AES-256-GCM encrypted copy so
// an admin can reveal the full key later — a reversible-at-rest choice made
// explicitly by the founder, guarded by requireAdmin + audit logging.
// Degrades gracefully before the table exists (until one restart).

const KEY_PREFIX = "pxi_live_"

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex")
}

// Encryption key derived from an env secret (stable across restarts so existing
// keys stay decryptable). In prod set INGEST_KEY_SECRET; the dev fallback is
// clearly not for production.
const ENC_SECRET = process.env.INGEST_KEY_SECRET || "perseonix-dev-ingest-secret-change-in-prod"
const ENC_KEY = scryptSync(ENC_SECRET, "perseonix-ingest-v1", 32)

function encryptKey(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", ENC_KEY, iv)
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`
}

function decryptKey(blob: string | null): string | null {
  if (!blob) return null
  try {
    const [ivHex, tagHex, dataHex] = blob.split(":")
    if (!ivHex || !tagHex || !dataHex) return null
    const decipher = createDecipheriv("aes-256-gcm", ENC_KEY, Buffer.from(ivHex, "hex"))
    decipher.setAuthTag(Buffer.from(tagHex, "hex"))
    return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8")
  } catch {
    return null
  }
}

function isSchemaNotReady(error: unknown): boolean {
  for (let cur: unknown = error, d = 0; cur && d < 6; d++) {
    if (typeof cur !== "object") break
    const r = cur as { code?: unknown; message?: unknown; cause?: unknown }
    if (r.code === "42P01" || r.code === "42703") return true
    if (typeof r.message === "string" && /ingest_keys/.test(r.message) && /does not exist|no such/.test(r.message)) return true
    cur = r.cause
  }
  return false
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (isSchemaNotReady(error)) return fallback
    throw error
  }
}

export type IngestKeyRow = {
  id: string
  connectorKey: string
  name: string
  prefix: string
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

export async function storeReady(): Promise<boolean> {
  return safe(async () => {
    const db = await getDb()
    await db.select({ id: ingestKeys.id }).from(ingestKeys).limit(1)
    return true
  }, false)
}

/** All keys, newest first — optionally scoped to one connector. */
export async function listIngestKeys(connectorKey?: string): Promise<IngestKeyRow[]> {
  return safe(
    async () => {
      const db = await getDb()
      const rows = await db
        .select()
        .from(ingestKeys)
        .where(connectorKey ? eq(ingestKeys.connectorKey, connectorKey) : undefined)
        .orderBy(desc(ingestKeys.createdAt))
      return rows.map((r) => ({
        id: r.id,
        connectorKey: r.connectorKey,
        name: r.name,
        prefix: r.prefix,
        lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
        revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      }))
    },
    []
  )
}

export type CreateKeyResult =
  | { ok: true; fullKey: string; prefix: string }
  | { ok: false; error: string }

/** Generate a new key for a connector. Returns the full key ONCE. */
export async function createIngestKey(
  connectorKey: string,
  name: string,
  userId: string
): Promise<CreateKeyResult> {
  if (!getConnector(connectorKey)) return { ok: false, error: "Unknown connector." }
  const label = name.trim()
  if (!label) return { ok: false, error: "Give the key a name (e.g. “n8n prod”)." }

  return safe<CreateKeyResult>(
    async () => {
      const db = await getDb()
      const secret = randomBytes(24).toString("hex") // 48 hex chars
      const fullKey = `${KEY_PREFIX}${secret}`
      const prefix = `${KEY_PREFIX}${secret.slice(0, 8)}` // shown for identification
      await db.insert(ingestKeys).values({
        connectorKey,
        name: label,
        prefix,
        hashedKey: sha256(fullKey),
        encryptedKey: encryptKey(fullKey),
        createdById: userId,
      })
      return { ok: true, fullKey, prefix }
    },
    { ok: false, error: "Restart the dev server once to create the ingestion-keys table, then try again." }
  )
}

export async function revokeIngestKey(id: string): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    await db.update(ingestKeys).set({ revokedAt: new Date() }).where(eq(ingestKeys.id, id))
  }, undefined)
}

export async function deleteIngestKey(id: string): Promise<void> {
  await safe(async () => {
    const db = await getDb()
    await db.delete(ingestKeys).where(eq(ingestKeys.id, id))
  }, undefined)
}

export async function renameIngestKey(id: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const label = name.trim()
  if (!label) return { ok: false, error: "Name can’t be empty." }
  return safe<{ ok: boolean; error?: string }>(
    async () => {
      const db = await getDb()
      await db.update(ingestKeys).set({ name: label }).where(eq(ingestKeys.id, id))
      return { ok: true }
    },
    { ok: false, error: "Not ready — restart the dev server once." }
  )
}

/** Decrypt and return the full key for admin viewing (reversible-at-rest). */
export async function revealIngestKey(id: string): Promise<string | null> {
  return safe(async () => {
    const db = await getDb()
    const [row] = await db.select().from(ingestKeys).where(eq(ingestKeys.id, id)).limit(1)
    if (!row) return null
    return decryptKey(row.encryptedKey)
  }, null)
}

/**
 * Verify an incoming key (used by the ingestion endpoint). Returns the connector
 * key it is authorised for, or null. Stamps lastUsedAt on success.
 */
export async function verifyIngestKey(rawKey: string): Promise<string | null> {
  if (!rawKey.startsWith(KEY_PREFIX)) return null
  return safe(async () => {
    const db = await getDb()
    const hashed = sha256(rawKey)
    const [row] = await db
      .select()
      .from(ingestKeys)
      .where(and(eq(ingestKeys.hashedKey, hashed), isNull(ingestKeys.revokedAt)))
      .limit(1)
    if (!row) return null
    await db.update(ingestKeys).set({ lastUsedAt: new Date() }).where(eq(ingestKeys.id, row.id))
    return row.connectorKey
  }, null)
}
