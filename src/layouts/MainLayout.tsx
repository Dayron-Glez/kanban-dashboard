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
    <SidebarProvider className="h-screen">
      <Sidebar>
        <SideBarContent />
      </Sidebar>

      <SidebarInset className="h-screen flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-auto flex items-center justify-center">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
