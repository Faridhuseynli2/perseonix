import type { Metadata } from "next"
import { AppShell } from "@/components/app/app-shell"
import { AppSidebar } from "@/components/app/app-sidebar"
import { AppTopbar } from "@/components/app/app-topbar"
import { CommandMenu } from "@/components/app/command-menu"
import { PortalI18nProvider } from "@/components/i18n/portal-i18n"
import { requireUser } from "@/lib/auth/dal"
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config"
import { getPortalDict } from "@/lib/i18n/portal"

export const metadata: Metadata = {
  title: "Perseonix Corvael",
}

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser()
  const modules = user.modules.map(({ key, name }) => ({ key, name }))
  const locale = isLocale(user.locale) ? user.locale : DEFAULT_LOCALE
  const dict = getPortalDict(locale)

  return (
    // `data-app-theme` marks the element the theme picker repaints.
    <div data-app-theme data-theme={user.theme} lang={locale} className="flex-1 bg-navy-850 text-foreground">
      <PortalI18nProvider locale={locale} dict={dict}>
        <AppShell
          sidebar={
            <AppSidebar
              user={{
                name: user.name,
                email: user.email,
                role: user.role,
                organizationName: user.organizationName,
              }}
              modules={modules}
            />
          }
          topbar={<AppTopbar modules={modules} />}
        >
          {children}
        </AppShell>
        <CommandMenu modules={modules} role={user.role} />
      </PortalI18nProvider>
    </div>
  )
}
