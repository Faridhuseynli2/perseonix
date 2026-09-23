import { Breadcrumbs } from "@/components/app/breadcrumbs"
import { CommandTrigger } from "@/components/app/command-menu"
import { NotificationBell } from "@/components/app/notification-bell"
import { SidebarToggle } from "@/components/app/app-shell"
import { getCurrentUser } from "@/lib/auth/dal"
import { notificationFeed } from "@/lib/notifications/feed"

export async function AppTopbar({ modules }: { modules: { key: string; name: string }[] }) {
  const user = await getCurrentUser()
  const { items, unread } = user
    ? await notificationFeed({ id: user.id, organizationId: user.organizationId })
    : { items: [], unread: 0 }

  return (
    <header className="glass sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-ink/[0.06] px-4 lg:px-6">
      <SidebarToggle />
      <Breadcrumbs modules={modules} />

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden md:block">
          <CommandTrigger />
        </div>
        <NotificationBell items={items} unread={unread} />
      </div>
    </header>
  )
}
