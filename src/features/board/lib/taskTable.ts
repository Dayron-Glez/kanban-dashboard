import {
  TASK_SIZES,
  type ColumnType,
  type Task,
  type TaskPriority,
  type TaskSize,
} from "../types/board.types"

/** Vista activa del proyecto. Viaja en la URL para poder compartir el enlace. */
export type ProjectView = "board" | "table"

export const VIEW_PARAM = "view"

/** Cualquier valor que no sea "table" cae al tablero, que es la vista por defecto. */
export const parseView = (value: string | null | undefined): ProjectView =>
  value === "table" ? "table" : "board"

/** Columnas por las que se puede ordenar la tabla. */
export type SortKey = "content" | "column" | "priority" | "size" | "assignee" | "dueDate"
export type SortDirection = "asc" | "desc"

/** Una fila ya resuelta: sin ids que el usuario no ve ni datos que no se pintan. */
export interface TaskRow {
  id: string
  content: string
  columnId: string
  columnTitle: string
  columnPosition: number
  priority: TaskPriority
  size: TaskSize
  assignee: string | null
  dueDate: string | null
}

const PRIORITY_RANK: Record<TaskPriority, number> = { p0: 0, p1: 1, p2: 2 }
const SIZE_RANK: Record<TaskSize, number> = Object.fromEntries(
  TASK_SIZES.map((size, i) => [size, i])
) as Record<TaskSize, number>

/** Nombre visible de quien tiene asignada la tarea, o null si no hay nadie. */
const assigneeOf = (task: Task): string | null =>
  task.assigneeProfile?.full_name?.trim() || task.assigneeProfile?.email || null

export function buildRows(tasks: Task[], columns: ColumnType[]): TaskRow[] {
  const byId = new Map(columns.map((column) => [column.id, column]))
  return tasks.map((task) => {
    const column = byId.get(task.columnId)
    return {
      id: task.id,
      content: task.content,
      columnId: task.columnId,
      columnTitle: column?.title ?? "",
      columnPosition: column?.position ?? Number.MAX_SAFE_INTEGER,
      priority: task.priority,
      size: task.size,
      assignee: assigneeOf(task),
      dueDate: task.due_date,
    }
  })
}

/** Comparadores por columna. Todos devuelven el orden ascendente. */
const COMPARATORS: Record<SortKey, (a: TaskRow, b: TaskRow) => number> = {
  content: (a, b) => a.content.localeCompare(b.content, "es"),
  // Por el orden real de las columnas en el tablero, no alfabético: "En curso"
  // antes que "Hecho" significa algo; ordenarlas por letra, no.
  column: (a, b) => a.columnPosition - b.columnPosition,
  priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  size: (a, b) => SIZE_RANK[a.size] - SIZE_RANK[b.size],
  assignee: (a, b) => (a.assignee ?? "").localeCompare(b.assignee ?? "", "es"),
  dueDate: (a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""),
}

/** Campos donde la ausencia de valor va siempre al final, se ordene como se ordene. */
const EMPTY_LAST: Partial<Record<SortKey, (row: TaskRow) => boolean>> = {
  dueDate: (row) => !row.dueDate,
  assignee: (row) => !row.assignee,
}

/**
 * Ordena las filas. Lo que no tiene valor —sin fecha, sin asignar— queda
 * siempre al final aunque se invierta el sentido: al invertir se busca «las
 * más lejanas primero», no «las que no tienen nada primero».
 *
 * El sort de JS es estable, así que dentro de un empate se conserva el orden
 * de entrada, que es el del tablero.
 */
export function sortRows(rows: TaskRow[], key: SortKey, direction: SortDirection): TaskRow[] {
  const compare = COMPARATORS[key]
  const isEmpty = EMPTY_LAST[key]
  const sign = direction === "asc" ? 1 : -1

  return [...rows].sort((a, b) => {
    if (isEmpty) {
      const emptyA = isEmpty(a)
      const emptyB = isEmpty(b)
      if (emptyA !== emptyB) return emptyA ? 1 : -1
      if (emptyA) return 0
    }
    return compare(a, b) * sign
  })
}

/** Filtra por contenido, igual que el buscador del navbar sobre el tablero. */
export function filterRows(rows: TaskRow[], search: string): TaskRow[] {
  const term = search.trim().toLowerCase()
  if (!term) return rows
  return rows.filter((row) => row.content.toLowerCase().includes(term))
}
