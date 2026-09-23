import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import type { InvestigationReport } from "../lib/investigate/types"

export const userRole = pgEnum("user_role", ["admin", "user"])
export const userStatus = pgEnum("user_status", ["active", "disabled"])
export const customerPlan = pgEnum("customer_plan", ["poc", "licensed"])
export const userTheme = pgEnum("user_theme", ["perseonix", "dark", "light"])
export const investigationKind = pgEnum("investigation_kind", ["domain", "ip", "url"])
export const investigationVerdict = pgEnum("investigation_verdict", [
  "malicious",
  "suspicious",
  "no_known_threats",
  "inconclusive",
])

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow()

/** Customer companies (tenants). Platform administrators usually belong to none. */
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    plan: customerPlan("plan").notNull().default("licensed"),
    // Calendar dates (YYYY-MM-DD): the POC window, or the license term.
    startsAt: date("starts_at", { mode: "string" }).notNull().defaultNow(),
    endsAt: date("ends_at", { mode: "string" }),
    // Maximum active customer users; null means unlimited.
    seatLimit: integer("seat_limit"),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("organizations_slug_key").on(t.slug)]
)

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Always stored lower-cased so the unique index is case-insensitive.
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRole("role").notNull().default("user"),
    status: userStatus("status").notNull().default("active"),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    // Portal appearance, chosen by the user in Settings.
    theme: userTheme("theme").notNull().default("perseonix"),
    // IANA timezone (e.g. "Asia/Baku") — data timestamps render in the user's local time.
    timezone: text("timezone").notNull().default("UTC"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("users_email_key").on(t.email),
    index("users_organization_idx").on(t.organizationId),
  ]
)

/** Catalog of licensable Perseonix Corvael modules. */
export const modules = pgTable("modules", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: createdAt(),
})

export const userModules = pgTable(
  "user_modules",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moduleKey: text("module_key")
      .notNull()
      .references(() => modules.key, { onDelete: "cascade" }),
    grantedById: uuid("granted_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.moduleKey] })]
)

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 of the session token; the raw token only ever lives in the cookie.
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
)

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    ipAddress: text("ip_address"),
    success: boolean("success").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("login_attempts_email_created_idx").on(t.email, t.createdAt),
    index("login_attempts_ip_created_idx").on(t.ipAddress, t.createdAt),
  ]
)

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    // Snapshot so the trail stays readable after an account is deleted.
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    targetLabel: text("target_label"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_logs_created_idx").on(t.createdAt),
    index("audit_logs_target_idx").on(t.targetId),
  ]
)

/**
 * Threat Investigation lookups. Shared across a customer company; the full
 * report is kept so it can be reopened without querying the sources again.
 */
export const investigations = pgTable(
  "investigations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Null for investigations run by Perseonix administrators.
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    input: text("input").notNull(),
    query: text("query").notNull(),
    kind: investigationKind("kind").notNull(),
    verdict: investigationVerdict("verdict").notNull(),
    signalCount: integer("signal_count").notNull().default(0),
    topSignal: text("top_signal"),
    report: jsonb("report").$type<InvestigationReport>().notNull(),
    durationMs: integer("duration_ms").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("investigations_org_created_idx").on(t.organizationId, t.createdAt),
    index("investigations_user_created_idx").on(t.userId, t.createdAt),
  ]
)

/**
 * Admin-managed third-party integrations. A row is an override for a connector
 * defined in the code catalog; absent rows fall back to environment variables
 * and default to enabled. `apiKey` is a secret — never returned to the client.
 */
export const connectors = pgTable("connectors", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  apiKey: text("api_key"),
  updatedById: uuid("updated_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

/**
 * Threat actors a user has chosen to follow. `groupSlug` points at a profile in
 * the bundled adversary dataset (JSON, not a DB table), so it's a plain string.
 * A follow seeds notifications for that actor's known activity.
 */
export const watchlist = pgTable(
  "watchlist",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupSlug: text("group_slug").notNull(),
    // Snapshot of the actor's display name, so the UI never needs the dataset.
    groupName: text("group_name").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.groupSlug] }),
    index("watchlist_user_idx").on(t.userId),
  ]
)

