import { useContext } from "react"
import { Outlet, useLocation, useSearchParams } from "react-router"
import { ScrollArea, SearchContext, Skeleton } from "@/shared/index"
import { parseView, useKanban, VIEW_PARAM } from "@/features/board/index"
import noDataSvg from "@/assets/noData.svg"
import notFindByFilter from "@/assets/notFindByFilter.svg"

/**
 * Cuerpo de las vistas de proyecto. La barra superior y el sidebar viven en
 * AppLayout, que es quien monta el shell.
 */
export default function KanbanLayout() {
  const { scrollContainerRef, columns, tasks, loading } = useKanban()
  const searchValue = useContext(SearchContext)?.searchValue ?? ""
  const location = useLocation()
  const [searchParams] = useSearchParams()

  // Todo lo que no es el tablero scrollea con ScrollArea; el tablero maneja su
  // propia altura y no debe llevar scroll vertical. La tabla vive en la misma
  // ruta que el tablero pero sí es una pantalla que scrollea.
  const isBoardRoute = /\/projects\/[^/]+$/.test(location.pathname)
  const isTable = parseView(searchParams.get(VIEW_PARAM)) === "table"
  const isScrollablePage = !isBoardRoute || isTable

  const filteredTasks = tasks.filter((task) => {
    const searchTerm = searchValue.trim().toLowerCase()
    if (!task.content || !searchTerm) return true
    return task.content.toLowerCase().includes(searchTerm)
  })

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
    <div
      // Callback ref: el contexto tipa el contenedor como HTMLElement y aquí es
      // un div, así que asignamos en vez de pasar el RefObject directamente.
      ref={(el) => {
        scrollContainerRef.current = isScrollablePage ? null : el
      }}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      {isScrollablePage ? (
        <ScrollArea className="h-full">
          <Outlet />
        </ScrollArea>
      ) : (
        boardBody
      )}
    </div>
  )
}
