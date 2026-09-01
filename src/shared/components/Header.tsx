import { type ReactNode } from "react"
import { IconSelector, IconSun, IconMoon } from "@tabler/icons-react"
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
  useTheme,
} from "@/shared/index"
import { UserMenu } from "@/features/auth"
import { ProjectCommandPopover, useProjectsContext } from "@/features/project"

interface HeaderProps {
  projectName?: string
  /** Acciones contextuales de la vista (p. ej. filtro y columnas del tablero),
   * renderizadas en el grupo derecho antes del tema y la cuenta. */
  actions?: ReactNode
}

/** Última miga de la ruta, derivada del segmento final de la URL. */
const VIEW_LABELS: Record<string, string> = {
  analytics: "Analytics",
  members: "Miembros",
  archive: "Archivo",
  settings: "Ajustes",
}

export function Header({ projectName, actions }: HeaderProps) {
  const { projects } = useProjectsContext()
  const { theme, toggleTheme } = useTheme()
  const { id: projectId } = useParams()
  const location = useLocation()

  const lastSegment = location.pathname.split("/").filter(Boolean).pop() ?? ""
  const viewLabel = VIEW_LABELS[lastSegment] ?? "Tablero"
  const activeProject = projects.find((p) => p.id === projectId)

  return (
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
        {actions}
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
  )
}
