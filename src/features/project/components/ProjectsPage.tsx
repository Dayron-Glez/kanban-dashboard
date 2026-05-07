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
    <div className="flex h-full flex-col">
      <header className="bg-background flex items-center justify-between gap-4 border-b border-b-transparent px-6 py-4 shadow-md">
        <h1 className="text-primary text-xl font-semibold">Mis proyectos</h1>
        <Button onClick={() => setModalOpen(true)}>
          <IconPlus className="mr-2 h-4 w-4" />
          Nuevo proyecto
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-muted h-32 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-3">
            <p className="text-lg">No tienes proyectos todavía.</p>
            <Button variant="outline" onClick={() => setModalOpen(true)}>
              <IconPlus className="mr-2 h-4 w-4" />
              Crear primer proyecto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>

      <CreateProjectModal open={modalOpen} onOpenChange={setModalOpen} onSubmit={handleCreate} />
    </div>
  )
}
