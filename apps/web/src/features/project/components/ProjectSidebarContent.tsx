import {
  IconChartBar,
  IconHome,
  IconLayoutGrid,
  IconLayoutKanban,
  IconSettings,
  IconUsers,
  type IconProps,
} from "@tabler/icons-react"
import { Link, useLocation, useParams } from "react-router"
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useSidebar,
} from "@/shared"
import { SidebarControlFooter, type SidebarMode } from "./SidebarControlFooter"

type NavIcon = React.ComponentType<IconProps>

interface NavItem {
  label: string
  icon: NavIcon
  href: string
}

/** Navegación global, cuando no hay proyecto activo. */
const GLOBAL_NAV: NavItem[] = [
  { label: "Inicio", icon: IconHome, href: "/home" },
  { label: "Proyectos", icon: IconLayoutGrid, href: "/projects" },
]

/** Navegación del proyecto activo. */
const projectNav = (id: string): NavItem[] => [
  { label: "Tablero", icon: IconLayoutKanban, href: `/projects/${id}` },
  { label: "Analytics", icon: IconChartBar, href: `/projects/${id}/analytics` },
  { label: "Miembros", icon: IconUsers, href: `/projects/${id}/members` },
  { label: "Ajustes", icon: IconSettings, href: `/projects/${id}/settings` },
]

interface Props {
  mode: SidebarMode
  onModeChange: (mode: SidebarMode) => void
}

/**
 * Sidebar de navegación pura, al estilo de Supabase: el cambio de proyecto
 * vive en el selector del breadcrumb, no aquí. El nav tiene dos niveles según
 * haya o no un proyecto abierto.
 */
export function ProjectSidebarContent({ mode, onModeChange }: Props) {
  const { open } = useSidebar()
  const { id: activeId } = useParams()
  const location = useLocation()

  const items = activeId ? projectNav(activeId) : GLOBAL_NAV

  return (
    <>
      {/* overflow-x-hidden: durante la transición de ancho el contenido va
          por delante del panel (open cambia al instante, el ancho anima) y
          el overflow-auto de SidebarContent pintaba un scroll horizontal
          fugaz. */}
      <SidebarContent className="bg-card overflow-x-hidden py-0">
        <SidebarGroup className="pt-2">
          <SidebarGroupContent>
            <SidebarMenu className="gap-px">
              {items.map(({ label, icon: Icon, href }) => {
                const isActive = location.pathname === href
                return (
                  <SidebarMenuItem key={label}>
                    {/* Un solo árbol para ambos estados: el icono vive en un
                        slot fijo de 32px (el interior del rail), así no se
                        mueve ni un píxel al expandir; solo aparece la
                        etiqueta a su derecha. */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          to={href}
                          aria-label={label}
                          className={`relative flex h-8 items-center rounded-md transition-colors ${
                            isActive
                              ? "bg-accent text-accent-foreground font-bold"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <span className="flex w-8 shrink-0 items-center justify-center">
                            <Icon size={16} />
                          </span>
                          {open && (
                            <span className="flex-1 truncate pr-2 text-[12.5px] whitespace-nowrap">
                              {label}
                            </span>
                          )}
                          {isActive && (
                            <span className="bg-primary absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-r-sm" />
                          )}
                        </Link>
                      </TooltipTrigger>
                      {!open && <TooltipContent side="right">{label}</TooltipContent>}
                    </Tooltip>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarControlFooter mode={mode} onModeChange={onModeChange} />
    </>
  )
}
