import { useState, useMemo, useRef, useEffect, type ReactNode } from "react"
import { useParams } from "react-router"
import { supabase } from "@/shared/supabase"
import type { MemberRole, Profile, ProjectMember } from "@/shared/supabase"
import { useAuth } from "@/features/auth"
import type { ColumnType, Task, TaskPriority, TaskSize } from "../types/board.types"
import { KanbanContext } from "./kanbanCtx"

type RawTask = {
  id: string
  column_id: string
  content: string
  priority: string
  size: string
  project_id: string
  position: number
  assignee_id: string | null
}

type RawMember = {
  id: string
  project_id: string
  user_id: string
  role: string
  joined_at: string
}

const fetchProfiles = async (userIds: string[]): Promise<Record<string, Profile>> => {
  if (userIds.length === 0) return {}
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, email, updated_at")
    .in("id", userIds)
  const map: Record<string, Profile> = {}
  for (const p of data ?? []) map[p.id] = p
  return map
}

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

      const [{ data: cols }, { data: tsksRaw }, { data: membersRaw }, { data: memberRow }] =
        await Promise.all([
          supabase.from("columns").select("*").eq("project_id", projectId).order("position"),
          supabase.from("tasks").select("*").eq("project_id", projectId).order("position"),
          supabase.from("project_members").select("*").eq("project_id", projectId),
          supabase
            .from("project_members")
            .select("role")
            .eq("project_id", projectId)
            .eq("user_id", user.id)
            .single(),
        ])

      // Cargar perfiles de asignados y miembros en una sola query
      const assigneeIds = (tsksRaw ?? [])
        .map((t) => (t as RawTask).assignee_id)
        .filter((id): id is string => id !== null)
      const memberIds = (membersRaw ?? []).map((m) => (m as RawMember).user_id)
      const allUserIds = [...new Set([...assigneeIds, ...memberIds])]
      const profilesMap = await fetchProfiles(allUserIds)

      setColumns(
        (cols ?? []).map((c) => ({
          id: c.id,
          title: c.title,
          project_id: c.project_id,
          position: c.position,
        })),
      )
      setTasks(
        (tsksRaw ?? []).map((t) => {
          const raw = t as RawTask
          return {
            id: raw.id,
            columnId: raw.column_id,
            content: raw.content,
            priority: raw.priority as TaskPriority,
            size: raw.size as TaskSize,
            project_id: raw.project_id,
            position: raw.position,
            assignee_id: raw.assignee_id ?? null,
            assigneeProfile: raw.assignee_id ? (profilesMap[raw.assignee_id] ?? null) : null,
          }
        }),
      )
      setMembers(
        (membersRaw ?? []).map((m) => {
          const raw = m as RawMember
          return {
            id: raw.id,
            project_id: raw.project_id,
            user_id: raw.user_id,
            role: raw.role as MemberRole,
            joined_at: raw.joined_at,
            profiles: profilesMap[raw.user_id],
          }
        }),
      )
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

    const { data, error } = await supabase
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
      .select("*")
      .single()

    if (error || !data) return
    const raw = data as RawTask
    const assigneeProfile = raw.assignee_id ? (members.find((m) => m.user_id === raw.assignee_id)?.profiles ?? null) : null
    const newTask: Task = {
      id: raw.id,
      columnId: raw.column_id,
      content: raw.content,
      priority: raw.priority as TaskPriority,
      size: raw.size as TaskSize,
      project_id: raw.project_id,
      position: raw.position,
      assignee_id: raw.assignee_id ?? null,
      assigneeProfile: assigneeProfile ?? null,
    }
    setTasks((prev) => [...prev, newTask])
  }

  const updateTask = async (
    id: string,
    taskData: { content: string; priority: TaskPriority; size: TaskSize; assignee_id?: string | null },
  ): Promise<void> => {
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
              assigneeProfile: assigneeProfile ?? null,
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
