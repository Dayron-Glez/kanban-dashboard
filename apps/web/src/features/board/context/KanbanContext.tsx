import { useState, useMemo, useRef, useEffect, type ReactNode } from "react"
import { useParams } from "react-router"
import type { Column, Task, TaskPriority, TaskSize } from "@repo/contracts"
import { withAssignees } from "@repo/domain"
import type { Tables } from "@repo/api-client"
import { supabase } from "@/shared/supabase"
import { useAuth } from "@/features/auth"
import { useMembers, useProject } from "@/features/project"
import type { TaskDraft } from "../types/board.types"
import { KanbanContext } from "./kanbanCtx"

const toColumn = (row: Tables<"columns">): Column => ({
  id: row.id,
  projectId: row.project_id,
  title: row.title,
  position: row.position,
})

// priority y size son text con CHECK en la base: el tipo generado dice string.
const toTask = (row: Tables<"tasks">): Task => ({
  id: row.id,
  projectId: row.project_id,
  columnId: row.column_id,
  content: row.content,
  priority: row.priority as TaskPriority,
  size: row.size as TaskSize,
  dueDate: row.due_date,
  position: row.position,
  assigneeId: row.assignee_id,
})

export function KanbanProvider({ children }: { children: ReactNode }) {
  const { id: projectId = "" } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { data: members = [] } = useMembers(projectId)
  const userRole = useProject(projectId).data?.role ?? null

  const [columns, setColumns] = useState<Column[]>([])
  const [rawTasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const scrollContainerRef = useRef<HTMLElement | null>(null)
  const columnsId = useMemo(() => columns.map((c) => c.id), [columns])
  const tasks = useMemo(() => withAssignees(rawTasks, members), [rawTasks, members])

  // ── Carga inicial ──────────────────────────────────────────────
  useEffect(() => {
    if (!projectId || !user) return
    const load = async () => {
      setLoading(true)

      const [{ data: cols }, { data: tsks }] = await Promise.all([
        supabase.from("columns").select("*").eq("project_id", projectId).order("position"),
        supabase.from("tasks").select("*").eq("project_id", projectId).order("position"),
      ])

      setColumns((cols ?? []).map(toColumn))
      setTasks((tsks ?? []).map(toTask))
      setLoading(false)
    }
    load()
  }, [projectId, user])

  // ── Columnas ───────────────────────────────────────────────────
  const createNewColumn = async (title?: string): Promise<void> => {
    if (!projectId) return
    const resolvedTitle =
      title && title.trim() !== "" ? title.trim() : `Columna ${columns.length + 1}`
    const position = columns.length

    const { data, error } = await supabase
      .from("columns")
      .insert({ project_id: projectId, title: resolvedTitle, position })
      .select()
      .single()

    if (error || !data) return
    setColumns((prev) => [...prev, toColumn(data)])

    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          left: scrollContainerRef.current.scrollWidth,
          behavior: "smooth",
        })
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
  const createNewTask = async (columnId: string, draft: TaskDraft): Promise<void> => {
    if (!projectId) return
    const position = rawTasks.filter((t) => t.columnId === columnId).length

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        column_id: columnId,
        project_id: projectId,
        content: draft.content,
        priority: draft.priority,
        size: draft.size,
        due_date: draft.dueDate || null,
        position,
        assignee_id: draft.assigneeId ?? null,
      })
      .select("*")
      .single()

    if (error || !data) return
    setTasks((prev) => [...prev, toTask(data)])
  }

  const updateTask = async (id: string, draft: TaskDraft): Promise<void> => {
    const changes = {
      content: draft.content,
      priority: draft.priority,
      size: draft.size,
      dueDate: draft.dueDate || null,
      assigneeId: draft.assigneeId ?? null,
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...changes } : t)))
    await supabase
      .from("tasks")
      .update({
        content: changes.content,
        priority: changes.priority,
        size: changes.size,
        due_date: changes.dueDate,
        assignee_id: changes.assigneeId,
      })
      .eq("id", id)
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
        userRole,
        members,
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
