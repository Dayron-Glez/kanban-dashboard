import { useEffect, useState } from "react"
import {
  IconArchive,
  IconChartBar,
  IconLayoutKanban,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"
import { Link, useLocation, useParams } from "react-router"
import {
  Separator,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useSidebar,
} from "@/shared"
import { useProjectsContext } from "../context/projectsCtx"
import { CreateProjectModal } from "./CreateProjectModal"
import { ProjectCommandPopover } from "./ProjectCommandPopover"
import { SidebarProjectCard } from "./SidebarProjectCard"
import { SidebarUserFooter } from "./SidebarUserFooter"

const NAV_ITEMS = [
  {
    label: "Tablero",
    icon: IconLayoutKanban,
    path: (id: string) => `/projects/${id}`,
  },
  {
    label: "Analytics",
    icon: IconChartBar,
    path: (id: string) => `/projects/${id}/analytics`,
  },
  {
    label: "Miembros",
    icon: IconUsers,
    path: (id: string) => `/projects/${id}/members`,
  },
  {
    label: "Archivo",
    icon: IconArchive,
    path: (id: string) => `/projects/${id}/archive`,
  },
  {
    label: "Ajustes",
    icon: IconSettings,
    path: (id: string) => `/projects/${id}/settings`,
  },
]

export function ProjectSidebarContent() {
  const { open } = useSidebar()
  const { projects, taskCounts, createProject } = useProjectsContext()
  const { id: activeId } = useParams()
  const location = useLocation()
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)

  const activeProject = projects.find((p) => p.id === activeId)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        if (activeProject && open) setCommandOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [activeProject, open])

  const handleCreateProject = async (values: Parameters<typeof createProject>[0]) => {
    await createProject(values)
    setCreateModalOpen(false)
  }

  return (
    <TooltipProvider delayDuration={0}>
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

          <Separator />

          {/* Proyecto activo — expandido: card con popover / colapsado: avatar cuadrado */}
          {activeProject && (
            <>
              <SidebarGroup>
                {open && <SidebarGroupLabel>Proyecto</SidebarGroupLabel>}
                <SidebarGroupContent>
                  {open ? (
                    <ProjectCommandPopover
                      open={commandOpen}
                      onOpenChange={setCommandOpen}
                      projects={projects}
                      taskCounts={taskCounts}
                      onCreateProject={() => setCreateModalOpen(true)}
                    >
                      <SidebarProjectCard
                        project={activeProject}
                        taskCount={taskCounts[activeProject.id] ?? 0}
                      />
                    </ProjectCommandPopover>
                  ) : (
                    <div className="flex justify-center py-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="flex h-9 w-9 cursor-default items-center justify-center rounded-lg border-2 border-white/20 text-sm font-bold text-white shadow-sm"
                            style={{ backgroundColor: activeProject.color }}
                          >
                            {activeProject.name.charAt(0).toUpperCase()}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="right">{activeProject.name}</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </SidebarGroupContent>
              </SidebarGroup>

              <Separator />
            </>
          )}

          {/* Navegación del proyecto */}
          {activeId && (
            <SidebarGroup>
              {open && <SidebarGroupLabel>Navegación</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
                    const href = path(activeId)
                    const isActive = location.pathname === href
                    return (
                      <SidebarMenuItem key={label}>
                        {open ? (
                          <Link
                            to={href}
                            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                              isActive
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-muted hover:text-primary"
                            }`}
                          >
                            <Icon size={16} />
                            <span className="flex-1">{label}</span>
                            {isActive && (
                              <span className="bg-primary h-1.5 w-1.5 shrink-0 rounded-full" />
                            )}
                          </Link>
                        ) : (
                          <div className="flex justify-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link
                                  to={href}
                                  className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                                    isActive
                                      ? "bg-primary/10 text-primary"
                                      : "text-muted-foreground hover:bg-muted hover:text-primary"
                                  }`}
                                >
                                  <Icon size={18} />
                                </Link>
                              </TooltipTrigger>
                              <TooltipContent side="right">{label}</TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <Separator />
        <SidebarUserFooter />

        <CreateProjectModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSubmit={handleCreateProject}
        />
      </>
    </TooltipProvider>
  )
}
