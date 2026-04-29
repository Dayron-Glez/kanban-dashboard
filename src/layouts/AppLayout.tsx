import { Outlet } from "react-router"
import { Sidebar, SidebarInset, SidebarProvider } from "@/shared"
import { ProjectSidebarContent, ProjectsProvider } from "@/features/project"

export default function AppLayout() {
  return (
    <ProjectsProvider>
      <SidebarProvider defaultOpen={true} className="h-screen">
        <Sidebar
          collapsible="icon"
          className="min-w-16 border-r-transparent shadow-md bg-background"
        >
          <ProjectSidebarContent />
        </Sidebar>

        <SidebarInset className="h-screen flex flex-col overflow-hidden">
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </ProjectsProvider>
  )
}
