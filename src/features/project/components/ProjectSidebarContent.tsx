import {
  IconArchive,
  IconChartBar,
  IconLayoutKanban,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"
import { Link, useLocation, useParams } from "react-router"
import {
  CauceLogo,
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
import { SidebarUserFooter } from "./SidebarUserFooter"

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

/**
 * Sidebar de navegación pura, al estilo de Supabase: el cambio de proyecto
 * vive en el selector del breadcrumb, no aquí.
 */
export function ProjectSidebarContent() {
  const { open } = useSidebar()
  const { id: activeId } = useParams()
  const location = useLocation()

  return (
    <TooltipProvider delayDuration={0}>
      <>
        <SidebarContent className="bg-card py-0">
          {/* Marca */}
          <SidebarGroup className="border-border border-b">
            <div className={`flex h-[54px] items-center ${open ? "px-3" : "justify-center"}`}>
              <Link
                to="/projects"
                aria-label="cauce — ir a proyectos"
                className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
              >
                <CauceLogo size={28} showWordmark={open} />
              </Link>
            </div>
          </SidebarGroup>

          {/* Navegación del proyecto */}
          {activeId && (
            <SidebarGroup className="pt-2">
              {open && (
                <div className="text-muted-foreground mb-1.5 px-2 text-[9.5px] font-bold tracking-[0.08em] uppercase">
                  Navegación
                </div>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-px">
                  {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
                    const href = path(activeId)
                    const isActive = location.pathname === href
                    return (
                      <SidebarMenuItem key={label}>
                        {open ? (
                          <Link
                            to={href}
                            className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12.5px] transition-colors ${
                              isActive
                                ? "bg-accent text-accent-foreground font-bold"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <Icon size={16} className="shrink-0" />
                            <span className="flex-1">{label}</span>
                            {isActive && (
                              <span className="bg-primary absolute top-1.5 bottom-1.5 left-0 w-0.5 rounded-r-sm" />
                            )}
                          </Link>
                        ) : (
                          <div className="flex justify-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link
                                  to={href}
                                  aria-label={label}
                                  className={`relative flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                                    isActive
                                      ? "bg-accent text-accent-foreground"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                  }`}
                                >
                                  <Icon size={17} />
                                  {isActive && (
                                    <span className="bg-primary absolute top-2 bottom-2 left-0 w-0.5 rounded-r-sm" />
                                  )}
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent side="right">{label}</TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarUserFooter />
      </>
    </TooltipProvider>
  )
}
