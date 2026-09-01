import { useEffect, useState } from "react"
import { supabase } from "@/shared/supabase"
import type { MemberRole, Project } from "@/shared/supabase"
import { useAuth } from "@/features/auth"
import type { ProjectFormValues } from "../schemas/project.schema"

/** Conteo de tareas por prioridad de un proyecto. */
export interface PriorityCounts {
  p0: number
  p1: number
  p2: number
}

const isPriorityKey = (value: string): value is keyof PriorityCounts =>
  value === "p0" || value === "p1" || value === "p2"

export const useProjects = () => {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [userRoles, setUserRoles] = useState<Record<string, MemberRole>>({})
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({})
  const [priorityCounts, setPriorityCounts] = useState<Record<string, PriorityCounts>>({})
  const [favoriteIds, setFavoriteIds] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async () => {
      // Paso 1: obtener membresías del usuario (incluye is_favorite)
      const { data: memberRows } = await supabase
        .from("project_members")
        .select("project_id, role, is_favorite")
        .eq("user_id", user.id)

      if (cancelled) return

      if (!memberRows || memberRows.length === 0) {
        setProjects([])
        setTaskCounts({})
        setPriorityCounts({})
        setFavoriteIds({})
        setLoading(false)
        return
      }

      // Paso 2: obtener los proyectos por IDs
      const projectIds = memberRows.map((r) => r.project_id)
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*")
        .in("id", projectIds)
        .order("created_at", { ascending: false })

      if (cancelled) return

      // Paso 3: obtener conteo de tareas (total y por prioridad) por proyecto
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("project_id, priority")
        .in("project_id", projectIds)

      if (cancelled) return

      const counts: Record<string, number> = {}
      const priorities: Record<string, PriorityCounts> = {}
      for (const id of projectIds) {
        counts[id] = 0
        priorities[id] = { p0: 0, p1: 0, p2: 0 }
      }
      for (const t of tasksData ?? []) {
        counts[t.project_id] = (counts[t.project_id] ?? 0) + 1
        // Prioridad desconocida o ausente: cuenta en el total, no en los chips.
        if (typeof t.priority === "string" && isPriorityKey(t.priority)) {
          priorities[t.project_id][t.priority] += 1
        }
      }
      setTaskCounts(counts)
      setPriorityCounts(priorities)

      setProjects(projectsData ?? [])

      const roles: Record<string, MemberRole> = {}
      const favorites: Record<string, boolean> = {}
      for (const r of memberRows) {
        roles[r.project_id] = r.role as MemberRole
        favorites[r.project_id] = r.is_favorite ?? false
      }
      setUserRoles(roles)
      setFavoriteIds(favorites)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user])

  const createProject = async (values: ProjectFormValues): Promise<Project | null> => {
    if (!user) return null
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...values, owner_id: user.id })
      .select()
      .single()
    if (error || !data) return null

    const defaultColumns = ["Backlog", "Ready", "In Progress", "In Review", "Done"]
    await Promise.all([
      supabase
        .from("columns")
        .insert(
          defaultColumns.map((title, position) => ({ project_id: data.id, title, position }))
        ),
      supabase.from("project_members").insert({
        project_id: data.id,
        user_id: user.id,
        role: "owner" as MemberRole,
      }),
    ])

    setProjects((prev) => [data, ...prev])
    setUserRoles((prev) => ({ ...prev, [data.id]: "owner" }))
    setFavoriteIds((prev) => ({ ...prev, [data.id]: false }))
    return data
  }

  const deleteProject = async (id: string) => {
    await supabase.from("projects").delete().eq("id", id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
    setUserRoles((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setFavoriteIds((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const renameProject = async (id: string, name: string) => {
    const { error } = await supabase.from("projects").update({ name }).eq("id", id)
    if (!error) setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
  }

  const toggleFavorite = async (projectId: string) => {
    if (!user) return
    const next = !favoriteIds[projectId]
    setFavoriteIds((prev) => ({ ...prev, [projectId]: next }))
    const { error } = await supabase
      .from("project_members")
      .update({ is_favorite: next })
      .eq("project_id", projectId)
      .eq("user_id", user.id)
    if (error) {
      // revertir si falla
      setFavoriteIds((prev) => ({ ...prev, [projectId]: !next }))
    }
  }

  return {
    projects,
    loading,
    createProject,
    deleteProject,
    renameProject,
    toggleFavorite,
    userRoles,
    taskCounts,
    priorityCounts,
    favoriteIds,
  }
}
