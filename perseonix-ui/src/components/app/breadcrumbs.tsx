"use client"

import { Fragment } from "react"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

const labels: Record<string, string> = {
  admin: "Management",
  users: "Users",
  customers: "Customers",
  connectors: "Connectors",
  audit: "Audit log",
  modules: "Modules",
  settings: "Settings",
  theme: "Theme",
  activity: "Threat activity",
  watchlist: "My watchlist",
  relevance: "Your landscape",
  victims: "Victims",
  groups: "Groups",
}

// Child segments whose label depends on their parent (e.g. /users/new vs /users/<id>).
const childLabels: Record<string, { new: string; detail: string }> = {
  users: { new: "New user", detail: "User details" },
  customers: { new: "New customer", detail: "Customer details" },
  investigate: { new: "New investigation", detail: "Report" },
}

export function Breadcrumbs({ modules }: { modules: { key: string; name: string }[] }) {
  const pathname = usePathname()
  // Drop the leading "app" segment; the root crumb stands in for it.
  const segments = pathname.split("/").filter(Boolean).slice(1)

  const crumbs = [
    "Perseonix Corvael",
    ...segments.map((segment, i) => {
      const parent = segments[i - 1]
      if (parent === "modules") return modules.find((m) => m.key === segment)?.name ?? segment
      // A record under a module (e.g. a threat-actor slug): named sub-routes get a
      // fixed label, everything else is titleized.
      if (parent && modules.some((m) => m.key === parent)) {
        return labels[segment] ?? segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      }
      const child = parent ? childLabels[parent] : undefined
      if (child) return segment === "new" ? child.new : child.detail
      return labels[segment] ?? segment
    }),
  ]

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
      {crumbs.map((crumb, i) => {
        const last = i === crumbs.length - 1
        return (
          <Fragment key={`${crumb}-${i}`}>
            {i > 0 && <ChevronRight aria-hidden className="size-3.5 shrink-0 text-muted-foreground/60" />}
            <span
              aria-current={last ? "page" : undefined}
              className={last ? "truncate font-medium text-ink" : "truncate text-muted-foreground"}
            >
              {crumb}
            </span>
          </Fragment>
        )
      })}
    </nav>
  )
}
