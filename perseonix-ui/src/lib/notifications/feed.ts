import "server-only"
import { notificationsView as adversaryView } from "@/lib/adversaries/watch"
import { caseNotificationsView } from "@/lib/brand/cases"
import { caseNumber } from "@/lib/brand/cases-meta"
import { notificationsView as brandView, type Actor } from "@/lib/brand/store"
import { countryName } from "@/lib/ransomware/meta"
import { notificationsView as ransomwareView } from "@/lib/ransomware/watch"

// Single feed for the header bell, merging every module's alerts. Each item is
// self-describing (carries its own href), so the bell stays module-agnostic.

export type BellItem = {
  id: string
  href: string
  title: string
  sub: string
  tag: string
  kind: "adversary" | "ransomware" | "brand" | "case"
  read: boolean
  createdAt: string
}

export async function notificationFeed(user: Actor): Promise<{ items: BellItem[]; unread: number }> {
  const [adv, rw, brand, cases] = await Promise.all([
    adversaryView(user.id, 12),
    ransomwareView(user.id, 12),
    brandView(user, 12),
    caseNotificationsView(user, 12),
  ])

  const items: BellItem[] = [
    ...adv.items.map((n) => ({
      id: `adv-${n.id}`,
      href: `/app/modules/adversaries/actor/${encodeURIComponent(n.groupName)}`,
      title: n.groupName,
      sub: n.title,
      tag: n.vendor ?? (n.year ? String(n.year) : "Adversary"),
      kind: "adversary" as const,
      read: n.read,
      createdAt: n.createdAt,
    })),
    ...rw.items.map((n) => ({
      id: `rw-${n.id}`,
      href: `/app/modules/ransomware/victims/${n.victimId}`,
      title: n.victim,
      sub: [n.groupName, n.sector].filter(Boolean).join(" · "),
      tag: n.country ? countryName(n.country) : "Ransomware",
      kind: "ransomware" as const,
      read: n.read,
      createdAt: n.createdAt,
    })),
    ...brand.items.map((n) => ({
      id: `brand-${n.id}`,
      href: "/app/modules/brand",
      title: n.domain,
      sub: `Lookalike of ${n.assetDomain}`,
      tag: n.severity === "high" ? "High risk" : "Lookalike",
      kind: "brand" as const,
      read: n.read,
      createdAt: n.createdAt,
    })),
    ...cases.items.map((n) => ({
      id: `case-${n.id}`,
      href: `/app/modules/brand/cases/${n.caseId}`,
      title: `${caseNumber(n.seq)} · ${n.domain ?? n.title}`,
      sub: n.title,
      tag: n.source === "auto" ? "Auto case" : "New case",
      kind: "case" as const,
      read: n.read,
      createdAt: n.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 15)

  return { items, unread: adv.unread + rw.unread + brand.unread + cases.unread }
}
