import { SettingsNav } from "@/components/settings/settings-nav"

export default function SettingsLayout({ children }: LayoutProps<"/app/settings">) {
  return (
    <div className="mx-auto max-w-[1400px]">
      <div>
        <p className="eyebrow text-glow">Account</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalise how Perseonix Corvael looks and works for you.
        </p>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
