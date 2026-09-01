import { useState } from "react"
import { Outlet, useLocation, useParams } from "react-router"
import { Header, SearchContext, Sidebar, SidebarInset, SidebarProvider } from "@/shared"
import { KanbanProvider } from "@/features/board"
import { ProjectSidebarContent, useProjectsContext, type SidebarMode } from "@/features/project"

const SIDEBAR_MODE_KEY = "cauce.sidebar.mode"
const LEGACY_COLLAPSED_KEY = "cauce.sidebar.collapsed"

/** 192px expandido y 56px de rail. */
const SIDEBAR_SIZES = {
  "--sidebar-width": "12rem",
  "--sidebar-width-icon": "3.5rem",
} as React.CSSProperties

/** Lee el modo guardado, migrando la clave booleana anterior si aún existe. */
const readMode = (): SidebarMode => {
  try {
    const saved = localStorage.getItem(SIDEBAR_MODE_KEY)
    if (saved === "expanded" || saved === "collapsed" || saved === "hover") return saved

    const legacy = localStorage.getItem(LEGACY_COLLAPSED_KEY)
    if (legacy !== null) {
      const mode: SidebarMode = legacy === "true" ? "collapsed" : "expanded"
      localStorage.setItem(SIDEBAR_MODE_KEY, mode)
      localStorage.removeItem(LEGACY_COLLAPSED_KEY)
      return mode
    }
  } catch {
    // Storage bloqueado: se usa el modo por defecto sin persistir.
  }
  return "expanded"
}

/**
 * Shell del producto, con el reparto de Supabase: la barra superior ocupa todo
 * el ancho y el sidebar cuelga por debajo. El sidebar tiene tres modos, como
 * el "Sidebar control" de Supabase: expandido (fijo, empuja el contenido),
 * contraído (rail con tooltips) y expandir al pasar el cursor (el panel se
 * superpone al contenido mientras el ratón está encima).
 */
function AppShell() {
  const [mode, setMode] = useState<SidebarMode>(readMode)
  const [hoverOpen, setHoverOpen] = useState(false)
  const [searchValue, setSearchValue] = useState<string>("")

  const { id } = useParams()
  const { projects } = useProjectsContext()
  const location = useLocation()

  const isScrollablePage =
    location.pathname.endsWith("/analytics") || location.pathname.endsWith("/settings")
  const projectName = projects.find((p) => p.id === id)?.name

  const open = mode === "expanded" || (mode === "hover" && hoverOpen)

  const handleModeChange = (next: SidebarMode): void => {
    setMode(next)
    setHoverOpen(false)
    try {
      localStorage.setItem(SIDEBAR_MODE_KEY, next)
    } catch {
      // Modo privado o storage bloqueado: el sidebar sigue funcionando sin persistir.
    }
  }

  // El atajo Ctrl/⌘+B del SidebarProvider alterna entre expandido y contraído.
  const handleOpenChange = (next: boolean): void => {
    handleModeChange(next ? "expanded" : "collapsed")
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
        <Sidebar
          collapsible="icon"
          anchored
          // Fijado en expandido, el panel empuja el contenido; en hover se
          // superpone sin mover el tablero.
          overlay={mode !== "expanded"}
          className="bg-card border-border border-r"
          {...(mode === "hover" && {
            onMouseEnter: () => setHoverOpen(true),
            onMouseLeave: () => setHoverOpen(false),
          })}
        >
          <ProjectSidebarContent mode={mode} onModeChange={handleModeChange} />
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
