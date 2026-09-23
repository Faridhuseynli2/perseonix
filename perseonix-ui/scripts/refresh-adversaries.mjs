#!/usr/bin/env node
// Enriches the Adversary Intelligence dataset with MITRE ATT&CK data
// (techniques, software, references, descriptions) and writes
// src/lib/adversaries/data/mitre.json. Safe to re-run; regenerates the file.
//
//   node scripts/refresh-adversaries.mjs
//
// Downloads the official ATT&CK STIX bundles (Enterprise/Mobile/ICS) from
// github.com/mitre-attack/attack-stix-data. Set STIX_DIR to read local copies
// instead of downloading. ATT&CK is free for commercial use with attribution.

import { readFile, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const DATA_DIR = path.join(ROOT, "src/lib/adversaries/data")
const BASE = "https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master"
const DOMAINS = ["enterprise-attack", "mobile-attack", "ics-attack"]
const MAX_REFERENCES = 30

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "")
const attackId = (o) => o.external_references?.find((r) => r.source_name === "mitre-attack")?.external_id
const attackUrl = (o) => o.external_references?.find((r) => r.source_name === "mitre-attack")?.url
const alive = (o) => !o.revoked && !o.x_mitre_deprecated

async function loadDomain(domain) {
  const local = process.env.STIX_DIR && path.join(process.env.STIX_DIR, `${domain}.json`)
  if (local && existsSync(local)) {
    return JSON.parse(await readFile(local, "utf8"))
  }
  const res = await fetch(`${BASE}/${domain}/${domain}.json`)
  if (!res.ok) throw new Error(`Failed to fetch ${domain}: HTTP ${res.status}`)
  return res.json()
}

async function main() {
  const groups = JSON.parse(await readFile(path.join(DATA_DIR, "groups.json"), "utf8"))

  // Accumulated per ATT&CK group id (G####), merged across domains.
  const gid = new Map() // gid -> { name, description, url, aliases:Set, refs:Map(url->name), tactics:Map(short->Map(tid->tech)), software:Map(sid->soft) }
  const tacticOrder = []
  const tacticLabel = new Map()
  const nameIndex = new Map() // normalized MITRE name/alias -> gid

  for (const domain of DOMAINS) {
    const bundle = await loadDomain(domain)
    const objects = bundle.objects
    const byStix = new Map(objects.map((o) => [o.id, o]))

    // Tactic labels + order from the matrix.
    for (const t of objects) {
      if (t.type === "x-mitre-tactic" && t.x_mitre_shortname) {
        tacticLabel.set(t.x_mitre_shortname, t.name)
      }
    }
    const matrix = objects.find((o) => o.type === "x-mitre-matrix")
    for (const ref of matrix?.tactic_refs ?? []) {
      const t = byStix.get(ref)
      if (t?.x_mitre_shortname && !tacticOrder.includes(t.x_mitre_shortname)) {
        tacticOrder.push(t.x_mitre_shortname)
      }
    }

    // Register intrusion sets.
    for (const o of objects) {
      if (o.type !== "intrusion-set" || !alive(o)) continue
      const id = attackId(o)
      if (!id) continue
      if (!gid.has(id)) {
        gid.set(id, {
          name: o.name,
          description: o.description || "",
          url: attackUrl(o) || `https://attack.mitre.org/groups/${id}`,
          aliases: new Set((o.aliases || []).map(String)),
          refs: new Map(),
          tactics: new Map(),
          software: new Map(),
        })
      }
      const entry = gid.get(id)
      if ((o.description || "").length > entry.description.length) entry.description = o.description
      for (const a of o.aliases || []) entry.aliases.add(String(a))
      for (const r of o.external_references || []) {
        if (r.url && r.source_name !== "mitre-attack" && !entry.refs.has(r.url)) {
          entry.refs.set(r.url, r.source_name || r.url)
        }
      }
      nameIndex.set(norm(o.name), id)
      for (const a of o.aliases || []) if (!nameIndex.has(norm(a))) nameIndex.set(norm(a), id)
    }

    // Attach techniques and software via "uses" relationships.
    const setStixToGid = new Map()
    for (const o of objects) {
      if (o.type === "intrusion-set" && attackId(o)) setStixToGid.set(o.id, attackId(o))
    }
    for (const rel of objects) {
      if (rel.type !== "relationship" || rel.relationship_type !== "uses") continue
      const id = setStixToGid.get(rel.source_ref)
      if (!id) continue
      const target = byStix.get(rel.target_ref)
      if (!target || !alive(target)) continue
      const entry = gid.get(id)
      if (target.type === "attack-pattern") {
        const tid = attackId(target)
        if (!tid) continue
        for (const phase of target.kill_chain_phases ?? []) {
          if (phase.kill_chain_name !== "mitre-attack") continue
          const short = phase.phase_name
          if (!entry.tactics.has(short)) entry.tactics.set(short, new Map())
          entry.tactics.get(short).set(tid, {
            id: tid,
            name: target.name,
            url: `https://attack.mitre.org/techniques/${tid.replace(".", "/")}`,
            sub: Boolean(target.x_mitre_is_subtechnique),
          })
        }
      } else if (target.type === "malware" || target.type === "tool") {
        const sid = attackId(target)
        if (sid && !entry.software.has(sid)) {
          entry.software.set(sid, {
            id: sid,
            name: target.name,
            type: target.type === "tool" ? "tool" : "malware",
            url: `https://attack.mitre.org/software/${sid}`,
          })
        }
      }
    }
  }

  // Match our groups to ATT&CK groups: by G-id, else by name/alias.
  const out = {}
  let matched = 0
  let byId = 0
  let byAlias = 0
  for (const group of groups) {
    let id = group.mitreId && gid.has(group.mitreId) ? group.mitreId : null
    if (id) byId++
    if (!id) {
      const candidates = [group.name, ...(group.aliasNames || [])]
      for (const c of candidates) {
        const found = nameIndex.get(norm(c))
        if (found) {
          id = found
          byAlias++
          break
        }
      }
    }
    if (!id) continue
    const entry = gid.get(id)
    matched++

    const tactics = tacticOrder
      .filter((short) => entry.tactics.has(short))
      .map((short) => ({
        key: short,
        label: tacticLabel.get(short) || short,
        techniques: [...entry.tactics.get(short).values()].sort((a, b) => a.name.localeCompare(b.name)),
      }))
    const techniqueCount = new Set([...entry.tactics.values()].flatMap((m) => [...m.keys()])).size
    const software = [...entry.software.values()].sort((a, b) => a.name.localeCompare(b.name))
    const references = [...entry.refs.entries()].slice(0, MAX_REFERENCES).map(([url, name]) => ({ name, url }))

    out[group.slug] = {
      attackId: id,
      attackUrl: entry.url,
      attackName: entry.name,
      description: entry.description || "",
      techniqueCount,
      tactics,
      software,
      references,
    }
  }

  const payload = {
    source: "MITRE ATT&CK (attack-stix-data)",
    license: "© 2020–2025 The MITRE Corporation. Reproduced with permission.",
    updatedAt: new Date().toISOString().slice(0, 10),
    matched,
    groups: out,
  }
  await writeFile(path.join(DATA_DIR, "mitre.json"), JSON.stringify(payload), "utf8")

  const size = (JSON.stringify(payload).length / 1024).toFixed(0)
  console.log(`Enriched ${matched}/${groups.length} groups (${byId} by ATT&CK id, ${byAlias} by alias).`)
  console.log(`Wrote src/lib/adversaries/data/mitre.json (${size} KB).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
