import { useState } from "react"
import { IconPlus, IconSelector, IconSun, IconMoon } from "@tabler/icons-react"
import { Link, useLocation, useParams } from "react-router"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  CauceLogo,
  SearchInput,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTheme,
} from "@/shared/index"
import { UserMenu } from "@/features/auth"
import { useKanban } from "@/features/board/index"
import { CreateColumnSheet } from "@/features/column/index"
import { ProjectCommandPopover, useProjectsContext } from "@/features/project"

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
  const { projects } = useProjectsContext()
  const { theme, toggleTheme } = useTheme()
  const { id: projectId } = useParams()
  const location = useLocation()
  const [createColumnDialogOpen, setCreateColumnDialogOpen] = useState<boolean>(false)

  const lastSegment = location.pathname.split("/").filter(Boolean).pop() ?? ""
  const viewLabel = VIEW_LABELS[lastSegment] ?? "Tablero"
  const isOwner = userRole === "owner"
  const activeProject = projects.find((p) => p.id === projectId)

  const handleCreateColumn = (content: string) => {
    createNewColumn(content)
    setCreateColumnDialogOpen(false)
  }

  return (
    <>
      <header className="bg-card border-border flex h-12 shrink-0 items-center justify-between gap-4 border-b pr-3">
        <div className="flex min-w-0 items-center gap-2">
          {/* Slot del ancho del rail, para que el logo quede alineado con los
              iconos del sidebar que hay justo debajo. */}
          <Link
            to="/projects"
            aria-label="cauce — ir a proyectos"
            className="flex w-(--sidebar-width-icon) shrink-0 justify-center transition-opacity hover:opacity-80"
          >
            <CauceLogo size={24} />
          </Link>

          {/* Barra inclinada de separación, como la de Supabase */}
          <span aria-hidden="true" className="bg-border h-5 w-px rotate-[18deg]" />

          <Breadcrumb>
            <BreadcrumbList className="gap-1.5 text-[13px] sm:gap-1.5">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/projects" className="font-semibold">
                    cauce
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>

              {projectName && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {/* Selector de proyecto, como el de Supabase */}
                    <ProjectCommandPopover>
                      <button
                        aria-label="Cambiar de proyecto"
                        className="text-muted-foreground hover:text-foreground hover:bg-muted flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 font-semibold transition-colors"
                      >
                        {activeProject && (
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: activeProject.color }}
                          />
                        )}
                        <span className="truncate">{projectName}</span>
                        <IconSelector size={14} className="shrink-0 opacity-60" />
                      </button>
                    </ProjectCommandPopover>
                  </BreadcrumbItem>

                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="font-bold">{viewLabel}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
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
                        className="h-8"
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
                  size="sm"
                  disabled={columns.length >= 6}
                >
                  <IconPlus className="mr-1 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                  Agregar Columna
                </Button>
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="text-muted-foreground hover:text-foreground"
          >
            {theme === "dark" ? <IconSun size={15} /> : <IconMoon size={15} />}
          </Button>
          <UserMenu />
        </div>
      </header>

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