/**
 * Per-user alerts about followed actors — one row per (user, campaign report).
 * Generated from public campaign data when a user follows an actor and whenever
 * new reporting appears. `readAt` null means unread (drives the bell badge).
 */
export const adversaryNotifications = pgTable(
  "adversary_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupSlug: text("group_slug").notNull(),
    groupName: text("group_name").notNull(),
    // The campaign report this alert is about; "welcome:<slug>" for a follow with
    // no reporting yet. Unique per user so reconciliation stays idempotent.
    refId: text("ref_id").notNull(),
    title: text("title").notNull(),
    vendor: text("vendor"),
    year: integer("year"),
    url: text("url"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("adversary_notifications_user_ref_key").on(t.userId, t.refId),
    index("adversary_notifications_user_created_idx").on(t.userId, t.createdAt),
  ]
)

/**
 * Ransomware group roster, ingested daily from a public tracker (ransomware.live).
 * `slug` is the normalized group name. `adversarySlug` links to the bundled
 * Adversary Intelligence dossier when we track the same crew there.
 */
export const ransomwareGroups = pgTable("ransomware_groups", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  description: text("description"),
  tools: jsonb("tools").$type<string[]>().notNull().default([]),
  victimCount: integer("victim_count").notNull().default(0),
  firstSeen: timestamp("first_seen", { withTimezone: true }),
  lastSeen: timestamp("last_seen", { withTimezone: true }),
  adversarySlug: text("adversary_slug"),
  sourceRef: text("source_ref"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

/**
 * Ransomware victim CLAIMS (unverified) as posted on groups' leak sites and
 * aggregated by the public tracker. We store only claim metadata — never the
 * leak-site URL or any stolen data. Deduped on (group, victim, discovered).
 */
export const ransomwareVictims = pgTable(
  "ransomware_victims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupSlug: text("group_slug").notNull(),
    groupName: text("group_name").notNull(),
    victim: text("victim").notNull(),
    country: text("country"),
    sector: text("sector"),
    domain: text("domain"),
    description: text("description"),
    // Extortion / claim details, for the victim dossier.
    ransom: text("ransom"),
    dataSize: text("data_size"),
    // Independent press coverage (a real news URL + summary), when available.
    pressSource: text("press_source"),
    pressSummary: text("press_summary"),
    // Infostealer telemetry the tracker attaches (compromised users/employees).
    infostealer: jsonb("infostealer").$type<Record<string, unknown>>(),
    attackDate: date("attack_date", { mode: "string" }),
    discovered: timestamp("discovered", { withTimezone: true }),
    published: timestamp("published", { withTimezone: true }),
    // The tracker's own profile path, kept for attribution — not the leak site.
    sourceRef: text("source_ref"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("ransomware_victims_dedupe_key").on(t.groupSlug, t.victim, t.discovered),
    index("ransomware_victims_discovered_idx").on(t.discovered),
    index("ransomware_victims_group_idx").on(t.groupSlug),
    index("ransomware_victims_country_idx").on(t.country),
    index("ransomware_victims_sector_idx").on(t.sector),
  ]
)

/** One row per refresh run — powers the "last updated" indicator and audit. */
export const ransomwareIngestions = pgTable("ransomware_ingestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  groupsSeen: integer("groups_seen").notNull().default(0),
  victimsSeen: integer("victims_seen").notNull().default(0),
  victimsAdded: integer("victims_added").notNull().default(0),
  status: text("status").notNull(),
  message: text("message"),
  ranById: uuid("ran_by_id").references(() => users.id, { onDelete: "set null" }),
  ranAt: createdAt(),
})

/**
 * A user's ransomware watch — a saved slice of the attack feed. Any combination
 * of country / sector / group; a victim matches when every set dimension matches.
 * New matching victims raise a notification.
 */
export const ransomwareWatches = pgTable(
  "ransomware_watches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    country: text("country"),
    sector: text("sector"),
    groupSlug: text("group_slug"),
    groupName: text("group_name"),
    label: text("label").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("ransomware_watches_user_idx").on(t.userId)]
)

