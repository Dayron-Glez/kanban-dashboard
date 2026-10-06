/**
 * Datos que viajan con cada arrastre del tablero.
 *
 * pragmatic-drag-and-drop los tipa como `Record<string, unknown>` porque no
 * sabe qué se arrastra. Estas guardas son el único sitio donde se decide qué
 * forma tienen, así que ni las tarjetas, ni las columnas, ni el tablero
 * necesitan suponerla con un cast.
 */

// Alias y no interfaces: solo un alias de tipo objeto es asignable a
// Record<string, unknown>, que es lo que piden draggable() y attachClosestEdge().
export type TaskDragData = {
  type: "task"
  taskId: string
  columnId: string
}

export type ColumnDragData = {
  type: "column"
  columnId: string
}

type DragData = Record<string | symbol, unknown>

export const taskDragData = (taskId: string, columnId: string): TaskDragData => ({
  type: "task",
  taskId,
  columnId,
})

export const columnDragData = (columnId: string): ColumnDragData => ({ type: "column", columnId })

export const isTaskDragData = (data: DragData): data is DragData & TaskDragData =>
  data.type === "task" && typeof data.taskId === "string" && typeof data.columnId === "string"

export const isColumnDragData = (data: DragData): data is DragData & ColumnDragData =>
  data.type === "column" && typeof data.columnId === "string"
