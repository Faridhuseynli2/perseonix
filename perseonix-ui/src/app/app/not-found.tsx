import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Also shown when someone opens a module or admin page they aren't licensed for.
export default function AppNotFound() {
  return (
    <div className="dot-backdrop mx-auto grid max-w-[1400px] place-items-center rounded-xl border border-dashed border-ink/[0.08] bg-navy-900/40 px-6 py-24 text-center">
      <p className="eyebrow text-glow">Error 404</p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
        This area isn&apos;t available
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        The page doesn&apos;t exist, or your account doesn&apos;t have access to it. Ask a
        Perseonix administrator if you think you should.
      </p>
      <Link href="/app" className={cn(buttonVariants(), "mt-8 h-10 gap-2 rounded-md px-5")}>
        <ArrowLeft />
        Back to overview
      </Link>
    </div>
  )
}
