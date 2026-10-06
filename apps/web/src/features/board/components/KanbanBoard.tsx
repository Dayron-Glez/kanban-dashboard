import { useContext, useEffect, useEffectEvent } from "react"
import { useSearchParams } from "react-router"
import { motion } from "framer-motion"
import {
  monitorForElements,
  type ElementEventBasePayload,
} from "@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter"
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/utils/reorder"
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge/extract-closest-edge"
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index"
import { SearchContext } from "@/shared/index"
import { supabase } from "@/shared/supabase"
import { ColumnContainer } from "@/features/column/index"
import { DetailsTaskSheet } from "@/features/task/index"
import { isColumnDragData, isTaskDragData } from "../lib/dragData"
import { columnPositionRows, dropAtColumnEnd, dropNextToTask } from "../lib/reorder"
import { useKanban, type ColumnType, type Task } from "../index"

export default function KanbanBoard() {
  const searchContext = useContext<{
    searchValue: string
    setSearchValue: (value: string) => void
  } | null>(SearchContext)
  const searchValue = searchContext?.searchValue ?? ""

  const { columns, tasks, setColumns, setTasks } = useKanban()

  const [searchParams, setSearchParams] = useSearchParams()
  const deepLinkedTask = tasks.find((t) => t.id === searchParams.get("task")) ?? null

  const closeDeepLink = (): void => {
    const next = new URLSearchParams(searchParams)
    next.delete("task")
    setSearchParams(next, { replace: true })
  }

  const filteredTasks = tasks.filter((task) => {
    const searchTerm = searchValue.trim().toLowerCase()
    if (!task.content || !searchTerm) return true
    return task.content.toLowerCase().includes(searchTerm)
  })

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

  const saveColumnOrder = (ordered: ColumnType[]): void => {
    supabase
      .from("columns")
      .upsert(
        ordered.map((col) => ({
          id: col.id,
          position: col.position,
          project_id: col.project_id,
          title: col.title,
        }))
      )
      .then(({ error }) => {
        if (error) console.error("[kanban] no se pudo guardar el orden de las columnas:", error)
      })
  }

  const dropColumn = (columnId: string, target: ElementEventBasePayload["location"]): void => {
    const record = target.current.dropTargets[0]
    if (!record || !isColumnDragData(record.data)) return

    const startIndex = columns.findIndex((c) => c.id === columnId)
    const indexOfTarget = columns.findIndex((c) => c.id === record.data.columnId)
    if (startIndex === -1 || indexOfTarget === -1) return

    const finishIndex = getReorderDestinationIndex({
      startIndex,
      indexOfTarget,
      closestEdgeOfTarget: extractClosestEdge(record.data),
      axis: "horizontal",
    })
    if (finishIndex === startIndex) return

    const reordered = reorder({ list: columns, startIndex, finishIndex }).map((col, i) => ({
      ...col,
      position: i,
    }))
    setColumns(reordered)
    saveColumnOrder(reordered)
  }

  const dropTask = (
    taskId: string,
    originColumnId: string,
    target: ElementEventBasePayload["location"]
  ): void => {
    const record = target.current.dropTargets[0]
    if (!record) return

    let settled: Task[]
    if (isTaskDragData(record.data)) {
      const edge = extractClosestEdge(record.data)
      if (edge !== "top" && edge !== "bottom") return
      settled = dropNextToTask(tasks, taskId, record.data.taskId, edge)
    } else if (isColumnDragData(record.data)) {
      settled = dropAtColumnEnd(tasks, taskId, record.data.columnId)
    } else {
      return
    }

    if (settled === tasks) return

    const moved = settled.find((task) => task.id === taskId)
    if (!moved) return

    setTasks(settled)
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

  // El monitor se registra una sola vez, pero al soltar tiene que trabajar
  // con las tareas y columnas de ese momento. useEffectEvent le da siempre el
  // estado más reciente sin volver a registrar el monitor en cada render.
  const onDrop = useEffectEvent(({ source, location }: ElementEventBasePayload): void => {
    if (isColumnDragData(source.data)) {
      dropColumn(source.data.columnId, location)
    } else if (isTaskDragData(source.data)) {
      dropTask(source.data.taskId, source.data.columnId, location)
    }
  })

  // Nada cambia de sitio mientras se arrastra: el estado se toca una sola vez,
  // al soltar. Durante el arrastre solo se ven la línea o el resalte de destino.
  useEffect(() => monitorForElements({ onDrop: (payload) => onDrop(payload) }), [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="flex min-h-0 w-full flex-1"
    >
      <div className="flex h-full w-full items-start gap-3 p-3">
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
      </div>

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
