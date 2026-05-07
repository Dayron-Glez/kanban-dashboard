import { type ReactNode } from "react"
import { IconPlus, IconStar } from "@tabler/icons-react"
import { useNavigate, Link } from "react-router"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared"
import type { Project } from "@/shared/supabase"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: Project[]
  taskCounts: Record<string, number>
  onCreateProject: () => void
  children: ReactNode
}

export function ProjectCommandPopover({
  open,
  onOpenChange,
  projects,
  taskCounts,
  onCreateProject,
  children,
}: Props) {
  const navigate = useNavigate()

  const handleSelect = (projectId: string): void => {
    navigate(`/projects/${projectId}`)
    onOpenChange(false)
  }

  const handleCreate = (): void => {
    onOpenChange(false)
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

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="right" align="start" sideOffset={8} className="w-72 p-0">
        <Command>
          <CommandInput
            placeholder="Buscar proyecto..."
            wrapperClassName="h-11"
            suffix={shortcutBadge}
          />
          <CommandList className="max-h-80">
            <CommandEmpty>Sin resultados.</CommandEmpty>

            <CommandGroup heading={favoritosHeading}>
              <p className="text-muted-foreground px-2 py-1 text-xs">Sin favoritos aún</p>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Todos los proyectos">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.name}
                  onSelect={() => handleSelect(project.id)}
                  className="cursor-pointer"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="flex-1 truncate">{project.name}</span>
                  <span className="text-muted-foreground ml-auto shrink-0 text-xs tabular-nums">
                    {taskCounts[project.id] ?? 0}
                  </span>
                </CommandItem>
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
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-primary text-xs transition-colors"
            >
              Ver todos →
            </Link>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
