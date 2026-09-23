import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { LoginForm } from "@/components/auth/login-form"
import { Logo } from "@/components/brand/logo"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getCurrentUser } from "@/lib/auth/dal"

export const metadata: Metadata = {
  title: "Login Portal",
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser()
  if (user) redirect("/app")

  const { next, reason } = await searchParams

  return (
    <main className="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-backdrop fade-mask-radial absolute inset-0" />
        <div className="absolute top-1/2 left-1/2 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-glow/10 blur-[110px]" />
      </div>

      <Link
        href="/"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" />
        Back to site
      </Link>

      <Link href="/" aria-label="Perseonix home" className="mb-8">
        <Logo animated />
      </Link>

      <Card className="relative w-full max-w-[400px] gap-7 rounded-2xl bg-navy-800/70 py-8 shadow-halo ring-glow/20 backdrop-blur-xl">
        <div
          aria-hidden
          className="absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-glow/80 to-transparent"
        />
        <CardHeader className="px-8 text-center">
          <CardTitle className="text-xl font-semibold tracking-tight text-white">
            Analyst Portal
          </CardTitle>
          <CardDescription>Sign in to access Perseonix Corvael.</CardDescription>
        </CardHeader>
        <CardContent className="px-8">
          {reason === "evaluation-ended" && (
            <p
              role="status"
              className="mb-5 rounded-md border border-signal/30 bg-signal/10 px-3 py-2.5 text-sm text-signal"
            >
              Your company&apos;s Perseonix Corvael evaluation has ended, so you were signed out.
              Contact your Perseonix account team to extend access.
            </p>
          )}
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </CardContent>
      </Card>

      <p className="eyebrow mt-8 max-w-sm text-center leading-relaxed text-muted-foreground/70">
        Authorized personnel only · Sessions are monitored
      </p>
    </main>
  )
}
