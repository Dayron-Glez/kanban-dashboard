import { useState } from "react"
import { IconPlus } from "@tabler/icons-react"
import { SidebarTrigger } from "@/shared"
import { Button } from "@/shared"
import { useProjects } from "../hooks/useProjects"
import { ProjectCard } from "./ProjectCard"
import { CreateProjectModal } from "./CreateProjectModal"
import type { ProjectFormValues } from "../schemas/project.schema"

export function ProjectsPage() {
  const { projects, loading, createProject } = useProjects()
  const [modalOpen, setModalOpen] = useState(false)

  const handleCreate = async (values: ProjectFormValues) => {
    await createProject(values)
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between gap-4 border-b px-6 py-4 bg-background shadow-md border-b-transparent">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="text-primary" />
          <h1 className="text-xl font-semibold text-primary">Mis proyectos</h1>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <IconPlus className="h-4 w-4 mr-2" />
          Nuevo proyecto
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <p className="text-lg">No tienes proyectos todavía.</p>
            <Button variant="outline" onClick={() => setModalOpen(true)}>
              <IconPlus className="h-4 w-4 mr-2" />
              Crear primer proyecto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>

      <CreateProjectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSubmit={handleCreate}
      />
    </div>
  )
}
