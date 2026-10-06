import { SettingsNav } from "@/components/settings/settings-nav"
import { requireUser } from "@/lib/auth/dal"
import { getPortalDict } from "@/lib/i18n/portal"

export default async function SettingsLayout({ children }: LayoutProps<"/app/settings">) {
  const user = await requireUser()
  const t = getPortalDict(user.locale)
  return (
    <div className="mx-auto max-w-[1400px]">
      <div>
        <p className="eyebrow text-glow">{t.nav.account}</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">{t.settings.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.settings.subtitle}</p>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