/** Per-user alert about a new ransomware victim matching one of their watches. */
export const ransomwareNotifications = pgTable(
  "ransomware_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    victimId: uuid("victim_id").notNull(),
    victim: text("victim").notNull(),
    groupName: text("group_name").notNull(),
    country: text("country"),
    sector: text("sector"),
    watchLabel: text("watch_label"),
    discovered: timestamp("discovered", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("ransomware_notifications_user_victim_key").on(t.userId, t.victimId),
    index("ransomware_notifications_user_created_idx").on(t.userId, t.createdAt),
  ]
)

/**
 * Relevance profile — the sectors and country used to rank which adversaries
 * are most likely to target a viewer. Scope "user" (personal, ownerId = user
 * id) or "org" (company-wide, ownerId = organization id); a personal profile
 * overrides the org one. Not FK'd since ownerId is polymorphic.
 */
export const relevanceProfiles = pgTable(
  "relevance_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scope: text("scope").notNull(), // "user" | "org"
    ownerId: uuid("owner_id").notNull(),
    sectors: jsonb("sectors").$type<string[]>().notNull().default([]),
    country: text("country"),
    updatedById: uuid("updated_by_id").references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("relevance_profiles_scope_owner_key").on(t.scope, t.ownerId)]
)

/**
 * Brand Protection — a domain a customer wants monitored for lookalikes.
 * Owner is the organization (company-wide) or, for org-less admins, the user.
 */
export const protectedAssets = pgTable(
  "protected_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    ownerType: text("owner_type").notNull(), // "org" | "user"
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    domain: text("domain").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    // Automatic rescan cadence in hours (null = manual only).
    scanIntervalHours: integer("scan_interval_hours"),
    nextScanAt: timestamp("next_scan_at", { withTimezone: true }),
    lastScanAt: timestamp("last_scan_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("protected_assets_owner_domain_key").on(t.ownerId, t.domain)]
)

/** A lookalike domain detected for a protected asset, with its risk evidence. */
export const phishingDetections = pgTable(
  "phishing_detections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => protectedAssets.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    kind: text("kind").notNull(),
    source: text("source").notNull(),
    resolves: boolean("resolves").notNull().default(false),
    ips: jsonb("ips").$type<string[]>().notNull().default([]),
    hasMx: boolean("has_mx").notNull().default(false),
    hasCert: boolean("has_cert").notNull().default(false),
    punycode: boolean("punycode").notNull().default(false),
    keyword: text("keyword"),
    similarity: integer("similarity").notNull().default(0),
    score: integer("score").notNull().default(0),
    severity: text("severity").notNull(),
    issuer: text("issuer"),
    firstSeen: timestamp("first_seen", { withTimezone: true }),
    // Triage state set by the analyst.
    status: text("status").notNull().default("new"), // new | malicious | benign | monitoring
    // When a screenshot was last captured (null = none yet).
    screenshotAt: timestamp("screenshot_at", { withTimezone: true }),
    // Set when a previously-live lookalike stops resolving (taken down).
    offlineAt: timestamp("offline_at", { withTimezone: true }),
    detectedAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("phishing_detections_asset_domain_key").on(t.assetId, t.domain),
    index("phishing_detections_asset_idx").on(t.assetId),
  ]
)

/** One row per scan run — powers "last scanned" and an audit trail. */
export const brandScans = pgTable("brand_scans", {
  id: uuid("id").primaryKey().defaultRandom(),
  assetId: uuid("asset_id").references(() => protectedAssets.id, { onDelete: "cascade" }),
  screened: integer("screened").notNull().default(0),
  resolving: integer("resolving").notNull().default(0),
  certs: integer("certs").notNull().default(0),
  findings: integer("findings").notNull().default(0),
  newFindings: integer("new_findings").notNull().default(0),
  status: text("status").notNull(),
  message: text("message"),
  ranById: uuid("ran_by_id").references(() => users.id, { onDelete: "set null" }),
  ranAt: createdAt(),
})

/** Per-user bell alerts for new lookalike detections. */
export const brandNotifications = pgTable(
  "brand_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    detectionId: uuid("detection_id").notNull(),
    domain: text("domain").notNull(),
    assetDomain: text("asset_domain").notNull(),
    severity: text("severity").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("brand_notifications_user_detection_key").on(t.userId, t.detectionId),
    index("brand_notifications_user_created_idx").on(t.userId, t.createdAt),
  ]
)

