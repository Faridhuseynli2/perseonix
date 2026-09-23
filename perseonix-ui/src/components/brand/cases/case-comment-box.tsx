"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"
import { addCommentAction } from "@/app/app/modules/brand/cases/actions"

export function CaseCommentBox({ id }: { id: string }) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    const text = body.trim()
    if (!text) return
    setError(null)
    start(async () => {
      const res = await addCommentAction(id, text)
      if (!res.ok) {
        setError(res.error ?? "Could not post.")
        return
      }
      setBody("")
      router.refresh()
    })
  }

  return (
    <div className="rounded-lg border border-ink/[0.09] bg-navy-900/40 p-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Add a note — what you checked, who you contacted, next steps…"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit()
        }}
        className="w-full resize-y rounded-md border border-ink/10 bg-navy-950/50 px-3 py-2 text-sm text-ink placeholder:text-muted-foreground/60 outline-none focus:border-glow/60 focus:ring-2 focus:ring-glow/20"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-muted-foreground/60">⌘/Ctrl + Enter to post</span>
        <button
          type="button"
          onClick={submit}
          disabled={pending || !body.trim()}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-sm font-medium text-white transition-colors hover:bg-brand/90 disabled:opacity-50"
        >
          <Send className="size-3.5" />
          {pending ? "Posting…" : "Post note"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-sev-critical">{error}</p>}
    </div>
  )
}
