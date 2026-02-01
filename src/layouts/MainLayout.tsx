import { createContext, useState } from "react";
import { Outlet } from "react-router";
import Header from "@/components/Header";
import SideBarContent from "@/components/SideBar/SideBarContent";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { KanbanProvider, useKanban } from "@/context/KanbanContext";
import noDataSvg from "@/assets/noData.svg";

export const SearchContext = createContext<{
  searchValue: string;
  setSearchValue: (value: string) => void;
} | null>(null);

function MainContent() {
  const { state } = useSidebar();
  const { scrollContainerRef, columns } = useKanban();
  const [searchValue, setSearchValue] = useState<string>("");

  return (
    <>
      <Header searchValue={searchValue} onSearchChange={setSearchValue} />
      <main
        ref={scrollContainerRef}
        className={`flex-1 overflow-x-auto overflow-y-hidden flex items-center bg-muted ${
          state === "collapsed" ? "pl-4" : ""
        } ${columns && columns.length === 0 ? "justify-center" : ""}`}
      >
        {columns && columns.length > 0 ? (
          <SearchContext.Provider value={{ searchValue, setSearchValue }}>
            <Outlet />
          </SearchContext.Provider>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <img src={noDataSvg} alt="No data" className="size-64 mb-4" />
            <p className="text-primary text-lg">
              No hay columnas creadas. Pulse en el botón{" "}
              <span className="font-bold">Agregar Columna</span> para crear una
              nueva columna
            </p>
          </div>
        )}
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
