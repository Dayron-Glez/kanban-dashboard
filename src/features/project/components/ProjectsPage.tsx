import { useState } from "react"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/shared"
import { useProjectsContext } from "../context/projectsCtx"
import { ProjectCard } from "./ProjectCard"
import { CreateProjectModal } from "./CreateProjectModal"
import type { ProjectFormValues } from "../schemas/project.schema"

export function ProjectsPage() {
  const { projects, loading, createProject } = useProjectsContext()
  const [modalOpen, setModalOpen] = useState(false)

  const handleCreate = async (values: ProjectFormValues) => {
    await createProject(values)
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-foreground text-xl font-bold">Proyectos</h1>
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <IconPlus className="mr-1 h-4 w-4" />
            Nuevo proyecto
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-muted h-32 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="border-border text-muted-foreground flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16">
            <p className="text-sm">No tienes proyectos todavía.</p>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
              <IconPlus className="mr-1 h-4 w-4" />
              Crear primer proyecto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      <CreateProjectModal open={modalOpen} onOpenChange={setModalOpen} onSubmit={handleCreate} />
    </div>
  )
}
