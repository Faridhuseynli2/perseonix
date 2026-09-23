import type { Metadata } from "next"
import { AppShell } from "@/components/app/app-shell"
import { AppSidebar } from "@/components/app/app-sidebar"
import { AppTopbar } from "@/components/app/app-topbar"
import { CommandMenu } from "@/components/app/command-menu"
import { requireUser } from "@/lib/auth/dal"

export const metadata: Metadata = {
  title: "Perseonix Corvael",
}

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser()
  const modules = user.modules.map(({ key, name }) => ({ key, name }))

  return (
    // `data-app-theme` marks the element the theme picker repaints.
    <div data-app-theme data-theme={user.theme} className="flex-1 bg-navy-850 text-foreground">
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
    </div>
  )
}
