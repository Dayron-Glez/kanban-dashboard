import { useState } from "react"
import { Outlet, useLocation, useParams } from "react-router"
import { Header, SearchContext, Sidebar, SidebarInset, SidebarProvider } from "@/shared"
import { KanbanProvider } from "@/features/board"
import { ProjectSidebarContent, useProjectsContext } from "@/features/project"

const SIDEBAR_COLLAPSED_KEY = "cauce.sidebar.collapsed"

/** 232px expandido (los 230 del design system) y 56px de rail. */
const SIDEBAR_SIZES = {
  "--sidebar-width": "14.5rem",
  "--sidebar-width-icon": "3.5rem",
} as React.CSSProperties

const readCollapsed = (): boolean => {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"
  } catch {
    return false
  }
}

/**
 * Shell del producto, con el reparto de Supabase: la barra superior ocupa todo
 * el ancho y el sidebar cuelga por debajo. Así, al expandirse, el sidebar solo
 * se superpone al contenido y nunca tapa la ruta ni las acciones del header.
 */
function AppShell() {
  // El SidebarProvider delega por completo el estado cuando recibe
  // onOpenChange, así que lo controlamos aquí para poder persistirlo.
  const [open, setOpen] = useState<boolean>(() => !readCollapsed())
  const [searchValue, setSearchValue] = useState<string>("")

  const { id } = useParams()
  const { projects } = useProjectsContext()
  const location = useLocation()

  const isScrollablePage =
    location.pathname.endsWith("/analytics") || location.pathname.endsWith("/settings")
  const projectName = projects.find((p) => p.id === id)?.name

  const handleOpenChange = (next: boolean): void => {
    setOpen(next)
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!next))
    } catch {
      // Modo privado o storage bloqueado: el sidebar sigue funcionando sin persistir.
    }
  }

  return (
    // Las medidas se declaran aquí y no solo en el SidebarProvider porque el
    // Header las necesita para alinear el logo con el rail de iconos.
    <div className="bg-background flex h-screen flex-col" style={SIDEBAR_SIZES}>
      <Header
        projectName={projectName}
        {...(!isScrollablePage && { searchValue, onSearchChange: setSearchValue })}
      />

      <SidebarProvider
        open={open}
        onOpenChange={handleOpenChange}
        className="relative min-h-0 flex-1"
        style={SIDEBAR_SIZES}
      >
        <Sidebar collapsible="icon" overlay className="bg-card border-border border-r">
          <ProjectSidebarContent />
        </Sidebar>

        <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <SearchContext.Provider value={{ searchValue, setSearchValue }}>
            <Outlet />
          </SearchContext.Provider>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

export default function AppLayout() {
  return (
    <KanbanProvider>
      <AppShell />
    </KanbanProvider>
  )
}
