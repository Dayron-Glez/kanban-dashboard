import { useSearchParams } from "react-router"
import KanbanBoard from "./KanbanBoard"
import { TaskTable } from "./TaskTable"
import { parseView, VIEW_PARAM } from "../lib/taskTable"

/**
 * Punto de entrada de /projects/:id. Tablero y tabla son dos lecturas de las
 * mismas tareas, así que comparten ruta y se eligen con ?view=table.
 */
export default function ProjectTasksView() {
  const [searchParams] = useSearchParams()
  return parseView(searchParams.get(VIEW_PARAM)) === "table" ? <TaskTable /> : <KanbanBoard />
}
