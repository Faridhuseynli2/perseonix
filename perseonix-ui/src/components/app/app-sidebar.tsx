"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  Boxes,
  Bug,
  ChevronDown,
  FolderKanban,
  Gauge,
  KeyRound,
  Landmark,
  LayoutGrid,
  LogOut,
  Network,
  Newspaper,
  Plug,
  PlugZap,
  Radar,
  ScanSearch,
  ScrollText,
  Settings,
  ShieldCheck,
  Skull,
  Users,
  VenetianMask,
  type LucideIcon,
} from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { useSidebar } from "@/components/app/app-shell"
import { logout } from "@/lib/auth/actions"
import { initials } from "@/lib/format"
import { cn } from "@/lib/utils"

type NavItem = { href: string; label: string; icon: LucideIcon; children?: NavItem[] }
type NavSection = { label: string; items: NavItem[]; empty?: string }

// Sub-pages that should appear nested under their module in the sidebar.
const moduleChildren: Record<string, NavItem[]> = {
  intel: [
    { href: "/app/modules/intel", label: "Dashboard", icon: LayoutGrid },
    { href: "/app/modules/intel/cve", label: "CVE Feed", icon: Bug },
    { href: "/app/modules/intel/news", label: "Threat News", icon: Newspaper },
  ],
  brand: [{ href: "/app/modules/brand/cases", label: "Incident Cases", icon: FolderKanban }],
}

const moduleIcons: Record<string, LucideIcon> = {
  intel: Radar,
  asm: Network,
  investigate: ScanSearch,
  adversaries: VenetianMask,
  ransomware: Skull,
  brand: ShieldCheck,
  credentials: KeyRound,
}

const workspaceItems: NavItem[] = [
  { href: "/app", label: "Overview", icon: LayoutGrid },
  { href: "/app/settings", label: "Settings", icon: Settings },
]

const adminItems: NavItem[] = [
  { href: "/app/admin", label: "Overview", icon: Gauge },
  { href: "/app/admin/customers", label: "Customers", icon: Landmark },
  { href: "/app/admin/users", label: "Users", icon: Users },
  {
    href: "/app/admin/connectors",
    label: "Connectors",
    icon: PlugZap,
    children: [{ href: "/app/admin/connectors/modules", label: "Module Connectors", icon: Plug }],
  },
  { href: "/app/admin/audit", label: "Audit log", icon: ScrollText },
]

type AppSidebarProps = {
  user: {
    name: string
    email: string
    role: "admin" | "user"
    organizationName: string | null
  }
  modules: { key: string; name: string }[]
}

export function AppSidebar({ user, modules }: AppSidebarProps) {
  const pathname = usePathname()
  const { close } = useSidebar()
  // Manual expand/collapse overrides; undefined = follow the active route.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Collapse the overlay after navigating on small screens.
  const closeIfMobile = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) close()
  }

  const sections: NavSection[] = [
    { label: "Workspace", items: workspaceItems },
    {
      label: "Modules",
      items: modules.map((m) => ({
        href: `/app/modules/${m.key}`,
        label: m.name,
        icon: moduleIcons[m.key] ?? Boxes,
        children: moduleChildren[m.key],
      })),
      empty: "No modules assigned yet.",
    },
    ...(user.role === "admin" ? [{ label: "Management", items: adminItems }] : []),
  ]

  // The deepest matching link wins (children included), so /app doesn't light up
  // on every page and a sub-page highlights the child, not the parent.
  const activeHref = sections
    .flatMap((s) => s.items)
    .flatMap((item) => [item, ...(item.children ?? [])])
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  // A section is open when the user toggled it, else when the route is inside it.
  const isWithin = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  const isOpen = (href: string) => expanded[href] ?? isWithin(href)
  const toggle = (href: string) => setExpanded((prev) => ({ ...prev, [href]: !isOpen(href) }))

  const renderLink = ({ href, label, icon: Icon }: NavItem, isChild: boolean, trailingPad = false) => {
    const active = href === activeHref
    return (
      <Link
        href={href}
        onClick={closeIfMobile}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group flex items-center gap-3 rounded-r-md border-l-2 pr-3 font-medium transition-colors",
          isChild ? "py-2 pl-9 text-[13px]" : "px-3 py-2.5 text-sm",
          trailingPad && "pr-9",
          active
            ? "border-glow bg-linear-to-r from-brand/15 to-transparent text-ink"
            : "border-transparent text-muted-foreground hover:bg-ink/[0.03] hover:text-ink"
        )}
      >
        <Icon
          className={cn(
            "shrink-0",
            isChild ? "size-3.5" : "size-4",
            active ? "text-glow" : "text-muted-foreground group-hover:text-ink"
          )}
        />
        <span className="truncate">{label}</span>
      </Link>
    )
  }

  return (
    <aside className="flex h-full w-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-ink/[0.06] px-5">
        <Link href="/app" aria-label="Perseonix Corvael" onClick={closeIfMobile}>
          <Logo animated className="size-12" />
        </Link>
      </div>

      <nav aria-label="Application" className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="eyebrow px-3 text-[10px] tracking-[0.2em] text-muted-foreground/70">
              {section.label}
            </p>
            {section.items.length === 0 ? (
              <p className="mt-3 px-3 text-xs text-muted-foreground/70">{section.empty}</p>
            ) : (
              <ul className="mt-3 grid gap-1">
                {section.items.map((item) => {
                  const kids = item.children ?? []
                  if (kids.length === 0) return <li key={item.href}>{renderLink(item, false)}</li>
                  const open = isOpen(item.href)
                  return (
                    <li key={item.href}>
                      <div className="relative">
                        {renderLink(item, false, true)}
                        <button
                          type="button"
                          onClick={() => toggle(item.href)}
                          aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
                          aria-expanded={open}
                          className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground/70 transition-colors hover:bg-ink/[0.05] hover:text-ink"
                        >
                          <ChevronDown
                            className={cn("size-3.5 transition-transform duration-200", open && "rotate-180")}
                          />
                        </button>
                      </div>
                      <div
                        className={cn(
                          "grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 ease-out",
                          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        )}
                      >
                        <ul className="mt-1 grid min-h-0 gap-1 overflow-hidden">
                          {kids.map((child) => (
                            <li key={child.href}>{renderLink(child, true)}</li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ))}
      </nav>

      <div className="border-t border-ink/[0.06] p-3">
        <div className="flex items-center gap-1">
          <Link
            href="/app/settings"
            title="Settings"
            className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-ink/[0.04]"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-navy-600 font-mono text-[11px] font-semibold text-glow ring-1 ring-ink/10">
              {initials(user.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-ink">{user.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {user.role === "admin" ? "Administrator" : (user.organizationName ?? user.email)}
              </span>
            </span>
          </Link>
          <Link
            href="/change-password"
            aria-label="Change password"
            title="Change password"
            className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            <KeyRound className="size-4" />
          </Link>
          <form action={logout}>
            <button
              type="submit"
              aria-label="Sign out"
              title="Sign out"
              className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-ink/[0.04] hover:text-ink"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
