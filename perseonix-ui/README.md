# Perseonix UI

Marketing site and the **Perseonix Talos** customer portal — a multi-tenant SaaS for cyber threat intelligence.

- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (Base UI)
- **PostgreSQL** via **Drizzle ORM** — [PGlite](https://pglite.dev) (Postgres compiled to WASM) for local development
- Session-based authentication, role-based admin console, per-user module licensing, audit log

## Getting started

Requires Node.js 24+.

```bash
npm install
cp .env.example .env.local   # then set SEED_ADMIN_PASSWORD
npm run dev
```

Open http://localhost:3000. The portal lives at `/login` → `/app`.

### First administrator

On the first request that touches the database, pending migrations are applied and — if the `users` table is empty — an administrator is created from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. That account must choose a new password at first sign-in. Changing the env vars later has no effect once a user exists.

## Database

| | |
| --- | --- |
| Schema | `src/db/schema.ts` |
| Migrations | `drizzle/` — applied automatically at startup by `src/db/index.ts` |
| Local data | `.data/pglite/` (git-ignored; delete it to start from scratch) |

After changing the schema, generate a migration:

```bash
npm run db:generate
```

PGlite is single-process: don't run two dev servers (or `next start` next to `next dev`) against the same `.data/pglite` directory.

**Moving to hosted Postgres** (Neon, Supabase, RDS…): the schema and migrations are plain Postgres. In `src/db/index.ts`, swap `drizzle-orm/pglite` for `drizzle-orm/node-postgres` with a `DATABASE_URL`; nothing else changes.

## Access model

| Concept | Details |
| --- | --- |
| **Roles** | `admin` — Perseonix staff with full access: every module, all customers, users and the audit log; can create other admins. `user` — employee of a customer company; sees only the modules granted to them. |
| **Customers** | Companies (the `organizations` table). Each has a plan — **POC** (time-boxed evaluation, end date required) or **Licensed** (contract term, optional renewal date) — plus an optional seat limit and a primary contact. Customer users must belong to one; admins usually belong to none. |
| **Seats** | Active customer users count against their company's seat limit; creating, moving or re-enabling a user beyond it is refused. |
| **POC expiry** | The day after a POC's end date, its customer users are signed out and can't sign in (blocked attempts are audited as `auth.login_blocked`). Extending the date or converting to Licensed restores access immediately. Expired *licenses* are only flagged, never locked. |
| **Modules** | Catalog in the `modules` table (`asm` — Attack Surface Management, `investigate` — Threat Investigation, `adversaries` — Adversary Intelligence). Grants live in `user_modules`. Add a module by extending `MODULE_CATALOG` in `src/db/seed.ts`. |

## Adversary Intelligence module

`/app/modules/adversaries` — a browsable database of **411 APT groups, ransomware crews and hacktivists** parsed from the "APT Groups & Operations" tracker (CC BY 4.0). Each profile carries aliases (with the vendor that coined them), MITRE ATT&CK ID (linked out), toolset/malware, target sectors and countries, known operations, modus operandi and overlapping groups (linked to their own profiles where held). The dataset is bundled JSON read server-side (`src/lib/adversaries/`), with per-group images left for the customer to add.

- List page: search (name / alias / malware family), Origin-region and Type filters, region overview cards with threat levels, paginated cards.
- Detail page: sourced aliases, toolset, targets, operations, modus operandi, origin (sponsor / motivation / regional profile) and related-actor pivots.
- To refresh the dataset, re-parse the source document into `src/lib/adversaries/data/{groups,regions}.json`.

## Connectors

`/app/admin/connectors` — admins manage the third-party integrations (Shodan, VirusTotal, AbuseIPDB, URLhaus, urlscan.io): see each one's Active / Disabled / Not-configured status, toggle it on or off, and set, replace or remove its API key. The catalog is code (`src/lib/connectors/config.ts`); state is resolved in `src/lib/connectors/service.ts`, merging database overrides over environment variables. A key saved here overrides its env var; removing it falls back to the env var. Investigation sources read the runtime snapshot, so toggles and keys take effect on the next investigation.

Security: saved keys live server-side and are never returned to the browser (only the last four characters and the source are shown); the audit log records every change without the key. Keys are stored as plaintext in the local database — in production hold them in a secrets manager or encrypt at rest.

Management console: `/app/admin` (overview & upcoming POC/renewal deadlines), `/app/admin/customers`, `/app/admin/users` (licensed, POC and internal accounts shown separately, grouped by company), `/app/admin/audit`.

## Threat Investigation module

`/app/modules/investigate` — customers look up a domain, IP address or URL and get a saved report with a verdict (malicious / suspicious / no known threats / inconclusive) and ranked findings.

Reports are built to be explainable: **Why this verdict** shows the fixed rule and the findings that triggered it; the **investigation trace** shows the question asked of each source, what came back and how long it took; every finding opens to say **why it matters**; **Pivot** links related IPs, hostnames, nameservers and mail servers to their own investigation. Logic lives in `src/lib/investigate/signals.ts` (grading) and `src/lib/investigate/explain.ts` (trace, drivers, pivots).

| Source | Provider | Key |
| --- | --- | --- |
| Vendor detections (90+ AV engines, URL filters, blocklists) | VirusTotal — lookups only, nothing submitted | `VIRUSTOTAL_API_KEY` |
| Abuse reports (confidence score, attack categories) | AbuseIPDB | `ABUSEIPDB_API_KEY` |
| DNS (A, AAAA, CNAME, MX, NS, TXT, CAA, SOA, DMARC) | Cloudflare & Google public resolvers | — |
| Registration (registrar, dates, status, nameservers) | RDAP via rdap.org | — |
| Network & ASN, reverse DNS, abuse contact | Team Cymru (DNS) · RIR RDAP | — |
| Geolocation (city, country, coordinates) and map | MaxMind GeoLite2 via RIPEstat | — |
| Internet exposure (open ports, services, CVEs, tags) | Shodan host lookup | `SHODAN_API_KEY` |
| Certificate transparency | Cert Spotter / crt.sh | — |
| Live check (status, redirects, title, TLS, security headers) | Perseonix probe | — |
| Page capture (screenshot, script redirects, contacted hosts, password forms) | Perseonix sandbox (headless Chromium) | — |
| Malware URL feed | abuse.ch URLhaus | `ABUSECH_AUTH_KEY` (free for non-commercial use) |
| Private screenshot scan | urlscan.io | `URLSCAN_API_KEY` + commercial agreement |

- The live check never runs page scripts and refuses any host that resolves to a private, loopback or reserved address; each connection is pinned to the vetted IP (no DNS rebinding).
- **Page capture** (`src/lib/investigate/sandbox/`) opens the target in headless Chromium through Playwright:
  - One shared browser runs at a time, with a fresh incognito context per capture. Downloads, service workers, permissions and popups are blocked, and there's a 15 s load budget.
  - Every request goes through a loopback proxy that requires credentials. The proxy resolves each host itself, refuses non-public addresses, and connects to the vetted IP. Loopback isn't bypassed, and QUIC and non-proxied WebRTC are disabled.
  - Screenshots are 1280×800 at 2x, stored as JPEG in `.data/captures/<id>.jpg` (`CAPTURE_DIR`), and served by an authenticated route. The report shows them with a press-and-hold magnifier, and the PDF includes them.
  - Setup: install the browser once with `npx playwright-core install chromium-headless-shell`, or set `SANDBOX_BROWSER_PATH`. `SANDBOX_DISABLED=1` turns capture off.
  - Pages run real JavaScript, so in production host the app (or a dedicated capture worker) where it can't reach internal networks.
- Reports are shared within a customer company; administrators see all. Quotas: `INVESTIGATION_DAILY_LIMIT` per company per UTC day (default 200) and 10 per user per minute.
- urlscan.io scans are always submitted as **private**, and screenshots are proxied so the API key never reaches the browser.
- **PDF export:** "Download PDF" on a report (`/app/modules/investigate/[id]/pdf`) renders a branded A4 report on the server with `@react-pdf/renderer` (`src/lib/investigate/pdf/`). It includes a cover band with a TLP:AMBER marking, key figures, an executive summary, findings, the location map, reputation, infrastructure, the live check, indicators, and an appendix (trace, methodology, attribution). Exports are written to the audit log as `investigation.exported`. Fonts are the Inter, JetBrains Mono and Orbitron TTFs from `@expo-google-fonts` (OFL). OpenType `calt` is disabled because fontkit can't read one of JetBrains Mono's alternate glyphs, and Inter's alternates drop dots between digits.
- The location map (`src/components/investigate/location-map.tsx`) is rendered on the server as SVG from Natural Earth borders (`world-atlas`), so no tile server learns which addresses are investigated. The panel carries the MaxMind attribution GeoLite2 requires.
- Provider quotas are enforced in-process before any request (`src/lib/investigate/sources/quota.ts`): VirusTotal 4/minute and 500/day, AbuseIPDB 1,000/day by default (`VIRUSTOTAL_RATE_PER_MINUTE`, `VIRUSTOTAL_DAILY_LIMIT`, `ABUSEIPDB_DAILY_LIMIT`). Lookups are cached for an hour. Counters reset on restart.
- **Licensing:** the free tiers of VirusTotal, AbuseIPDB, Shodan, urlscan.io and abuse.ch forbid commercial use, and the RIPEstat Data API (used for geolocation) needs written permission from RIPE NCC. Get commercial plans or agreements before offering this module to paying customers; DB-IP City Lite (CC BY 4.0) is a drop-in, commercially licensed alternative for geolocation.

## Security

- Passwords hashed with **scrypt** (N=2¹⁵, r=8, p=1), NFKC-normalised, minimum 12 characters.
- Admins never type passwords: new accounts and resets get a server-generated temporary password (`Xk7m-Qp2r-Zt9w-Hn4s`, ~92 bits) that is shown once with a copy-ready hand-off message and never stored in plain text. Creating a customer can open its primary contact's account in the same step. Set `APP_URL` so the hand-off message links to the public sign-in page.
- Session token (256-bit) in an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production); only its SHA-256 is stored. Sessions expire after 12 hours.
- Sign-in throttling: 5 failures per account or 20 per IP within 15 minutes locks further attempts (the current-password check on the change-password page is throttled the same way). Attempts are recorded before the password is checked, so parallel requests can't bypass the limit. Unknown emails take the same time to reject as wrong passwords.
- Client IPs come from the right-most `X-Forwarded-For` entry added by your own proxies; set `TRUSTED_PROXY_COUNT` to the number of proxies in front of the app (default 1).
- Password resets, password changes and account disabling end the affected sessions.
- Guardrails: admins can't demote, disable or delete themselves, and the last active admin can't be removed.
- Authorization is enforced in the data access layer (`src/lib/auth/dal.ts`) and re-checked in every Server Action; `src/proxy.ts` is only an optimistic redirect. Admin-only routes answer 404 to everyone else.
- Every sign-in and administrative change is written to `audit_logs`.
- Baseline security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) in `next.config.ts`.

## Project layout

```
src/
  app/                 routes (marketing, /login, /change-password, /app/**)
  components/
    marketing/         public site sections
    app/               portal shell (sidebar, topbar, bento cards)
    admin/             admin console forms and UI kit
  content/site.ts      marketing copy (placeholder figures — replace before launch)
  db/                  Drizzle schema, connection, seed
  lib/auth/            passwords, sessions, data access layer, rate limiting
  lib/investigate/     investigation engine: target parsing, SSRF guard, sources, signals
  proxy.ts             optimistic auth redirect
drizzle/               SQL migrations
```
