import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// Shared dense table for the console. Column-configurable, optional severity
// spine + row click. Used by module lists so they read as one product.
export type Column<T> = {
  key: string
  header: string
  width?: string // CSS grid track, e.g. "90px" — defaults to minmax(0,1fr)
  align?: "right"
  cell: (row: T) => ReactNode
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  spine,
  minWidth = 720,
  empty,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  spine?: (row: T) => string
  minWidth?: number
  empty?: ReactNode
}) {
  const template = `${spine ? "3px " : ""}${columns.map((c) => c.width ?? "minmax(0,1fr)").join(" ")}`

  if (rows.length === 0 && empty) return <div>{empty}</div>

  return (
    <div className="overflow-x-auto">
      {/* header */}
      <div
        className="grid items-center gap-3 border-b border-ink/[0.06] px-4 py-2 font-mono text-[9px] tracking-[0.14em] text-muted-foreground/50 uppercase"
        style={{ gridTemplateColumns: template, minWidth }}
      >
        {spine && <span />}
        {columns.map((c) => (
          <span key={c.key} className={cn(c.align === "right" && "text-right")}>
            {c.header}
          </span>
        ))}
      </div>
      {/* rows */}
      <ul>
        {rows.map((row) => (
          <li key={rowKey(row)}>
            <div
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        onRowClick(row)
                      }
                    }
                  : undefined
              }
              className={cn(
                "grid items-center gap-3 border-b border-ink/[0.04] px-4 py-2.5 transition-colors",
                onRowClick && "cursor-pointer outline-none hover:bg-ink/[0.03] focus-visible:bg-ink/[0.05]"
              )}
              style={{ gridTemplateColumns: template, minWidth }}
            >
              {spine && <span aria-hidden className="h-8 w-[3px] rounded-full" style={{ backgroundColor: spine(row) }} />}
              {columns.map((c) => (
                <div key={c.key} className={cn("min-w-0", c.align === "right" && "text-right")}>
                  {c.cell(row)}
                </div>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
