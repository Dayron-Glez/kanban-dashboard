import { useState, useMemo, useRef, useEffect, type ReactNode } from "react"
import { useParams } from "react-router"
import { supabase } from "@/shared/supabase"
import type { MemberRole, ProjectMember } from "@/shared/supabase"
import { useAuth } from "@/features/auth"
import type { ColumnType, Task, TaskPriority, TaskSize } from "../types/board.types"
import { KanbanContext } from "./kanbanCtx"

export function KanbanProvider({ children }: { children: ReactNode }) {
  const { id: projectId } = useParams<{ id: string }>()
  const { user } = useAuth()

  const [columns, setColumns] = useState<ColumnType[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [userRole, setUserRole] = useState<MemberRole | null>(null)
  const [loading, setLoading] = useState(true)

  const scrollContainerRef = useRef<HTMLElement | null>(null)
  const columnsId = useMemo(() => columns.map((c) => c.id), [columns])

  // ── Carga inicial ──────────────────────────────────────────────
  useEffect(() => {
    if (!projectId || !user) return
    const load = async () => {
      setLoading(true)

      type RawTask = {
        id: string
        column_id: string
        content: string
        priority: string
        size: string
        project_id: string
        position: number
        assignee_id: string | null
        profiles: { full_name: string | null; avatar_url: string | null } | null
      }

      const [{ data: cols }, { data: tsksRaw }, { data: membersData }, { data: memberRow }] =
        await Promise.all([
          supabase.from("columns").select("*").eq("project_id", projectId).order("position"),
          (supabase
            .from("tasks")
            .select("*, profiles(full_name, avatar_url)")
            .eq("project_id", projectId)
            .order("position")) as unknown as Promise<{ data: RawTask[] | null }>,
          (supabase
            .from("project_members")
            .select("*, profiles(full_name, avatar_url)")
            .eq("project_id", projectId)) as unknown as Promise<{ data: ProjectMember[] | null }>,
          supabase
            .from("project_members")
            .select("role")
            .eq("project_id", projectId)
            .eq("user_id", user.id)
            .single(),
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
        (tsksRaw ?? []).map((t) => ({
          id: t.id,
          columnId: t.column_id,
          content: t.content,
          priority: t.priority as TaskPriority,
          size: t.size as TaskSize,
          project_id: t.project_id,
          position: t.position,
          assignee_id: t.assignee_id ?? null,
          assigneeProfile: t.profiles ?? null,
        })),
      )
      setMembers(membersData ?? [])
      setUserRole((memberRow?.role as MemberRole) ?? null)
      setLoading(false)
    }
    load()
  }, [projectId, user])

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
    taskData: { content: string; priority: TaskPriority; size: TaskSize; assignee_id?: string | null },
  ): Promise<void> => {
    if (!projectId) return
    const position = tasks.filter((t) => t.columnId === columnId).length

    type RawTask = {
      id: string
      column_id: string
      content: string
      priority: string
      size: string
      project_id: string
      position: number
      assignee_id: string | null
      profiles: { full_name: string | null; avatar_url: string | null } | null
    }

    const { data, error } = await (supabase
      .from("tasks")
      .insert({
        column_id: columnId,
        project_id: projectId,
        content: taskData.content,
        priority: taskData.priority,
        size: taskData.size,
        position,
        assignee_id: taskData.assignee_id ?? null,
      })
      .select("*, profiles(full_name, avatar_url)")
      .single() as unknown as Promise<{ data: RawTask | null; error: unknown }>)

    if (error || !data) return
    const newTask: Task = {
      id: data.id,
      columnId: data.column_id,
      content: data.content,
      priority: data.priority as TaskPriority,
      size: data.size as TaskSize,
      project_id: data.project_id,
      position: data.position,
      assignee_id: data.assignee_id ?? null,
      assigneeProfile: data.profiles ?? null,
    }
    setTasks((prev) => [...prev, newTask])
  }

  const updateTask = async (
    id: string,
    taskData: { content: string; priority: TaskPriority; size: TaskSize; assignee_id?: string | null },
  ): Promise<void> => {
    // Resolve assignee profile from members list
    const assigneeProfile =
      taskData.assignee_id
        ? members.find((m) => m.user_id === taskData.assignee_id)?.profiles ?? null
        : null

    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              content: taskData.content,
              priority: taskData.priority,
              size: taskData.size,
              assignee_id: taskData.assignee_id ?? null,
              assigneeProfile,
            }
          : t,
      ),
    )
    await supabase
      .from("tasks")
      .update({
        content: taskData.content,
        priority: taskData.priority,
        size: taskData.size,
        assignee_id: taskData.assignee_id ?? null,
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
