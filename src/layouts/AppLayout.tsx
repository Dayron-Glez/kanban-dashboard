import { Outlet } from "react-router"
import { Sidebar, SidebarInset, SidebarProvider } from "@/shared"
import { ProjectSidebarContent, ProjectsProvider } from "@/features/project"

export default function AppLayout() {
  return (
    <ProjectsProvider>
      <SidebarProvider
        defaultOpen={true}
        className="h-screen"
        style={{ "--sidebar-width": "17rem" } as React.CSSProperties}
      >
        <Sidebar
          collapsible="icon"
          className="bg-background min-w-16 border-r-transparent shadow-md"
        >
          <ProjectSidebarContent />
        </Sidebar>

        <SidebarInset className="flex h-screen flex-col overflow-hidden">
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </ProjectsProvider>
  )
}
