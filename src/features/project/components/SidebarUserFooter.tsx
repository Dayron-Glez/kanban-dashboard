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
    <span className="bg-primary text-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
      {initials}
    </span>
  )

  if (!open) {
    return (
      <SidebarFooter className="bg-background pt-4 pb-4">
        <div className="flex flex-col items-center gap-2">
          {avatar}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-primary h-7 w-7 shrink-0"
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
    <SidebarFooter className="bg-background pt-4 pb-4">
      <div className="flex items-center gap-3 px-3">
        {avatar}
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-medium">{displayName}</p>
          {email && <p className="text-muted-foreground truncate text-xs">{email}</p>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive h-7 w-7 shrink-0"
          onClick={handleLogout}
          title="Cerrar sesión"
        >
          <IconLogout size={16} />
        </Button>
      </div>
      <div className="px-3 pt-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-primary w-full justify-start gap-1 text-xs"
          onClick={toggleSidebar}
        >
          <IconChevronsLeft size={14} />
          Colapsar
        </Button>
      </div>
    </SidebarFooter>
  )
}
