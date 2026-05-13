import { useContext, useRef, useState } from "react"
import { createPortal } from "react-dom"
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
  const dragTargetColumnId = useRef<string | null>(null)

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

    if (!over) {
      dragOriginColumnId.current = null
      dragTargetColumnId.current = null
      return
    }

    // ── Reordenar columnas ────────────────────────────────────────
    if (!wasTask) {
      if (active.id === over.id) return
      setColumns((prev) => {
        const activeIndex = prev.findIndex((c) => c.id === active.id)
        const overIndex = prev.findIndex((c) => c.id === over.id)
        if (activeIndex === -1 || overIndex === -1) return prev
        const reordered = arrayMove(prev, activeIndex, overIndex)
        const updates = reordered.map((col, i) => ({
          id: col.id,
          position: i,
          project_id: col.project_id,
          title: col.title,
        }))
        supabase
          .from("columns")
          .upsert(updates)
          .then(() => {})
        return reordered.map((col, i) => ({ ...col, position: i }))
      })
      return
    }

    // ── Persistir movimiento de tarea ─────────────────────────────
    // dragTargetColumnId was set synchronously in onDragOver from dnd-kit's
    // live ref. This avoids stale closures and the active.id === over.id
    // early-return that prevented persistence when the cursor was over
    // the task's own ghost after arrayMove repositioned it in the new column.
    const taskId = String(active.id)
    const originColumnId = dragOriginColumnId.current
    const newColumnId = dragTargetColumnId.current ?? ""

    dragOriginColumnId.current = null
    dragTargetColumnId.current = null

    if (!newColumnId || !originColumnId) return

    // Persistir posiciones (y column_id) para las columnas afectadas.
    // El functional updater recibe el estado YA actualizado por onDragOver
    // (columnId correcto + orden por arrayMove), así que prev es la fuente
    // de verdad del orden final — sin dependencia de closures estables.
    setTasks((prev) => {
      const tasksInNewColumn = prev.filter((t) => t.columnId === newColumnId)
      supabase
        .from("tasks")
        .upsert(
          tasksInNewColumn.map((t, i) => ({
            id: t.id,
            position: i,
            column_id: t.columnId,
            project_id: t.project_id,
            content: t.content,
            priority: t.priority,
            size: t.size,
          }))
        )
        .then(({ error }) => {
          if (error) console.error("[kanban] task positions upsert failed:", error)
        })

      if (originColumnId !== newColumnId) {
        const tasksInOriginColumn = prev.filter((t) => t.columnId === originColumnId)
        supabase
          .from("tasks")
          .upsert(
            tasksInOriginColumn.map((t, i) => ({
              id: t.id,
              position: i,
              column_id: t.columnId,
              project_id: t.project_id,
              content: t.content,
              priority: t.priority,
              size: t.size,
            }))
          )
          .then(({ error }) => {
            if (error) console.error("[kanban] origin column positions upsert failed:", error)
          })
      }

      return prev
    })

    // Registrar en task_history solo si cambió de columna
    if (originColumnId !== newColumnId) {
      supabase
        .from("task_history")
        .insert({ task_id: taskId, from_column_id: originColumnId, to_column_id: newColumnId })
        .then(({ error }) => {
          if (error) console.error("[kanban] task_history insert failed:", error)
        })
    }
  }

  const onDragOver = (event: DragOverEvent): void => {
    const { active, over } = event
    if (!over) return

    const isActiveTask = active.data.current?.type === "task"
    const isOverTask = over.data.current?.type === "task"
    const isOverColumn = over.data.current?.type === "column"

    if (!isActiveTask) return

    // Track destination synchronously from dnd-kit's live ref before setTasks runs.
    // We read the OVER element's data (never the active task's data) so the value
    // is always stable — only the active task's columnId changes via setTasks.
    if (isOverTask) {
      const overTask = over.data.current?.task as { columnId: string } | undefined
      if (overTask?.columnId) dragTargetColumnId.current = overTask.columnId
    } else if (isOverColumn) {
      dragTargetColumnId.current = String(over.id)
    }

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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="flex h-full w-full"
    >
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
      >
        <div className="flex h-full w-full items-start gap-4 p-4">
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
    </motion.div>
  )
}
