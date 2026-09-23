import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function NotFound() {
  return (
    <main className="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-backdrop fade-mask-radial absolute inset-0" />
        <div className="radar-rings fade-mask-radial absolute top-1/2 left-1/2 size-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60" />
      </div>

      <Link href="/" aria-label="Perseonix home">
        <Logo />
      </Link>
      <p className="eyebrow mt-12 text-glow">Error 404</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        Signal lost.
      </h1>
      <p className="mt-4 max-w-md text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link
        href="/"
        className={cn(buttonVariants(), "mt-8 h-10 gap-2 rounded-md px-5 shadow-halo-brand")}
      >
        <ArrowLeft />
        Back to home
      </Link>
    </main>
  )
}
