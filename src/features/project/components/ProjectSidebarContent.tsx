import { IconLayoutKanban, IconLogout } from "@tabler/icons-react"
import { Link, useNavigate, useParams } from "react-router"
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
import { useProjectsContext } from "../context/ProjectsContext"

export function ProjectSidebarContent() {
  const { open } = useSidebar()
  const { projects } = useProjectsContext()
  const { id: activeId } = useParams()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  return (
    <>
      <SidebarContent className="bg-background py-4">
        <SidebarGroup>
          <div className={`px-3 mb-2 ${open ? "" : "flex justify-center"}`}>
            {open ? (
              <Link
                to="/projects"
                className="flex items-center gap-2 font-bold text-primary text-lg hover:opacity-80 transition-opacity"
              >
                <IconLayoutKanban size={22} />
                <span>Kanban</span>
              </Link>
            ) : (
              <Link to="/projects" className="text-primary hover:opacity-80 transition-opacity">
                <IconLayoutKanban size={22} />
              </Link>
            )}
          </div>
        </SidebarGroup>

        <SidebarGroup>
          {open && <SidebarGroupLabel>Proyectos</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map((project) => (
                <SidebarMenuItem key={project.id}>
                  <Link
                    to={`/projects/${project.id}`}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      activeId === project.id
                        ? "bg-muted text-primary font-medium"
                        : "hover:bg-muted text-muted-foreground hover:text-primary"
                    } ${open ? "justify-start" : "justify-center"}`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    {open && (
                      <span className="truncate text-sm">{project.name}</span>
                    )}
                  </Link>
                </SidebarMenuItem>
              ))}
              {projects.length === 0 && open && (
                <p className="px-3 text-xs text-muted-foreground">
                  Sin proyectos aún
                </p>
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
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
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
