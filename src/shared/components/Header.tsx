import { useState } from "react"
import { IconSearch, IconSun, IconMoon } from "@tabler/icons-react"
import { Link, useLocation, useParams } from "react-router"
import { Button, SidebarTrigger, useTheme } from "@/shared/index"
import { ProjectCommandDialog } from "@/features/project"

interface HeaderProps {
  projectName?: string
}

/** Última miga de la ruta, derivada del segmento final de la URL. */
const VIEW_LABELS: Record<string, string> = {
  analytics: "Analytics",
  members: "Miembros",
  archive: "Archivo",
  settings: "Ajustes",
}

export function Header({ projectName }: HeaderProps) {
  const { theme, toggleTheme } = useTheme()
  const { id: projectId } = useParams()
  const location = useLocation()
  const [commandOpen, setCommandOpen] = useState<boolean>(false)

  const lastSegment = location.pathname.split("/").filter(Boolean).pop() ?? ""
  const viewLabel = VIEW_LABELS[lastSegment] ?? "Tablero"

  return (
    <>
      <header className="bg-card border-border flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4">
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          {/* Ruta: cauce / Proyecto / Vista */}
          <nav aria-label="Ruta" className="flex min-w-0 items-center gap-2 text-[13px]">
            <Link
              to="/projects"
              className="text-muted-foreground hover:text-foreground font-semibold transition-colors"
            >
              cauce
            </Link>
            {projectName && (
              <>
                <span className="text-muted-foreground/60" aria-hidden="true">
                  /
                </span>
                <Link
                  to={`/projects/${projectId}`}
                  className="text-muted-foreground hover:text-foreground truncate font-semibold transition-colors"
                >
                  {projectName}
                </Link>
                <span className="text-muted-foreground/60" aria-hidden="true">
                  /
                </span>
                <span aria-current="page" className="text-foreground shrink-0 font-bold">
                  {viewLabel}
                </span>
              </>
            )}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCommandOpen(true)}
            aria-label="Buscar proyecto"
            className="text-muted-foreground hover:text-foreground gap-2 font-semibold"
          >
            <IconSearch size={14} />
            Buscar
            <kbd className="border-border bg-muted text-muted-foreground pointer-events-none flex shrink-0 items-center gap-0.5 rounded border px-1.5 py-0.5 font-mono text-[10px]">
              <span>⌘</span>
              <span>K</span>
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <IconSun size={16} /> : <IconMoon size={16} />}
          </Button>
        </div>
      </header>

      <ProjectCommandDialog open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  )
}
