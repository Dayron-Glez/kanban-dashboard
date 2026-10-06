import { useEffect, useState, type ReactNode } from "react"
import { Command, Popover, PopoverContent, PopoverTrigger } from "@/shared"
import { useProjectsContext } from "../context/projectsCtx"
import { CreateProjectModal } from "./CreateProjectModal"
import { ProjectCommandList } from "./ProjectCommandList"

interface Props {
  /** Disparador del popover; se pasa a PopoverTrigger con asChild. */
  children: ReactNode
  side?: "top" | "right" | "bottom" | "left"
  align?: "start" | "center" | "end"
}

/**
 * Selector de proyecto anclado a su disparador, al estilo del breadcrumb de
 * Supabase. Es el único punto de cambio de proyecto: responde al click sobre
 * la miga y al atajo ⌘K desde cualquier parte del producto.
 */
export function ProjectCommandPopover({ children, side = "bottom", align = "start" }: Props) {
  const { projects, taskCounts, favoriteIds, createProject, toggleFavorite } = useProjectsContext()
  const [open, setOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  const handleCreateProject = async (values: Parameters<typeof createProject>[0]) => {
    await createProject(values)
    setCreateModalOpen(false)
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent side={side} align={align} sideOffset={8} className="w-72 p-0">
          <Command>
            <ProjectCommandList
              projects={projects}
              taskCounts={taskCounts}
              favoriteIds={favoriteIds}
              onToggleFavorite={toggleFavorite}
              onCreateProject={() => setCreateModalOpen(true)}
              onClose={() => setOpen(false)}
            />
          </Command>
        </PopoverContent>
      </Popover>

      <CreateProjectModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateProject}
      />
    </>
  )
}
