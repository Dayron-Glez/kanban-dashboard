import { IconLogout, IconChevronsLeft, IconChevronsRight } from "@tabler/icons-react"
import { useNavigate } from "react-router"
import { Button, SidebarFooter, useSidebar } from "@/shared"
import { useAuth } from "@/features/auth"

const getInitials = (fullName: string | undefined, email: string | undefined): string => {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return (email ?? "?").slice(0, 2).toUpperCase()
}

export function SidebarUserFooter() {
  const { user, signOut } = useAuth()
  const { open, toggleSidebar } = useSidebar()
  const navigate = useNavigate()

  const fullName = user?.user_metadata?.full_name as string | undefined
  const email = user?.email
  const initials = getInitials(fullName, email)
  const displayName = fullName ?? email ?? "Usuario"

  const handleLogout = async () => {
    await signOut()
    navigate("/login")
  }

  const avatar = (
    <span
      className="bg-primary/15 text-primary flex shrink-0 items-center justify-center rounded-full font-extrabold"
      style={{ width: 26, height: 26, fontSize: 26 * 0.34 }}
    >
      {initials}
    </span>
  )

  if (!open) {
    return (
      <SidebarFooter className="bg-background border-border border-t pt-2 pb-2">
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleLogout}
            className="hover:bg-muted flex justify-center rounded-md p-1.5"
            title={`${displayName} · Cerrar sesión`}
          >
            {avatar}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-7 w-7 shrink-0"
            onClick={toggleSidebar}
            title="Expandir sidebar"
          >
            <IconChevronsRight size={14} />
          </Button>
        </div>
      </SidebarFooter>
    )
  }

  return (
    <SidebarFooter className="bg-background border-border border-t pt-2 pb-2">
      <div className="flex flex-col gap-1 px-2">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
          {avatar}
          <div className="min-w-0 flex-1">
            <p className="text-foreground truncate text-[12.5px] font-semibold">{displayName}</p>
            {email && <p className="text-muted-foreground truncate text-[10.5px]">{email}</p>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive h-7 w-7 shrink-0"
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            <IconLogout size={14} />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground w-full justify-start gap-1 text-[11.5px] font-semibold"
          onClick={toggleSidebar}
        >
          <IconChevronsLeft size={14} />
          Colapsar
        </Button>
      </div>
    </SidebarFooter>
  )
}
