import { useEffect, useState } from "react"
import { CommandDialog } from "@/shared"
import { useProjectsContext } from "../context/projectsCtx"
import { CreateProjectModal } from "./CreateProjectModal"
import { ProjectCommandList } from "./ProjectCommandList"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Selector de proyectos global (§5.5). A diferencia del popover del sidebar,
 * responde a ⌘K desde cualquier página del producto y con el sidebar en
 * cualquier estado.
 */
export function ProjectCommandDialog({ open, onOpenChange }: Props) {
  const { projects, taskCounts, favoriteIds, createProject, toggleFavorite } = useProjectsContext()
  const [createModalOpen, setCreateModalOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onOpenChange])

  const handleCreateProject = async (values: Parameters<typeof createProject>[0]) => {
    await createProject(values)
    setCreateModalOpen(false)
  }

  return (
    <>
      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Buscar proyecto"
        description="Busca y abre uno de tus proyectos"
        className="p-0 sm:max-w-lg"
      >
        <ProjectCommandList
          projects={projects}
          taskCounts={taskCounts}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
          onCreateProject={() => setCreateModalOpen(true)}
          onClose={() => onOpenChange(false)}
        />
      </CommandDialog>

      <CreateProjectModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={handleCreateProject}
      />
    </>
  )
}
