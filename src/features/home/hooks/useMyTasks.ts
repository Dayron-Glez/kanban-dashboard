import { useEffect, useState } from "react"
import { supabase } from "@/shared/supabase"
import type { TaskPriority, TaskSize } from "@/features/board/index"
import { useAuth } from "@/features/auth"

/** Tarea asignada al usuario, con el contexto de dónde vive. */
export interface MyTask {
  id: string
  content: string
  priority: TaskPriority
  size: TaskSize
  projectId: string
  projectName: string
  projectColor: string
  columnTitle: string
}

/** Fila cruda del join; Supabase devuelve las relaciones anidadas. */
interface RawRow {
  id: string
  content: string
  priority: string
  size: string
  project_id: string
  projects: { name: string; color: string } | null
  columns: { title: string } | null
}

/**
 * Tareas asignadas al usuario en todos sus proyectos. Es la fuente de la
 * sección «Asignadas a mí» del inicio: la única vista transversal del
 * producto, frente al resto que trabaja siempre dentro de un proyecto.
 */
export const useMyTasks = () => {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<MyTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      const { data } = await supabase
        .from("tasks")
        .select("id, content, priority, size, project_id, projects(name, color), columns(title)")
        .eq("assignee_id", user.id)

      if (cancelled) return

      const rows = (data ?? []) as unknown as RawRow[]
      setTasks(
        rows.map((r) => ({
          id: r.id,
          content: r.content,
          priority: r.priority as TaskPriority,
          size: r.size as TaskSize,
          projectId: r.project_id,
          projectName: r.projects?.name ?? "Proyecto",
          projectColor: r.projects?.color ?? "#64748b",
          columnTitle: r.columns?.title ?? "—",
        }))
      )
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [user])

  return { tasks, loading }
}
