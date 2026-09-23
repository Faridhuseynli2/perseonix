import type { Metadata } from "next"
import { ChangePasswordForm } from "@/components/auth/change-password-form"
import { Logo } from "@/components/brand/logo"
import { TimezoneAutoSet } from "@/components/settings/timezone-autoset"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { logout } from "@/lib/auth/actions"
import { requireUser } from "@/lib/auth/dal"

export const metadata: Metadata = {
  title: "Change password",
}

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPasswordChange: true })
  const forced = user.mustChangePassword

  return (
    <main className="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-backdrop fade-mask-radial absolute inset-0" />
        <div className="absolute top-1/2 left-1/2 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-glow/10 blur-[110px]" />
      </div>

      <TimezoneAutoSet current={user.timezone} />
      <div className="mb-8">
        <Logo animated />
      </div>

      <Card className="relative w-full max-w-[420px] gap-7 rounded-2xl bg-navy-800/70 py-8 shadow-halo ring-glow/20 backdrop-blur-xl">
        <div
          aria-hidden
          className="absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-glow/80 to-transparent"
        />
        <CardHeader className="px-8 text-center">
          <CardTitle className="text-xl font-semibold tracking-tight text-white">
            {forced ? "Set a new password" : "Change password"}
          </CardTitle>
          <CardDescription>
            {forced
              ? "Your administrator issued a temporary password. Choose your own to continue."
              : `Signed in as ${user.email}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8">
          <ChangePasswordForm forced={forced} />
        </CardContent>
      </Card>

      <form action={logout} className="mt-6">
        <button
          type="submit"
          className="text-sm text-muted-foreground transition-colors hover:text-white"
        >
          Sign out
        </button>
      </form>
    </main>
  )
}
