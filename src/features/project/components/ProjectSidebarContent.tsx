import {
  IconArchive,
  IconChartBar,
  IconLayoutKanban,
  IconSettings,
  IconUsers,
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
  TooltipProvider,
  TooltipTrigger,
  useSidebar,
} from "@/shared"
import { SidebarControlFooter, type SidebarMode } from "./SidebarControlFooter"

const NAV_ITEMS = [
  {
    label: "Tablero",
    icon: IconLayoutKanban,
    path: (id: string) => `/projects/${id}`,
  },
  {
    label: "Analytics",
    icon: IconChartBar,
    path: (id: string) => `/projects/${id}/analytics`,
  },
  {
    label: "Miembros",
    icon: IconUsers,
    path: (id: string) => `/projects/${id}/members`,
  },
  {
    label: "Archivo",
    icon: IconArchive,
    path: (id: string) => `/projects/${id}/archive`,
  },
  {
    label: "Ajustes",
    icon: IconSettings,
    path: (id: string) => `/projects/${id}/settings`,
  },
]

interface Props {
  mode: SidebarMode
  onModeChange: (mode: SidebarMode) => void
}

/**
 * Sidebar de navegación pura, al estilo de Supabase: el cambio de proyecto
 * vive en el selector del breadcrumb, no aquí.
 */
export function ProjectSidebarContent({ mode, onModeChange }: Props) {
  const { open } = useSidebar()
  const { id: activeId } = useParams()
  const location = useLocation()

  return (
    <TooltipProvider delayDuration={0}>
      <>
        {/* overflow-x-hidden: durante la transición de ancho el contenido va
            por delante del panel (open cambia al instante, el ancho anima) y
            el overflow-auto de SidebarContent pintaba un scroll horizontal
            fugaz. */}
        <SidebarContent className="bg-card overflow-x-hidden py-0">
          {/* Navegación del proyecto */}
          {activeId && (
            <SidebarGroup className="pt-2">
              <SidebarGroupContent>
                <SidebarMenu className="gap-px">
                  {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
                    const href = path(activeId)
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
          )}
        </SidebarContent>

        <SidebarControlFooter mode={mode} onModeChange={onModeChange} />
      </>
    </TooltipProvider>
  )
}
