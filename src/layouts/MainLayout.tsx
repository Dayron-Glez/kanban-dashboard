import { useState } from "react";
import { Outlet } from "react-router";
import {
  Header,
  SearchContext,
  Sidebar,
  SideBarContent,
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/shared/index";
import { KanbanProvider, useKanban } from "@/features/board/index";
import noDataSvg from "@/assets/noData.svg";
import notFindByFilter from "@/assets/notFindByFilter.svg";

function MainContent() {
  const { state } = useSidebar();
  const { scrollContainerRef, columns, tasks } = useKanban();
  const [searchValue, setSearchValue] = useState<string>("");

  const filteredTasks = tasks.filter((task) => {
    const searchTerm = searchValue.trim().toLowerCase();
    if (!task.content || !searchTerm) return true;
    return task.content.toLowerCase().includes(searchTerm);
  });

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
            {filteredTasks.length === 0 && searchValue.trim().length > 0 ? (
              // Blank state cuando no hay coincidencias
              <div className="flex flex-col items-center justify-center w-full h-full">
                <img
                  src={notFindByFilter}
                  alt="Sin resultados"
                  className="size-[500px]"
                />
                <p className="text-primary text-lg font-semibold">
                  No hay tareas que coincidan con el filtro de búsqueda
                  aplicado. Por favor, intente con otro término de búsqueda o
                  elimine el filtro.
                </p>
              </div>
            ) : (
              <Outlet />
            )}
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
