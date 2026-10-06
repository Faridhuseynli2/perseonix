import type { Metadata } from "next"
import { Lock } from "lucide-react"
import { DomainExposure } from "@/components/credentials/domain-exposure"
import { EmailCheck } from "@/components/credentials/email-check"
import { PasswordCheck } from "@/components/credentials/password-check"
import { requireModule } from "@/lib/auth/dal"
import { CREDENTIALS_MODULE_KEY } from "@/lib/credentials/meta"

export const metadata: Metadata = {
  title: "Credential Exposure",
}

export default async function CredentialsPage() {
  const { user, module } = await requireModule(CREDENTIALS_MODULE_KEY)
  const isAdmin = user.role === "admin"

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="border-b border-ink/10 pb-5">
        <p className="font-mono text-[10px] tracking-[0.22em] text-glow uppercase">Credential Exposure</p>
        <h1 className="mt-2 font-display text-[26px] leading-none font-semibold tracking-tight text-ink lg:text-[30px]">
          {module.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Exposed credentials for your org: breached accounts and infostealer logs. Also checks individual
          passwords and emails.
        </p>
      </header>

      <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-ink/[0.07] bg-navy-800/40 px-4 py-3">
        <Lock className="mt-0.5 size-4 shrink-0 text-glow" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Passwords are hashed in your browser — never sent, stored or displayed in plaintext. Only scan
          domains and addresses you are authorized to check.
        </p>
      </div>

      <div className="mt-6">
        <DomainExposure isAdmin={isAdmin} />
      </div>

      <div className="mt-8">
        <p className="eyebrow text-glow">Quick lookups</p>
        <div className="mt-3 grid gap-5">
          <PasswordCheck />
          <EmailCheck isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  )
}
