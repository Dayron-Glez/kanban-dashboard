import { useState } from "react"
import { IconPlus, IconSun, IconMoon } from "@tabler/icons-react"
import { Link, useLocation, useParams } from "react-router"
import {
  Button,
  SearchInput,
  SidebarTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTheme,
} from "@/shared/index"
import { useKanban } from "@/features/board/index"
import { CreateColumnSheet } from "@/features/column/index"
import { ProjectCommandDialog } from "@/features/project"

interface HeaderProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  projectName?: string
}

/** Última miga de la ruta, derivada del segmento final de la URL. */
const VIEW_LABELS: Record<string, string> = {
  analytics: "Analytics",
  members: "Miembros",
  archive: "Archivo",
  settings: "Ajustes",
}

export function Header({ searchValue, onSearchChange, projectName }: HeaderProps) {
  const { createNewColumn, columns, tasks, userRole } = useKanban()
  const { theme, toggleTheme } = useTheme()
  const { id: projectId } = useParams()
  const location = useLocation()
  const [createColumnDialogOpen, setCreateColumnDialogOpen] = useState<boolean>(false)
  const [commandOpen, setCommandOpen] = useState<boolean>(false)

  const lastSegment = location.pathname.split("/").filter(Boolean).pop() ?? ""
  const viewLabel = VIEW_LABELS[lastSegment] ?? "Tablero"
  const isOwner = userRole === "owner"

  const handleCreateColumn = (content: string) => {
    createNewColumn(content)
    setCreateColumnDialogOpen(false)
  }

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
          {onSearchChange && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <SearchInput
                        value={searchValue ?? ""}
                        onChange={onSearchChange}
                        disabled={tasks.length === 0}
                      />
                    </div>
                  </TooltipTrigger>
                  {tasks.length === 0 && (
                    <TooltipContent>Crea una tarea para empezar a filtrar</TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              {isOwner && (
                <Button
                  onClick={() => setCreateColumnDialogOpen(true)}
                  className="group hover:border-primary hover:bg-primary/5 hover:text-primary border-2 border-dashed transition-all"
                  variant="outline"
                  disabled={columns.length >= 6}
                >
                  <IconPlus className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                  Agregar Columna
                </Button>
              )}
            </>
          )}
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

      {/* Sin botón visible: solo mantiene vivo el atajo ⌘K para cambiar de proyecto. */}
      <ProjectCommandDialog open={commandOpen} onOpenChange={setCommandOpen} />

      {onSearchChange && isOwner && (
        <CreateColumnSheet
          open={createColumnDialogOpen}
          onOpenChange={setCreateColumnDialogOpen}
          onSave={handleCreateColumn}
        />
      )}
    </>
  )
}
