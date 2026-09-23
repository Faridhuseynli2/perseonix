"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Clock, Palette, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type SettingsItem = { href: string; label: string; description: string; icon: LucideIcon }

const sections: { label: string; items: SettingsItem[] }[] = [
  {
    label: "Preferences",
    items: [
      {
        href: "/app/settings/theme",
        label: "Theme",
        description: "Perseonix, dark or light",
        icon: Palette,
      },
      {
        href: "/app/settings/timezone",
        label: "Timezone",
        description: "Show all times in your local time",
        icon: Clock,
      },
    ],
  },
]

export function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Settings"
      className="h-fit rounded-xl border border-ink/[0.07] bg-navy-800/60 p-3 lg:sticky lg:top-24"
    >
      {sections.map((section) => (
        <div key={section.label}>
          <p className="eyebrow px-3 pt-2 pb-3 text-[10px]">{section.label}</p>
          <ul className="grid gap-1">
            {section.items.map(({ href, label, description, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3.5 rounded-r-lg border-l-2 px-3 py-3 transition-colors",
                      active
                        ? "border-glow bg-linear-to-r from-brand/15 to-transparent"
                        : "border-transparent hover:bg-ink/[0.03]"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-lg ring-1",
                        active ? "bg-brand/15 ring-brand/30" : "bg-ink/[0.04] ring-ink/10"
                      )}
                    >
                      <Icon className={cn("size-4", active ? "text-glow" : "text-muted-foreground")} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {description}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
