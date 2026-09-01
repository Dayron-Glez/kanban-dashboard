import * as React from "react"
import { IconChevronDown } from "@tabler/icons-react"
import type { Project } from "@/shared/supabase"

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  project: Project
  taskCount?: number
}

export const SidebarProjectCard = React.forwardRef<HTMLButtonElement, Props>(
  ({ project, className, ...props }, ref) => {
    const initial = project.name.charAt(0).toUpperCase()

    return (
      <button
        ref={ref}
        className={`bg-muted hover:bg-accent border-border flex w-full items-center gap-2.5 rounded-md border px-2 py-1.5 text-left transition-colors ${className ?? ""}`}
        {...props}
      >
        <span
          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md text-[11px] font-extrabold text-white"
          style={{ backgroundColor: project.color }}
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-[12.5px] font-bold">{project.name}</p>
        </div>
        <IconChevronDown size={12} className="text-muted-foreground shrink-0" />
      </button>
    )
  }
)
SidebarProjectCard.displayName = "SidebarProjectCard"
