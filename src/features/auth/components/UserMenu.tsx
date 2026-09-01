import { IconLogout } from "@tabler/icons-react"
import { useNavigate } from "react-router"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared"
import { useAuth } from "../context/useAuth"
import { getInitials } from "../lib/initials"

/**
 * Avatar de la cuenta al final de la barra superior, como en Supabase.
 * Antes vivía en el pie del sidebar.
 */
export function UserMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const fullName = user?.user_metadata?.full_name as string | undefined
  const email = user?.email
  const initials = getInitials(fullName, email)
  const displayName = fullName ?? email ?? "Usuario"

  const handleLogout = async () => {
    await signOut()
    navigate("/login")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Cuenta de ${displayName}`}
          className="bg-primary/15 text-primary hover:ring-ring flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold transition-shadow hover:ring-2"
        >
          {initials}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-foreground truncate text-[12.5px] font-semibold">{displayName}</p>
          {email && <p className="text-muted-foreground truncate text-[10.5px]">{email}</p>}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
          <IconLogout size={14} />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
