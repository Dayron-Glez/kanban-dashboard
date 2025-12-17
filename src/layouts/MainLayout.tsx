import Header from "@/components/Header";
import SideBarContent from "@/components/SideBar/SideBarContent";
import { Outlet } from "react-router";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export default function Layout() {
  return (
    <SidebarProvider defaultOpen={true} className="h-screen">
      <Sidebar
        collapsible="icon"
        className=" min-w-16 border-r-transparent shadow-md bg-background"
      >
        <SideBarContent />
      </Sidebar>

      <SidebarInset className="h-screen flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-auto flex items-center justify-center p-4 bg-muted">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
