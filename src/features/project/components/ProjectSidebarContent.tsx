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
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useSidebar,
} from "@/shared"
import { useProjectsContext } from "../context/projectsCtx"
import { CauceLogo } from "@/shared/components/brand/CauceLogo"
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
  const { projects, taskCounts, favoriteIds, createProject, toggleFavorite } = useProjectsContext()
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
        <SidebarContent className="bg-background py-0">
          {/* Brand */}
          <SidebarGroup className="border-border border-b">
            <div className={`flex h-[54px] items-center ${open ? "px-3" : "justify-center"}`}>
              <Link
                to="/projects"
                className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
              >
                <CauceLogo size={28} showWordmark={open} />
              </Link>
            </div>
          </SidebarGroup>

          {/* Proyecto activo — expandido: card con popover / colapsado: avatar cuadrado */}
          {activeProject && (
            <>
              <SidebarGroup className="border-border border-b">
                {open && (
                  <div className="text-muted-foreground mb-1.5 px-2 text-[9.5px] font-bold tracking-[0.08em] uppercase">
                    Proyecto
                  </div>
                )}
                <SidebarGroupContent className="px-1 pb-2">
                  {open ? (
                    <ProjectCommandPopover
                      open={commandOpen}
                      onOpenChange={setCommandOpen}
                      projects={projects}
                      taskCounts={taskCounts}
                      favoriteIds={favoriteIds}
                      onToggleFavorite={toggleFavorite}
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
            </>
          )}

          {/* Navegación del proyecto */}
          {activeId && (
            <SidebarGroup>
              {open && (
                <div className="text-muted-foreground mb-1.5 px-2 text-[9.5px] font-bold tracking-[0.08em] uppercase">
                  Navegación
                </div>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-px">
                  {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
                    const href = path(activeId)
                    const isActive = location.pathname === href
                    return (
                      <SidebarMenuItem key={label}>
                        {open ? (
                          <Link
                            to={href}
                            className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12.5px] transition-colors ${
                              isActive
                                ? "bg-accent text-accent-foreground font-bold"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            }`}
                          >
                            <Icon size={16} className="shrink-0" />
                            <span className="flex-1">{label}</span>
                          </Link>
                        ) : (
                          <div className="flex justify-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Link
                                  to={href}
                                  className={`relative flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                                    isActive
                                      ? "bg-accent text-accent-foreground"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                  }`}
                                >
                                  <Icon size={17} />
                                  {isActive && (
                                    <span className="bg-primary absolute top-2 bottom-2 left-0 w-0.5 rounded-r-sm" />
                                  )}
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
