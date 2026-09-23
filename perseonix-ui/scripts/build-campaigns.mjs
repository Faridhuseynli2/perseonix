#!/usr/bin/env node
// Builds the campaign/activity dataset for Adversary Intelligence from a curated
// list of public threat-report URLs (src/lib/adversaries/data/apt-links.txt),
// grouped by "### YEAR". We store links, derived titles (from the URL slug, a
// factual identifier — never the article text) and the vendor, and best-effort
// attribute each report to a tracked actor via the group alias index.
//
//   node scripts/build-campaigns.mjs
//
// Add more links to apt-links.txt (under the right year) and re-run.

import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DATA = path.join(ROOT, "src/lib/adversaries/data")

// Hostname → publisher label.
const VENDORS = [
  ["welivesecurity", "ESET"],
  ["paloaltonetworks", "Unit 42"],
  ["checkpoint", "Check Point"],
  ["talosintelligence", "Cisco Talos"],
  ["cyfirma", "CYFIRMA"],
  ["cloud.google", "Google Threat Intelligence"],
  ["mandiant", "Mandiant"],
  ["trellix", "Trellix"],
  ["trendmicro", "Trend Micro"],
  ["trendaisecurity", "Trend Micro"],
  ["fireeye", "Mandiant/FireEye"],
  ["cyble", "Cyble"],
  ["security.com", "Symantec"],
  ["symantec", "Symantec"],
  ["seqrite", "Seqrite"],
  ["proofpoint", "Proofpoint"],
  ["silentpush", "Silent Push"],
  ["asec.ahnlab", "AhnLab"],
  ["volexity", "Volexity"],
  ["microsoft", "Microsoft"],
  ["cybereason", "Cybereason"],
  ["eclypsium", "Eclypsium"],
  ["sonicwall", "SonicWall"],
  ["recordedfuture", "Recorded Future"],
  ["fortinet", "Fortinet"],
  ["sophos", "Sophos"],
  ["hunt.io", "Hunt.io"],
  ["any.run", "ANY.RUN"],
  ["zscaler", "Zscaler"],
  ["vulncheck", "VulnCheck"],
  ["trustwave", "Trustwave"],
  ["threatray", "Threatray"],
  ["sentinelone", "SentinelOne"],
  ["sekoia", "Sekoia"],
  ["reversinglabs", "ReversingLabs"],
  ["resecurity", "Resecurity"],
  ["rapid7", "Rapid7"],
  ["radware", "Radware"],
  ["lumen", "Lumen"],
  ["darktrace", "Darktrace"],
  ["securityscorecard", "SecurityScorecard"],
  ["crowdstrike", "CrowdStrike"],
  ["group-ib", "Group-IB"],
  ["guidepointsecurity", "GuidePoint"],
  ["expel", "Expel"],
  ["socket.dev", "Socket"],
  ["aws.amazon", "AWS"],
  ["arcticwolf", "Arctic Wolf"],
  ["domaintools", "DomainTools"],
  ["cobalt.io", "Cobalt"],
  ["huntress", "Huntress"],
  ["malwarebytes", "Malwarebytes"],
  ["blog.checkpoint", "Check Point"],
]

function vendorOf(host) {
  for (const [needle, label] of VENDORS) if (host.includes(needle)) return label
  return host.replace(/^www\./, "").split(".")[0].replace(/^\w/, (c) => c.toUpperCase())
}

// Path segments that are structure, not a title.
const NOISE = new Set([
  "blog", "blogs", "research", "en", "en-us", "en-gb", "en_us", "us", "posts", "post",
  "threat-research", "threat-intelligence", "threat-insight", "labs", "security-research",
  "cybersecurity-blog", "topics", "security", "resources", "article", "videos", "podcasts",
  "threat-advisories-and-attack-reports", "blogs", "researcher-spotlight",
])

