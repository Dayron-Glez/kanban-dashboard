import { useState } from "react"
import { Outlet, useLocation, useParams } from "react-router"
import { Header, ScrollArea, SearchContext, Skeleton, useSidebar } from "@/shared/index"
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

  const mainClass = isScrollablePage
    ? `bg-background flex-1 overflow-hidden ${state === "collapsed" ? "pl-4" : ""}`
    : `bg-background flex flex-1 flex-col overflow-hidden ${state === "collapsed" ? "pl-4" : ""}`

  const boardBody = loading ? (
    <div className="flex min-h-0 flex-1 gap-3 p-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="min-w-[220px] flex-1 basis-0 rounded-[14px]" />
      ))}
    </div>
  ) : columns.length === 0 ? (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
      <img src={noDataSvg} alt="No data" className="mb-4 size-64" />
      <p className="text-primary text-lg">
        No hay columnas creadas. Pulse en el botón{" "}
        <span className="font-bold">Agregar Columna</span> para crear una nueva columna
      </p>
    </div>
  ) : filteredTasks.length === 0 && searchValue.trim().length > 0 ? (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
      <img src={notFindByFilter} alt="Sin resultados" className="size-[500px]" />
      <p className="text-primary text-lg font-semibold">
        No hay tareas que coincidan con el filtro de búsqueda aplicado. Por favor, intente con otro
        término de búsqueda o elimine el filtro.
      </p>
    </div>
  ) : (
    <Outlet />
  )

  return (
    <>
      <Header
        projectName={projectName}
        {...(!isScrollablePage && { searchValue, onSearchChange: setSearchValue })}
      />
      <main ref={!isScrollablePage ? scrollContainerRef : undefined} className={mainClass}>
        {isScrollablePage ? (
          <ScrollArea className="h-full">
            <Outlet />
          </ScrollArea>
        ) : (
          <SearchContext.Provider value={{ searchValue, setSearchValue }}>
            {boardBody}
          </SearchContext.Provider>
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