/**
 * Incident case — a workable investigation attached to Brand Protection, like a
 * SIEM/ELK case. Opened automatically for the highest-risk lookalikes, or by an
 * analyst from a detection (or blank). Owner is the organization (team-wide) or
 * the user, mirroring protectedAssets. `seq` is a per-owner human number (CASE-0001).
 */
export const brandCases = pgTable(
  "brand_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    ownerType: text("owner_type").notNull(), // "org" | "user"
    seq: integer("seq").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    status: text("status").notNull().default("open"), // open | investigating | closed | false_positive
    severity: text("severity").notNull().default("medium"), // high | medium | low
    source: text("source").notNull().default("manual"), // auto | manual
    // The lookalike this case is about (snapshotted so the case stands alone).
    assetId: uuid("asset_id").references(() => protectedAssets.id, { onDelete: "set null" }),
    detectionId: uuid("detection_id"),
    domain: text("domain"),
    assetDomain: text("asset_domain"),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    assigneeName: text("assignee_name"),
    openedById: uuid("opened_by_id").references(() => users.id, { onDelete: "set null" }),
    openedByName: text("opened_by_name"),
    closedById: uuid("closed_by_id").references(() => users.id, { onDelete: "set null" }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("brand_cases_owner_seq_key").on(t.ownerId, t.seq),
    // One case per detection per owner (NULLs distinct → blank manual cases don't clash).
    uniqueIndex("brand_cases_owner_detection_key").on(t.ownerId, t.detectionId),
    index("brand_cases_owner_status_idx").on(t.ownerId, t.status),
  ]
)

/** Timeline entry for a case: the opening event, status/severity/assignment
 *  changes, and analyst comments. Drives the case activity log. */
export const brandCaseEvents = pgTable(
  "brand_case_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => brandCases.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // created | comment | status | severity | assign | closed | reopened
    body: text("body"),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    authorName: text("author_name"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index("brand_case_events_case_idx").on(t.caseId, t.createdAt)]
)

/** Per-user bell alert when a case is opened (auto or by a teammate). */
export const brandCaseNotifications = pgTable(
  "brand_case_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    caseId: uuid("case_id").notNull(),
    seq: integer("seq").notNull(),
    title: text("title").notNull(),
    domain: text("domain"),
    severity: text("severity").notNull(),
    source: text("source").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("brand_case_notifications_user_case_key").on(t.userId, t.caseId),
    index("brand_case_notifications_user_created_idx").on(t.userId, t.createdAt),
  ]
)

/**
 * Inbound ingestion API keys — the "Module Connectors" that let an external
 * automation (n8n) push feed data INTO a Threat Intelligence connector (cve,
 * ioc, news…). Distinct from `connectors` (outbound keys WE use to call third
 * parties). The full key is shown once; only its SHA-256 hash + a visible prefix
 * are stored. Scoped to one connector so an n8n playbook is isolated per feed.
 */
export const ingestKeys = pgTable(
  "ingest_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectorKey: text("connector_key").notNull(), // "cve" | "ioc" | "news"
    name: text("name").notNull(),
    prefix: text("prefix").notNull(), // visible identifier, e.g. "pxi_live_a1b2c3d4"
    hashedKey: text("hashed_key").notNull(),
    // AES-256-GCM ciphertext of the full key (iv:tag:data hex) so an admin can
    // reveal it later. Reversible-at-rest by explicit founder choice — weaker
    // than hash-only; guarded by requireAdmin + audit-logged on every reveal.
    encryptedKey: text("encrypted_key"),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("ingest_keys_prefix_key").on(t.prefix),
    index("ingest_keys_connector_idx").on(t.connectorKey),
  ]
)

/**
 * Ingested CVEs (Threat Intelligence → CVE Feed). Pushed by an n8n playbook
 * (NVD/CISA KEV → Groq AI summary → our ingestion endpoint). Low severity is
 * dropped at ingestion. Deduped/updated by `cveId`.
 */