function titleFrom(url) {
  const u = new URL(url)
  const segments = u.pathname.split("/").filter((s) => s && !NOISE.has(s.toLowerCase()))
  let slug = segments.reverse().find((s) => /[a-z]/i.test(s) && s.length > 3) || segments[0] || u.hostname
  slug = slug.replace(/\.(html?|php|aspx)$/i, "").replace(/#.*$/, "")
  let title = slug.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim()
  // Numeric-only slugs (e.g. Talos uat-#### or ahnlab ids) → keep as an id label.
  if (!/[a-z]/i.test(title)) title = `Report ${title}`
  title = title.charAt(0).toUpperCase() + title.slice(1)
  return title.length > 120 ? `${title.slice(0, 117)}…` : title
}

function yearFrom(url, sectionYear) {
  const inPath = url.match(/\/(20(1[5-9]|2[0-6]))\//)
  if (inPath) return Number(inPath[1])
  const short = url.match(/\/(1[5-9]|2[0-6])\/[a-z0-9]{1,3}\//) // trendmicro /24/l/
  if (short) return 2000 + Number(short[1])
  return sectionYear
}

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "")

async function main() {
  const groups = JSON.parse(await readFile(path.join(DATA, "groups.json"), "utf8"))

  // alias/name -> slug, keyed by normalized form. Skip very short/ambiguous names.
  const aliasToSlug = new Map()
  for (const g of groups) {
    for (const name of [g.name, ...(g.aliasNames || [])]) {
      const key = norm(name)
      if (key.length >= 5 && !aliasToSlug.has(key)) aliasToSlug.set(key, g.slug)
    }
  }
  const bySlug = new Map(groups.map((g) => [g.slug, g]))
  // Well-known short names the length filter skips; only added if the slug exists.
  for (const [alias, slug] of [
    ["lazarus", "lazarus-group"],
    ["apt28", "sofacy"],
    ["fancybear", "sofacy"],
  ]) {
    if (bySlug.has(slug)) aliasToSlug.set(alias, slug)
  }

  function attribute(url, title) {
    // Build normalized 1–3 word n-grams from the title and match against aliases.
    const words = title.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/[\s-]+/).filter(Boolean)
    for (let n = 3; n >= 1; n--) {
      for (let i = 0; i + n <= words.length; i++) {
        const key = norm(words.slice(i, i + n).join(""))
        const slug = aliasToSlug.get(key)
        if (slug) return slug
      }
    }
    // Fallback: scan the whole path for a compact alias (e.g. "oilrig", "apt41").
    const compact = norm(new URL(url).pathname)
    for (const [key, slug] of aliasToSlug) {
      if (key.length >= 6 && compact.includes(key)) return slug
    }
    return null
  }

  const text = await readFile(path.join(DATA, "apt-links.txt"), "utf8")
  const campaigns = []
  const seen = new Set()
  let sectionYear = null
  for (const raw of text.split("\n")) {
    const line = raw.trim()
    const header = line.match(/^#+\s*(20\d\d)/)
    if (header) {
      sectionYear = Number(header[1])
      continue
    }
    if (!/^https?:\/\//i.test(line)) continue
    let url
    try {
      url = new URL(line)
    } catch {
      continue
    }
    const clean = `${url.origin}${url.pathname}`.replace(/\/$/, "")
    if (seen.has(clean)) continue
    seen.add(clean)

    const title = titleFrom(line)
    const actorSlug = attribute(line, title)
    campaigns.push({
      id: norm(clean).slice(0, 48),
      year: yearFrom(line, sectionYear),
      title,
      vendor: vendorOf(url.hostname),
      url: clean,
      actorSlug,
      actorName: actorSlug ? bySlug.get(actorSlug)?.name : null,
      region: actorSlug ? bySlug.get(actorSlug)?.region : null,
    })
  }

  campaigns.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title))
  const attributed = campaigns.filter((c) => c.actorSlug).length
  const payload = {
    source: "Curated public threat-report links (see apt-links.txt)",
    updatedAt: new Date().toISOString().slice(0, 10),
    total: campaigns.length,
    attributed,
    campaigns,
  }
  await writeFile(path.join(DATA, "campaigns.json"), JSON.stringify(payload), "utf8")

  const byYear = {}
  for (const c of campaigns) byYear[c.year] = (byYear[c.year] || 0) + 1
  console.log(`Parsed ${campaigns.length} reports; attributed ${attributed} to tracked actors.`)
  console.log("By year:", JSON.stringify(byYear))
  const counts = {}
  for (const c of campaigns) if (c.actorSlug) counts[c.actorName] = (counts[c.actorName] || 0) + 1
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12)
  console.log("Top actors:", top.map(([n, c]) => `${n}:${c}`).join(", "))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
