import { type ReactNode } from "react"
import { Command, Popover, PopoverContent, PopoverTrigger } from "@/shared"
import type { Project } from "@/shared/supabase"
import { ProjectCommandList } from "./ProjectCommandList"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: Project[]
  taskCounts: Record<string, number>
  favoriteIds: Record<string, boolean>
  onToggleFavorite: (projectId: string) => void
  onCreateProject: () => void
  children: ReactNode
}

export function ProjectCommandPopover({
  open,
  onOpenChange,
  projects,
  taskCounts,
  favoriteIds,
  onToggleFavorite,
  onCreateProject,
  children,
}: Props) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="right" align="start" sideOffset={8} className="w-72 p-0">
        <Command>
          <ProjectCommandList
            projects={projects}
            taskCounts={taskCounts}
            favoriteIds={favoriteIds}
            onToggleFavorite={onToggleFavorite}
            onCreateProject={onCreateProject}
            onClose={() => onOpenChange(false)}
          />
        </Command>
      </PopoverContent>
    </Popover>
  )
}
