import { IconChartBar, IconLayoutKanban, IconLogout, IconSettings } from "@tabler/icons-react"
import { Link, useLocation, useNavigate, useParams } from "react-router"
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/shared"
import { Button } from "@/shared"
import { supabase } from "@/shared/supabase"
import { useProjectsContext } from "../context/projectsCtx"

const PROJECT_VIEWS = [
  { label: "Tablero", icon: IconLayoutKanban, path: (id: string) => `/projects/${id}` },
  { label: "Analytics", icon: IconChartBar, path: (id: string) => `/projects/${id}/analytics` },
  { label: "Ajustes", icon: IconSettings, path: (id: string) => `/projects/${id}/settings` },
]

export function ProjectSidebarContent() {
  const { open } = useSidebar()
  const { projects } = useProjectsContext()
  const { id: activeId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  return (
    <>
      <SidebarContent className="bg-background py-4">
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

        <SidebarGroup>
          {open && <SidebarGroupLabel>Proyectos</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map((project) => {
                const isActive = activeId === project.id
                return (
                  <SidebarMenuItem key={project.id}>
                    <Link
                      to={`/projects/${project.id}`}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                        isActive
                          ? "bg-muted text-primary font-medium"
                          : "hover:bg-muted text-muted-foreground hover:text-primary"
                      } ${open ? "justify-start" : "justify-center"}`}
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      {open && <span className="truncate text-sm">{project.name}</span>}
                    </Link>

                    {isActive && open && (
                      <div className="mt-0.5 flex flex-col gap-0.5">
                        {PROJECT_VIEWS.map(({ label, icon: Icon, path }) => {
                          const href = path(project.id)
                          const isView = location.pathname === href
                          return (
                            <Link
                              key={label}
                              to={href}
                              className={`flex items-center gap-2 rounded-md py-1.5 pr-3 pl-8 text-sm transition-colors ${
                                isView
                                  ? "text-primary bg-primary/8 font-medium"
                                  : "text-muted-foreground hover:text-primary hover:bg-muted"
                              }`}
                            >
                              <Icon size={14} />
                              {label}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </SidebarMenuItem>
                )
              })}
              {projects.length === 0 && open && (
                <p className="text-muted-foreground px-3 text-xs">Sin proyectos aún</p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-background pb-4">
        <div className={`px-3 ${open ? "" : "flex justify-center"}`}>
          {open ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive w-full justify-start gap-2"
              onClick={handleLogout}
            >
              <IconLogout size={16} />
              Cerrar sesión
            </Button>
          ) : (
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Cerrar sesión"
            >
              <IconLogout size={20} />
            </button>
          )}
        </div>
      </SidebarFooter>
    </>
  )
}
