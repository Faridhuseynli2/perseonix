"use client"

import { useActionState, useState } from "react"
import { ArrowRight, RefreshCw, Search } from "lucide-react"
import { investigate, type InvestigateState } from "@/app/app/modules/investigate/actions"
import { Notice } from "@/components/admin/ui"
import { Button } from "@/components/ui/button"
import { KIND_LABELS, detectKind } from "@/lib/investigate/meta"

const EXAMPLES = ["example.com", "1.1.1.1", "https://example.org/login"]
const initialState: InvestigateState = {}

export function InvestigateForm({ initialQuery = "" }: { initialQuery?: string }) {
  const [state, formAction, pending] = useActionState(investigate, initialState)
  const [value, setValue] = useState(state.input ?? initialQuery)
  const kind = detectKind(value)

  return (
    <form action={formAction} className="grid gap-4">
      <label htmlFor="investigate-query" className="text-sm font-medium text-ink">
        What do you want to investigate?
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="investigate-query"
            name="query"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            required
            maxLength={2048}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="Domain, IP address or URL"
            aria-describedby="investigate-hint"
            aria-invalid={state.error ? true : undefined}
            className="h-14 w-full rounded-xl border border-ink/10 bg-navy-900/70 pr-28 pl-12 font-mono text-[15px] text-ink outline-none transition-colors placeholder:font-sans placeholder:text-muted-foreground/60 focus-visible:border-glow/60 focus-visible:ring-3 focus-visible:ring-glow/20"
          />
          {kind && (
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 rounded-md bg-brand/10 px-2 py-1 font-mono text-[10px] tracking-wider text-glow uppercase ring-1 ring-brand/25">
              {KIND_LABELS[kind]}
            </span>
          )}
        </div>
        <Button
          type="submit"
          disabled={pending}
          className="h-14 gap-2 rounded-xl px-7 text-[15px] shadow-halo-brand hover:bg-brand/90"
        >
          {pending ? (
            <>
              <RefreshCw className="animate-spin" />
              Investigating…
            </>
          ) : (
            <>
              Investigate
              <ArrowRight />
            </>
          )}
        </Button>
      </div>

      {state.error && <Notice tone="error">{state.error}</Notice>}

      <div id="investigate-hint" aria-live="polite" className="text-xs text-muted-foreground">
        {pending ? (
          "Checking reputation and infrastructure, and opening the page in an isolated browser. This can take up to 30 seconds."
        ) : (
          <span className="flex flex-wrap items-center gap-2">
            Try
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => setValue(example)}
                className="rounded-md border border-ink/10 bg-ink/[0.03] px-2 py-1 font-mono text-foreground/80 transition-colors hover:border-ink/20 hover:text-ink"
              >
                {example}
              </button>
            ))}
          </span>
        )}
      </div>
    </form>
  )
}