export const cves = pgTable(
  "cves",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cveId: text("cve_id").notNull(),
    title: text("title"),
    summary: text("summary"), // AI-generated 2-sentence brief
    severity: text("severity").notNull(), // critical | high | medium
    cvss: real("cvss"),
    cvssVector: text("cvss_vector"), // e.g. CVSS:3.1/AV:N/AC:L/...
    cwe: text("cwe"), // e.g. CWE-287
    epss: real("epss"), // 0..1 exploit probability (FIRST.org EPSS)
    epssPercentile: real("epss_percentile"), // 0..1
    description: text("description"), // raw NVD/source description (AI brief is `summary`)
    kev: boolean("kev").notNull().default(false), // CISA Known-Exploited
    vendor: text("vendor"),
    product: text("product"),
    published: timestamp("published", { withTimezone: true }),
    sourceUrl: text("source_url"),
    refs: jsonb("refs").$type<string[]>().notNull().default([]),
    pocs: jsonb("pocs")
      .$type<{ url: string; name: string; stars: number; updated?: string | null; description?: string | null }[]>()
      .notNull()
      .default([]), // public GitHub proof-of-concept exploits
    affected: jsonb("affected")
      .$type<{ vendor: string | null; product: string; versions: string }[]>()
      .notNull()
      .default([]), // affected products & version ranges (NVD CPE)
    kevAction: text("kev_action"), // CISA KEV required remediation action
    kevDueDate: timestamp("kev_due_date", { withTimezone: true }), // CISA remediation deadline
    kevRansomware: boolean("kev_ransomware").notNull().default(false), // known ransomware-campaign use
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("cves_cve_id_key").on(t.cveId),
    index("cves_severity_idx").on(t.severity),
    index("cves_published_idx").on(t.published),
  ]
)

/**
 * Threat News — security-news articles ingested by an n8n playbook, each already
 * LLM-summarised and entity-extracted. We store OUR summary + a link back to the
 * source (never the full article text), plus extracted entities in `newsMentions`.
 */
export const newsArticles = pgTable(
  "news_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(), // canonical article URL — dedupe key
    title: text("title").notNull(),
    source: text("source"), // e.g. "BleepingComputer"
    summary: text("summary"), // OUR LLM summary (not the full article)
    analystNote: text("analyst_note"), // OUR deeper "so-what" analyst assessment
    dedupKey: text("dedup_key"), // normalized-title fingerprint for exact-duplicate suppression
    severity: text("severity"), // critical | high | medium | low | info
    category: text("category"), // vulnerability | breach | ransomware | malware | apt | ...
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("news_articles_url_key").on(t.url),
    index("news_articles_published_idx").on(t.publishedAt),
    index("news_articles_severity_idx").on(t.severity),
    index("news_articles_dedup_idx").on(t.dedupKey),
  ]
)

/** Entities extracted from an article (the intelligence graph): CVEs, actors, malware, MITRE TTPs, sectors, regions. */
export const newsMentions = pgTable(
  "news_mentions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id")
      .notNull()
      .references(() => newsArticles.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // cve | actor | malware | ttp | sector | region
    value: text("value").notNull(), // normalized key e.g. "CVE-2026-1234", "APT28", "T1190"
    label: text("label"), // display label e.g. "Exploit Public-Facing Application"
  },
  (t) => [
    index("news_mentions_kind_value_idx").on(t.kind, t.value),
    index("news_mentions_article_idx").on(t.articleId),
  ]
)

/** A user's saved Threat News filter (facets serialized as JSON) for one-click reuse. */
export const savedNewsFilters = pgTable(
  "saved_news_filters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    query: jsonb("query").$type<Record<string, string[] | string>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("saved_news_filters_user_idx").on(t.userId, t.createdAt)]
)

/** One row per ingestion run (any connector) — observability / "what happened". */
export const ingestRuns = pgTable(
  "ingest_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    connectorKey: text("connector_key").notNull(),
    received: integer("received").notNull().default(0),
    added: integer("added").notNull().default(0),
    skipped: integer("skipped").notNull().default(0),
    status: text("status").notNull(), // ok | error
    message: text("message"),
    createdAt: createdAt(),
  },
  (t) => [index("ingest_runs_connector_idx").on(t.connectorKey, t.createdAt)]
)

export type UserRole = (typeof userRole.enumValues)[number]
export type UserStatus = (typeof userStatus.enumValues)[number]
export type CustomerPlan = (typeof customerPlan.enumValues)[number]
export type AuditLog = typeof auditLogs.$inferSelect
