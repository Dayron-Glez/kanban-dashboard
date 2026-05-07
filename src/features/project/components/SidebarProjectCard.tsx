import * as React from "react"
import { IconChevronDown } from "@tabler/icons-react"
import type { Project } from "@/shared/supabase"

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  project: Project
  taskCount: number
}

export const SidebarProjectCard = React.forwardRef<HTMLButtonElement, Props>(
  ({ project, taskCount, className, ...props }, ref) => {
    const initial = project.name.charAt(0).toUpperCase()
    const label = taskCount === 1 ? "1 tarea" : `${taskCount} tareas`

    return (
      <button
        ref={ref}
        className={`hover:bg-muted flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${className ?? ""}`}
        {...props}
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-white/20 text-sm font-bold text-white shadow-sm"
          style={{ backgroundColor: project.color }}
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-semibold">{project.name}</p>
          <p className="text-muted-foreground text-xs">{label}</p>
        </div>
        <IconChevronDown size={14} className="text-muted-foreground shrink-0" />
      </button>
    )
  }
)
SidebarProjectCard.displayName = "SidebarProjectCard"
