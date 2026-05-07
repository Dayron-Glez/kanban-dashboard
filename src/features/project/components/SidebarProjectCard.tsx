import { IconChevronRight } from "@tabler/icons-react"
import { Link } from "react-router"
import type { Project } from "@/shared/supabase"

interface Props {
  project: Project
  taskCount: number
}

export function SidebarProjectCard({ project, taskCount }: Props) {
  const initial = project.name.charAt(0).toUpperCase()
  const label = taskCount === 1 ? "1 tarea" : `${taskCount} tareas`

  return (
    <Link
      to={`/projects/${project.id}`}
      className="hover:bg-muted flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: project.color }}
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-sm font-semibold">{project.name}</p>
        <p className="text-muted-foreground text-xs">{label}</p>
      </div>
      <IconChevronRight size={14} className="text-muted-foreground shrink-0" />
    </Link>
  )
}
