import { useState } from "react"
import { Outlet } from "react-router"
import { Sidebar, SidebarInset, SidebarProvider } from "@/shared"
import { ProjectSidebarContent } from "@/features/project"

const SIDEBAR_COLLAPSED_KEY = "cauce.sidebar.collapsed"

const readCollapsed = (): boolean => {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"
  } catch {
    return false
  }
}

export default function AppLayout() {
  // El SidebarProvider delega por completo el estado cuando recibe
  // onOpenChange, así que lo controlamos aquí para poder persistirlo.
  const [open, setOpen] = useState<boolean>(() => !readCollapsed())

  const handleOpenChange = (next: boolean): void => {
    setOpen(next)
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!next))
    } catch {
      // Modo privado o storage bloqueado: el sidebar sigue funcionando sin persistir.
    }
  }

  return (
    <SidebarProvider
      open={open}
      onOpenChange={handleOpenChange}
      className="h-screen"
      style={
        { "--sidebar-width": "17rem", "--sidebar-width-icon": "3.5rem" } as React.CSSProperties
      }
    >
      <Sidebar collapsible="icon" overlay className="bg-card border-border border-r">
        <ProjectSidebarContent />
      </Sidebar>

      <SidebarInset className="flex h-screen flex-col overflow-hidden">
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
