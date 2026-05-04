import { useEffect, useState } from "react"
import { supabase } from "@/shared/supabase"
import type { MemberRole, Project } from "@/shared/supabase"
import { useAuth } from "@/features/auth"
import type { ProjectFormValues } from "../schemas/project.schema"

export const useProjects = () => {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [userRoles, setUserRoles] = useState<Record<string, MemberRole>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async () => {
      // Paso 1: obtener membresías del usuario
      const { data: memberRows } = await supabase
        .from("project_members")
        .select("project_id, role")
        .eq("user_id", user.id)

      if (cancelled) return

      if (!memberRows || memberRows.length === 0) {
        setProjects([])
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

      setProjects(projectsData ?? [])
      const roles: Record<string, MemberRole> = {}
      for (const r of memberRows) roles[r.project_id] = r.role as MemberRole
      setUserRoles(roles)
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
  }

  const renameProject = async (id: string, name: string) => {
    const { error } = await supabase.from("projects").update({ name }).eq("id", id)
    if (!error) setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
  }

  return { projects, loading, createProject, deleteProject, renameProject, userRoles }
}
