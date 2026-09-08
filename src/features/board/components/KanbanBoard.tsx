import { useContext, useRef, useState } from "react"
import { useSearchParams } from "react-router"
import { createPortal, flushSync } from "react-dom"
import { arrayMove, SortableContext } from "@dnd-kit/sortable"
import { motion } from "framer-motion"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { SearchContext } from "@/shared/index"
import { supabase } from "@/shared/supabase"
import { ColumnContainer } from "@/features/column/index"
import { DetailsTaskSheet, TaskCard } from "@/features/task/index"
import { applyDrop, columnPositionRows, moveTaskToColumn, tasksInColumn } from "../lib/reorder"
import { useKanban, type ColumnType, type Task } from "../index"

export default function KanbanBoard() {
  const searchContext = useContext<{
    searchValue: string
    setSearchValue: (value: string) => void
  } | null>(SearchContext)
  const searchValue = searchContext?.searchValue ?? ""

  const { columns, tasks, columnsId, setColumns, setTasks } = useKanban()

  // Enlace profundo: ?task=<id> abre el detalle de esa tarea. Lo usan las
  // filas del inicio para no perder de vista la tarea al saltar al tablero.
  const [searchParams, setSearchParams] = useSearchParams()
  const deepLinkedTask = tasks.find((t) => t.id === searchParams.get("task")) ?? null

  const closeDeepLink = (): void => {
    const next = new URLSearchParams(searchParams)
    next.delete("task")
    setSearchParams(next, { replace: true })
  }

  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  // Columna de la que salió la tarea, para saber si hubo cambio de columna:
  // al soltar, su columnId ya es el de destino.
  const dragOriginColumnId = useRef<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }))

  const filteredTasks = tasks.filter((task) => {
    const searchTerm = searchValue.trim().toLowerCase()
    if (!task.content || !searchTerm) return true
    return task.content.toLowerCase().includes(searchTerm)
  })

  const onDragStart = (event: DragStartEvent): void => {
    if (event.active.data.current?.type === "column") {
      setActiveColumn(event.active.data.current.column)
    }
    if (event.active.data.current?.type === "task") {
      const task: Task = event.active.data.current.task
      setActiveTask(task)
      dragOriginColumnId.current = task.columnId
    }
  }

  /** Guarda el orden de una columna renumerando `position` de 0 a n-1. */
  const savePositions = (all: Task[], columnId: string): void => {
    const rows = columnPositionRows(all, columnId)
    if (rows.length === 0) return
    supabase
      .from("tasks")
      .upsert(rows)
      .then(({ error }) => {
        if (error) console.error("[kanban] no se pudo guardar el orden de la columna:", error)
      })
  }

  const onDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    const wasTask = activeTask !== null

    setActiveColumn(null)
    setActiveTask(null)

    const originColumnId = dragOriginColumnId.current
    dragOriginColumnId.current = null

    if (!over) return

    // ── Reordenar columnas ────────────────────────────────────────
    if (!wasTask) {
      if (active.id === over.id) return
      setColumns((prev) => {
        const activeIndex = prev.findIndex((c) => c.id === active.id)
        const overIndex = prev.findIndex((c) => c.id === over.id)
        if (activeIndex === -1 || overIndex === -1) return prev
        const reordered = arrayMove(prev, activeIndex, overIndex).map((col, i) => ({
          ...col,
          position: i,
        }))
        supabase
          .from("columns")
          .upsert(
            reordered.map((col) => ({
              id: col.id,
              position: col.position,
              project_id: col.project_id,
              title: col.title,
            }))
          )
          .then(({ error }) => {
            if (error) console.error("[kanban] no se pudo guardar el orden de las columnas:", error)
          })
        return reordered
      })
      return
    }

    // ── Reordenar y persistir la tarea ────────────────────────────
    const overType = over.data.current?.type
    if (!originColumnId || (overType !== "task" && overType !== "column")) return
    const taskId = String(active.id)

    // El reordenamiento dentro de la columna se aplica aquí, no en onDragOver:
    // durante el arrastre el desplazamiento es solo visual (lo hace el
    // SortableContext). flushSync fuerza el commit para poder leer el array
    // definitivo y persistir exactamente el orden que quedó en pantalla.
    let settled: Task[] = []
    flushSync(() => {
      setTasks((prev) => {
        settled = applyDrop(prev, taskId, String(over.id), overType === "task")
        return settled
      })
    })

    const moved = settled.find((t) => t.id === taskId)
    if (!moved) return

    savePositions(settled, moved.columnId)

    if (originColumnId !== moved.columnId) {
      savePositions(settled, originColumnId)
      supabase
        .from("task_history")
        .insert({
          task_id: taskId,
          from_column_id: originColumnId,
          to_column_id: moved.columnId,
        })
        .then(({ error }) => {
          if (error) console.error("[kanban] no se pudo registrar el historial:", error)
        })
    }
  }

  /**
   * Durante el arrastre lo único que cambia en el estado es la columna de la
   * tarea. El reordenamiento dentro de una columna lo resuelve visualmente el
   * SortableContext y se aplica al soltar: tocar el array en cada movimiento
   * del puntero reordenaba el DOM, dnd-kit recalculaba las colisiones y volvía
   * a entrar aquí, un ciclo que agotaba el límite de renders de React.
   */
  const onDragOver = (event: DragOverEvent): void => {
    const { active, over } = event
    if (!over || active.data.current?.type !== "task") return

    const overType = over.data.current?.type
    const overTask = over.data.current?.task as Task | undefined

    const targetColumnId =
      overType === "task" ? overTask?.columnId : overType === "column" ? String(over.id) : undefined
    if (!targetColumnId) return

    const taskId = String(active.id)

    setTasks((prev) => {
      const dragged = prev.find((t) => t.id === taskId)
      if (!dragged || dragged.columnId === targetColumnId) return prev

      const column = tasksInColumn(prev, targetColumnId)

      // Sobre el cuerpo de la columna, al final. Sobre una tarea, en su hueco;
      // o detrás de ella si el cursor ya pasó de su mitad.
      let position = column.length
      if (overTask) {
        const overIndex = column.findIndex((t) => t.id === overTask.id)
        if (overIndex !== -1) {
          const activeRect = active.rect.current.translated
          const pastMiddle = activeRect
            ? activeRect.top > over.rect.top + over.rect.height / 2
            : false
          position = overIndex + (pastMiddle ? 1 : 0)
        }
      }

      return moveTaskToColumn(prev, taskId, targetColumnId, position)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="flex min-h-0 w-full flex-1"
    >
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
      >
        <div className="flex h-full w-full items-start gap-3 p-3">
          <SortableContext items={columnsId}>
            {columns.map((column) => {
              const columnFilteredTasks = filteredTasks.filter((t) => t.columnId === column.id)
              return (
                <ColumnContainer
                  key={column.id}
                  column={column}
                  tasks={columnFilteredTasks}
                  hasFilteredTasks={searchValue.trim().length > 0 && columnFilteredTasks.length > 0}
                  boardDragging={activeColumn !== null || activeTask !== null}
                />
              )
            })}
          </SortableContext>
        </div>

        {createPortal(
          <DragOverlay>
            {activeColumn && (
              <ColumnContainer
                column={activeColumn}
                tasks={filteredTasks.filter((t) => t.columnId === activeColumn.id)}
                hasFilteredTasks={
                  searchValue.trim().length > 0 &&
                  filteredTasks.filter((t) => t.columnId === activeColumn.id).length > 0
                }
              />
            )}
            {activeTask && (
              <TaskCard task={activeTask} deleteTask={() => {}} updateTask={() => {}} />
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      {deepLinkedTask && (
        <DetailsTaskSheet
          task={deepLinkedTask}
          open
          onOpenChange={(next) => !next && closeDeepLink()}
        />
      )}
    </motion.div>
  )
}
