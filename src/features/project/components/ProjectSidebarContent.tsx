import { useState } from "react"
import { IconLayoutKanban } from "@tabler/icons-react"
import { Link, useParams } from "react-router"
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/shared"
import { useProjectsContext } from "../context/projectsCtx"
import { CreateProjectModal } from "./CreateProjectModal"
import { SidebarProjectCard } from "./SidebarProjectCard"
import { SidebarProjectList } from "./SidebarProjectList"
import { SidebarUserFooter } from "./SidebarUserFooter"

export function ProjectSidebarContent() {
  const { open } = useSidebar()
  const { projects, taskCounts, createProject } = useProjectsContext()
  const { id: activeId } = useParams()
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const activeProject = projects.find((p) => p.id === activeId)

  return (
    <>
      <SidebarContent className="bg-background py-4">
        {/* Logo */}
        <SidebarGroup>
          <div className={`mb-2 px-3 ${open ? "" : "flex justify-center"}`}>
            {open ? (
              <Link
                to="/projects"
                className="text-primary flex items-center gap-2 text-lg font-bold transition-opacity hover:opacity-80"
              >
                <IconLayoutKanban size={22} />
                <span>Kanban</span>
              </Link>
            ) : (
              <Link to="/projects" className="text-primary transition-opacity hover:opacity-80">
                <IconLayoutKanban size={22} />
              </Link>
            )}
          </div>
        </SidebarGroup>

        {/* Proyecto activo */}
        {open && activeProject && (
          <SidebarGroup>
            <SidebarGroupLabel>Proyecto</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarProjectCard
                project={activeProject}
                taskCount={taskCounts[activeProject.id] ?? 0}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Dot colapsado del proyecto activo */}
        {!open && activeProject && (
          <div className="flex justify-center px-3 py-1">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: activeProject.color }}
            />
          </div>
        )}

        {/* Lista de proyectos (solo expandido) */}
        {open && (
          <SidebarProjectList
            projects={projects}
            taskCounts={taskCounts}
            activeProjectId={activeId}
            onCreateProject={() => setCreateModalOpen(true)}
          />
        )}
      </SidebarContent>

      <SidebarUserFooter />

      <CreateProjectModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSubmit={async (values) => {
          await createProject(values)
          setCreateModalOpen(false)
        }}
      />
    </>
  )
}
