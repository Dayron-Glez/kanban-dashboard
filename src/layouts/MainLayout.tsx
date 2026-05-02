import { useState } from "react"
import { Outlet, useLocation, useParams } from "react-router"
import {
  Header,
  ScrollArea,
  SearchContext,
  Skeleton,
  useSidebar,
} from "@/shared/index"
import { KanbanProvider, useKanban } from "@/features/board/index"
import { useProjectsContext } from "@/features/project"
import noDataSvg from "@/assets/noData.svg"
import notFindByFilter from "@/assets/notFindByFilter.svg"

function KanbanContent() {
  const { state } = useSidebar()
  const { scrollContainerRef, columns, tasks, loading } = useKanban()
  const [searchValue, setSearchValue] = useState<string>("")
  const { id } = useParams()
  const { projects } = useProjectsContext()
  const location = useLocation()
  const isScrollablePage =
    location.pathname.endsWith("/analytics") || location.pathname.endsWith("/settings")
  const projectName = projects.find((p) => p.id === id)?.name

  const filteredTasks = tasks.filter((task) => {
    const searchTerm = searchValue.trim().toLowerCase()
    if (!task.content || !searchTerm) return true
    return task.content.toLowerCase().includes(searchTerm)
  })

  return (
    <>
      <Header
        projectName={projectName}
        {...(!isScrollablePage && { searchValue, onSearchChange: setSearchValue })}
      />
      <main
        ref={!isScrollablePage ? scrollContainerRef : undefined}
        className={
          isScrollablePage
            ? `flex-1 overflow-hidden bg-muted ${state === "collapsed" ? "pl-4" : ""}`
            : `flex-1 overflow-hidden flex bg-muted ${state === "collapsed" ? "pl-4" : ""}`
        }
      >
        {isScrollablePage ? (
          <ScrollArea className="h-full">
            <Outlet />
          </ScrollArea>
        ) : loading ? (
          <div className="flex gap-4 h-full p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="flex-1 max-h-[calc(100vh-96px)] rounded-[14px] shrink-0" />
            ))}
          </div>
        ) : columns.length > 0 ? (
          <SearchContext.Provider value={{ searchValue, setSearchValue }}>
            {filteredTasks.length === 0 && searchValue.trim().length > 0 ? (
              <div className="flex flex-col items-center justify-center w-full h-full">
                <img src={notFindByFilter} alt="Sin resultados" className="size-[500px]" />
                <p className="text-primary text-lg font-semibold">
                  No hay tareas que coincidan con el filtro de búsqueda aplicado. Por favor, intente
                  con otro término de búsqueda o elimine el filtro.
                </p>
              </div>
            ) : (
              <Outlet />
            )}
          </SearchContext.Provider>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <img src={noDataSvg} alt="No data" className="size-64 mb-4" />
            <p className="text-primary text-lg">
              No hay columnas creadas. Pulse en el botón{" "}
              <span className="font-bold">Agregar Columna</span> para crear una nueva columna
            </p>
          </div>
        )}
      </main>
    </>
  )
}

export default function KanbanLayout() {
  return (
    <KanbanProvider>
      <KanbanContent />
    </KanbanProvider>
  )
}
