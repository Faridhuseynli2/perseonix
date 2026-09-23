import "server-only"
import { mkdirSync } from "node:fs"
import path from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import * as schema from "@/db/schema"
import { seedDatabase } from "@/db/seed"

export type Database = PgliteDatabase<typeof schema>

const globalForDb = globalThis as typeof globalThis & {
  __perseonixDb?: Promise<Database>
}

/**
 * Opens the database on first use, applies pending migrations and seeds the
 * module catalog. Memoised on globalThis so dev-server reloads share a single
 * PGlite instance — two instances must never open the same data directory.
 */
export function getDb(): Promise<Database> {
  globalForDb.__perseonixDb ??= openDatabase().catch((error: unknown) => {
    globalForDb.__perseonixDb = undefined
    throw error
  })
  return globalForDb.__perseonixDb
}

async function openDatabase(): Promise<Database> {
  const dataDir =
    process.env.PGLITE_DATA_DIR ?? path.join(process.cwd(), ".data", "pglite")
  mkdirSync(dataDir, { recursive: true })

  const client = new PGlite(dataDir)
  const db = drizzle({ client, schema })

  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") })
  await seedDatabase(db)
  return db
}
