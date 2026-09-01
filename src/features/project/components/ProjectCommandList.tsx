import { IconPlus, IconStar } from "@tabler/icons-react"
import { useNavigate, Link } from "react-router"
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/shared"
import type { Project } from "@/shared/supabase"

interface Props {
  projects: Project[]
  taskCounts: Record<string, number>
  favoriteIds: Record<string, boolean>
  onToggleFavorite: (projectId: string) => void
  onCreateProject: () => void
  /** Cerrar el contenedor (popover o diálogo) que envuelve esta lista. */
  onClose: () => void
}

/**
 * Contenido del selector de proyectos, sin el `<Command>` que lo envuelve.
 * Lo comparten el popover del sidebar y el diálogo global de ⌘K.
 */
export function ProjectCommandList({
  projects,
  taskCounts,
  favoriteIds,
  onToggleFavorite,
  onCreateProject,
  onClose,
}: Props) {
  const navigate = useNavigate()

  const favorites = projects.filter((p) => favoriteIds[p.id])

  const handleSelect = (projectId: string): void => {
    navigate(`/projects/${projectId}`)
    onClose()
  }

  const handleCreate = (): void => {
    onClose()
    onCreateProject()
  }

  const shortcutBadge = (
    <kbd className="border-border bg-muted text-muted-foreground pointer-events-none flex shrink-0 items-center gap-0.5 rounded border px-1.5 py-0.5 font-mono text-[10px]">
      <span>⌘</span>
      <span>K</span>
    </kbd>
  )

  const favoritosHeading = (
    <span className="flex items-center gap-1">
      <IconStar size={11} className="fill-amber-400 text-amber-400" />
      Favoritos
    </span>
  )

  const ProjectRow = ({ project }: { project: Project }) => {
    const isFav = favoriteIds[project.id] ?? false
    return (
      <CommandItem
        value={project.name}
        onSelect={() => handleSelect(project.id)}
        className="group cursor-pointer"
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: project.color }}
        />
        <span className="flex-1 truncate">{project.name}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite(project.id)
          }}
          className={`ml-1 shrink-0 transition-opacity ${
            isFav ? "opacity-100" : "opacity-0 group-hover:opacity-60 hover:opacity-100!"
          }`}
          title={isFav ? "Quitar de favoritos" : "Añadir a favoritos"}
        >
          <IconStar
            size={13}
            className={isFav ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}
          />
        </button>
        <span className="text-muted-foreground ml-1 shrink-0 text-xs tabular-nums">
          {taskCounts[project.id] ?? 0}
        </span>
      </CommandItem>
    )
  }

  return (
    <>
      <CommandInput
        placeholder="Buscar proyecto..."
        wrapperClassName="h-11"
        suffix={shortcutBadge}
      />
      <CommandList className="max-h-80">
        <CommandEmpty>Sin resultados.</CommandEmpty>

        <CommandGroup heading={favoritosHeading}>
          {favorites.length > 0 ? (
            favorites.map((project) => <ProjectRow key={project.id} project={project} />)
          ) : (
            <p className="text-muted-foreground px-2 py-1 text-xs">Sin favoritos aún</p>
          )}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Todos los proyectos">
          {projects.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </CommandGroup>
      </CommandList>

      <div className="flex items-center justify-between border-t px-3 py-2">
        <button
          onClick={handleCreate}
          className="text-muted-foreground hover:text-primary flex items-center gap-1 text-xs transition-colors"
        >
          <IconPlus size={12} />
          Nuevo
        </button>
        <Link
          to="/projects"
          onClick={onClose}
          className="text-muted-foreground hover:text-primary text-xs transition-colors"
        >
          Ver todos →
        </Link>
      </div>
    </>
  )
}
