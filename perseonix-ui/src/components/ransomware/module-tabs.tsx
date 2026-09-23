"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/app/modules/ransomware", label: "Overview" },
  { href: "/app/modules/ransomware/victims", label: "Victims" },
  { href: "/app/modules/ransomware/groups", label: "Groups" },
]

export function ModuleTabs() {
  const pathname = usePathname()
  return (
    <nav className="flex flex-wrap gap-1" aria-label="Ransomware Tracker sections">
      {TABS.map((tab) => {
        const active =
          tab.href === "/app/modules/ransomware"
            ? pathname === tab.href
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center rounded-md px-3 text-sm font-medium transition-colors",
              active
                ? "bg-sev-critical/12 text-sev-critical ring-1 ring-inset ring-sev-critical/25"
                : "text-muted-foreground hover:bg-ink/[0.04] hover:text-ink"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
