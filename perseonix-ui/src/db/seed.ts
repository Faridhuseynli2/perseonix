import "server-only"
import { count } from "drizzle-orm"
import type { Database } from "@/db"
import { modules, users } from "@/db/schema"
import { hashPassword } from "@/lib/auth/password"

/** Modules the platform can license. Perseonix Corvael currently ships one. */
const MODULE_CATALOG = [
  {
    key: "intel",
    name: "Threat Intelligence",
    description:
      "Central threat-intelligence hub: a live dashboard over CVE, IOC and news feeds ingested from external sources, filterable from one screen.",
    sortOrder: 5,
  },
  {
    key: "asm",
    name: "Attack Surface Management",
    description:
      "Continuous discovery and assessment of every internet-facing asset.",
    sortOrder: 10,
  },
  {
    key: "investigate",
    name: "Threat Investigation",
    description:
      "Look up any domain, IP address or URL: DNS, registration, certificates, network ownership and a live safety check.",
    sortOrder: 20,
  },
  {
    key: "adversaries",
    name: "Adversary Intelligence",
    description:
      "Track threat actors and APT groups: their aliases, origins, target sectors, techniques and latest activity.",
    sortOrder: 30,
  },
  {
    key: "ransomware",
    name: "Ransomware Tracker",
    description:
      "Track active ransomware groups and their attacks: claimed victims, leak-site activity, targeted sectors and countries, and incident timelines.",
    sortOrder: 40,
  },
  {
    key: "brand",
    name: "Brand Protection",
    description:
      "Detect lookalike and typosquat domains impersonating your brand — from certificate transparency and DNS — with risk scoring and alerts.",
    sortOrder: 50,
  },
  {
    key: "credentials",
    name: "Credential Exposure",
    description:
      "Check whether a password or email address appears in known data breaches. Passwords are hashed in your browser and never sent — plaintext is never shown.",
    sortOrder: 60,
  },
]

export async function seedDatabase(db: Database) {
  await db.insert(modules).values(MODULE_CATALOG).onConflictDoNothing()

  const [{ total }] = await db.select({ total: count() }).from(users)
  if (total > 0) return

  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@perseonix.local")
    .trim()
    .toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!password) {
    console.warn(
      "[perseonix] No users exist and SEED_ADMIN_PASSWORD is not set; skipping administrator bootstrap."
    )
    return
  }

  await db.insert(users).values({
    email,
    name: "Platform Administrator",
    passwordHash: await hashPassword(password),
    role: "admin",
    mustChangePassword: true,
  })
  console.info(`[perseonix] Bootstrapped initial administrator ${email}`)
}
