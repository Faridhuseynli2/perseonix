import { splitRegistrable } from "@/lib/brand/domain"

// dnstwist-style permutation generator (algorithm, not data). Produces the most
// likely lookalike candidates for a protected domain. Kept bounded and ordered
// by attack-likelihood so DNS resolution stays fast.

const KEYBOARD: Record<string, string> = {
  a: "qwsz", b: "vghn", c: "xdfv", d: "serfcx", e: "wsdr", f: "drtgcv", g: "ftyhbv",
  h: "gyujbn", i: "ujko", j: "huikmn", k: "jiolm", l: "kop", m: "njk", n: "bhjm",
  o: "iklp", p: "ol", q: "wa", r: "edft", s: "awedxz", t: "rfgy", u: "yhji",
  v: "cfgb", w: "qase", x: "zsdc", y: "tghu", z: "asx",
}

const HOMOGLYPH: Record<string, string[]> = {
  o: ["0"], l: ["1", "i"], i: ["1", "l"], e: ["3"], a: ["4"], s: ["5"], g: ["9"], b: ["8"], t: ["7"], z: ["2"],
}

// Alternate TLDs attackers commonly swap to.
const ALT_TLDS = ["com", "net", "org", "co", "io", "app", "info", "online", "site", "xyz", "live", "biz", "us", "cc", "shop"]

// Phishing lures prepended/appended to the brand.
const KEYWORDS = ["login", "secure", "account", "verify", "support", "help", "signin", "sso", "mail", "portal", "update", "pay", "billing", "auth", "vpn"]

export type Candidate = { domain: string; kind: PermKind }
export type PermKind = "typo" | "homoglyph" | "tld-swap" | "keyword" | "hyphen" | "addition"

function add(set: Map<string, Candidate>, domain: string, kind: PermKind) {
  if (!set.has(domain)) set.set(domain, { domain, kind })
}

/** Generate lookalike candidates for a domain, capped to `limit`. */
export function generatePermutations(protectedDomain: string, limit = 320): Candidate[] {
  const { label, tld } = splitRegistrable(protectedDomain)
  const out = new Map<string, Candidate>()
  const base = label

  // 1) Character omission
  for (let i = 0; i < base.length; i++) add(out, `${base.slice(0, i)}${base.slice(i + 1)}.${tld}`, "typo")

  // 2) Adjacent transposition
  for (let i = 0; i < base.length - 1; i++) {
    const arr = base.split("")
    ;[arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]
    add(out, `${arr.join("")}.${tld}`, "typo")
  }

  // 3) Character repetition
  for (let i = 0; i < base.length; i++) add(out, `${base.slice(0, i + 1)}${base[i]}${base.slice(i + 1)}.${tld}`, "typo")

  // 4) Keyboard-adjacent replacement
  for (let i = 0; i < base.length; i++) {
    for (const c of KEYBOARD[base[i]] ?? "") add(out, `${base.slice(0, i)}${c}${base.slice(i + 1)}.${tld}`, "typo")
  }

  // 5) Homoglyph replacement (ASCII look-alikes → registrable)
  for (let i = 0; i < base.length; i++) {
    for (const c of HOMOGLYPH[base[i]] ?? []) add(out, `${base.slice(0, i)}${c}${base.slice(i + 1)}.${tld}`, "homoglyph")
  }

  // 6) TLD swap
  for (const t of ALT_TLDS) if (t !== tld) add(out, `${base}.${t}`, "tld-swap")

  // 7) Hyphenation inside the label
  for (let i = 1; i < base.length; i++) add(out, `${base.slice(0, i)}-${base.slice(i)}.${tld}`, "hyphen")

  // 8) Keyword prefix / suffix (both same-TLD and .com)
  for (const kw of KEYWORDS) {
    add(out, `${kw}-${base}.${tld}`, "keyword")
    add(out, `${base}-${kw}.${tld}`, "keyword")
    if (tld !== "com") add(out, `${base}-${kw}.com`, "keyword")
  }

  return [...out.values()].slice(0, limit)
}
