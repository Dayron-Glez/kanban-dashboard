// Layout.tsx
import Header from "@/components/Header";
import SideBarContent from "@/components/SideBar/SideBarContent";
import { Outlet } from "react-router";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { KanbanProvider, useKanban } from "@/context/KanbanContext";

function MainContent() {
  const { state } = useSidebar();
  const { scrollContainerRef } = useKanban();

  return (
    <>
      <Header />
      <main
        ref={scrollContainerRef}
        className={`flex-1 overflow-x-auto overflow-y-hidden flex items-center bg-muted ${
          state === "collapsed" ? "pl-4" : ""
        }`}
      >
        <Outlet />
      </main>
    </>
  );
}

export default function Layout() {
  return (
    <KanbanProvider>
      <SidebarProvider defaultOpen={true} className="h-screen">
        <Sidebar
          collapsible="icon"
          className="min-w-16 border-r-transparent shadow-md bg-background"
        >
          <SideBarContent />
        </Sidebar>

        <SidebarInset className="h-screen flex flex-col overflow-hidden">
          <MainContent />
        </SidebarInset>
      </SidebarProvider>
    </KanbanProvider>
  );
}
