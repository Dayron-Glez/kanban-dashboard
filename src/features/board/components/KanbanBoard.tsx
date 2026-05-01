import { useContext, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { arrayMove, SortableContext } from "@dnd-kit/sortable"
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
import { TaskCard } from "@/features/task/index"
import { useKanban, type ColumnType, type Task } from "../index"

export default function KanbanBoard() {
  const searchContext = useContext<{
    searchValue: string
    setSearchValue: (value: string) => void
  } | null>(SearchContext)
  const searchValue = searchContext?.searchValue ?? ""

  const { columns, tasks, columnsId, setColumns, setTasks } = useKanban()

  const [activeColumn, setActiveColumn] = useState<ColumnType | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
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

  const onDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    const wasTask = activeTask !== null

    setActiveColumn(null)
    setActiveTask(null)

    if (!over || active.id === over.id) {
      dragOriginColumnId.current = null
      return
    }

    // ── Reordenar columnas ────────────────────────────────────────
    if (!wasTask) {
      setColumns((prev) => {
        const activeIndex = prev.findIndex((c) => c.id === active.id)
        const overIndex = prev.findIndex((c) => c.id === over.id)
        if (activeIndex === -1 || overIndex === -1) return prev
        const reordered = arrayMove(prev, activeIndex, overIndex)
        // Persistir nuevas posiciones
        const updates = reordered.map((col, i) => ({ id: col.id, position: i, project_id: col.project_id, title: col.title }))
        supabase.from("columns").upsert(updates).then(() => {})
        return reordered.map((col, i) => ({ ...col, position: i }))
      })
      return
    }

    // ── Persistir movimiento de tarea ─────────────────────────────
    const movedTask = tasks.find((t) => t.id === String(active.id))
    const originColumnId = dragOriginColumnId.current
    dragOriginColumnId.current = null

    if (!movedTask) return

    const newColumnId = movedTask.columnId
    const newPosition = tasks.filter((t) => t.columnId === newColumnId).findIndex((t) => t.id === movedTask.id)

    // Actualizar columna y posición en tasks
    supabase
      .from("tasks")
      .update({ column_id: newColumnId, position: newPosition })
      .eq("id", movedTask.id)
      .then(() => {})

    // Registrar en task_history solo si cambió de columna
    if (originColumnId && originColumnId !== newColumnId) {
      supabase
        .from("task_history")
        .insert({ task_id: movedTask.id, from_column_id: originColumnId, to_column_id: newColumnId })
        .then(() => {})
    }
  }

  const onDragOver = (event: DragOverEvent): void => {
    const { active, over } = event
    if (!over) return

    const isActiveTask = active.data.current?.type === "task"
    const isOverTask = over.data.current?.type === "task"
    const isOverColumn = over.data.current?.type === "column"

    if (!isActiveTask) return

    setTasks((prev) => {
      const activeIndex = prev.findIndex((t) => t.id === active.id)
      if (activeIndex === -1) return prev

      if (isOverTask) {
        const overIndex = prev.findIndex((t) => t.id === over.id)
        if (overIndex === -1) return prev
        const updated = [...prev]
        updated[activeIndex] = { ...updated[activeIndex], columnId: updated[overIndex].columnId }
        return arrayMove(updated, activeIndex, overIndex)
      }

      if (isOverColumn) {
        const updated = [...prev]
        updated[activeIndex] = { ...updated[activeIndex], columnId: String(over.id) }
        return updated
      }

      return prev
    })
  }

  return (
    <div className="min-w-max p-4">
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver}>
        <div className="m-auto flex gap-2">
          <SortableContext items={columnsId}>
            {columns.map((column) => {
              const columnFilteredTasks = filteredTasks.filter((t) => t.columnId === column.id)
              return (
                <ColumnContainer
                  key={column.id}
                  column={column}
                  tasks={columnFilteredTasks}
                  hasFilteredTasks={searchValue.trim().length > 0 && columnFilteredTasks.length > 0}
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
            {activeTask && <TaskCard task={activeTask} deleteTask={() => {}} updateTask={() => {}} />}
          </DragOverlay>,
          document.body,
        )}
      </DndContext>
    </div>
  )
}
