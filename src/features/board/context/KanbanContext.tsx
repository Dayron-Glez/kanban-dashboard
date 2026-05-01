import { useState, useMemo, useRef, useEffect, type ReactNode } from "react"
import { useParams } from "react-router"
import { supabase } from "@/shared/supabase"
import type { ColumnType, Task, TaskPriority, TaskSize } from "../types/board.types"
import { KanbanContext } from "./kanbanCtx"

export function KanbanProvider({ children }: { children: ReactNode }) {
  const { id: projectId } = useParams<{ id: string }>()

  const [columns, setColumns] = useState<ColumnType[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const scrollContainerRef = useRef<HTMLElement | null>(null)
  const columnsId = useMemo(() => columns.map((c) => c.id), [columns])

  // ── Carga inicial ──────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return
    const load = async () => {
      setLoading(true)
      const [{ data: cols }, { data: tsks }] = await Promise.all([
        supabase.from("columns").select("*").eq("project_id", projectId).order("position"),
        supabase.from("tasks").select("*").eq("project_id", projectId).order("position"),
      ])
      setColumns(
        (cols ?? []).map((c) => ({
          id: c.id,
          title: c.title,
          project_id: c.project_id,
          position: c.position,
        })),
      )
      setTasks(
        (tsks ?? []).map((t) => ({
          id: t.id,
          columnId: t.column_id,
          content: t.content,
          priority: t.priority as TaskPriority,
          size: t.size as TaskSize,
          project_id: t.project_id,
          position: t.position,
        })),
      )
      setLoading(false)
    }
    load()
  }, [projectId])

  // ── Columnas ───────────────────────────────────────────────────
  const createNewColumn = async (title?: string): Promise<void> => {
    if (!projectId) return
    const resolvedTitle = title && title.trim() !== "" ? title.trim() : `Columna ${columns.length + 1}`
    const position = columns.length

    const { data, error } = await supabase
      .from("columns")
      .insert({ project_id: projectId, title: resolvedTitle, position })
      .select()
      .single()

    if (error || !data) return
    const newCol: ColumnType = { id: data.id, title: data.title, project_id: data.project_id, position: data.position }
    setColumns((prev) => [...prev, newCol])

    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ left: scrollContainerRef.current.scrollWidth, behavior: "smooth" })
      }
    }, 50)
  }

  const updateColumn = async (id: string, title: string): Promise<void> => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)))
    await supabase.from("columns").update({ title }).eq("id", id)
  }

  const deleteColumn = async (id: string): Promise<void> => {
    setColumns((prev) => prev.filter((c) => c.id !== id))
    setTasks((prev) => prev.filter((t) => t.columnId !== id))
    await supabase.from("columns").delete().eq("id", id)
  }

  // ── Tareas ─────────────────────────────────────────────────────
  const createNewTask = async (
    columnId: string,
    taskData: { content: string; priority: TaskPriority; size: TaskSize },
  ): Promise<void> => {
    if (!projectId) return
    const position = tasks.filter((t) => t.columnId === columnId).length

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        column_id: columnId,
        project_id: projectId,
        content: taskData.content,
        priority: taskData.priority,
        size: taskData.size,
        position,
      })
      .select()
      .single()

    if (error || !data) return
    const newTask: Task = {
      id: data.id,
      columnId: data.column_id,
      content: data.content,
      priority: data.priority as TaskPriority,
      size: data.size as TaskSize,
      project_id: data.project_id,
      position: data.position,
    }
    setTasks((prev) => [...prev, newTask])
  }

  const updateTask = async (
    id: string,
    taskData: { content: string; priority: TaskPriority; size: TaskSize },
  ): Promise<void> => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, content: taskData.content, priority: taskData.priority, size: taskData.size } : t,
      ),
    )
    await supabase.from("tasks").update({ content: taskData.content, priority: taskData.priority, size: taskData.size }).eq("id", id)
  }

  const deleteTask = async (id: string): Promise<void> => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    await supabase.from("tasks").delete().eq("id", id)
  }

  return (
    <KanbanContext.Provider
      value={{
        columns,
        tasks,
        columnsId,
        loading,
        createNewColumn,
        updateColumn,
        deleteColumn,
        createNewTask,
        updateTask,
        deleteTask,
        setColumns,
        setTasks,
        scrollContainerRef,
      }}
    >
      {children}
    </KanbanContext.Provider>
  )
}
