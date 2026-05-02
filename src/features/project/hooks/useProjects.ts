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
    supabase
      .from("project_members")
      .select("role, projects!inner(*)")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return
        const rows = (data ?? []) as Array<{ role: MemberRole; projects: Project }>
        const sorted = rows.sort(
          (a, b) =>
            new Date(b.projects.created_at).getTime() - new Date(a.projects.created_at).getTime(),
        )
        setProjects(sorted.map((r) => r.projects))
        const roles: Record<string, MemberRole> = {}
        for (const r of sorted) roles[r.projects.id] = r.role
        setUserRoles(roles)
        setLoading(false)
      })
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
      supabase.from("columns").insert(
        defaultColumns.map((title, position) => ({ project_id: data.id, title, position })),
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

  return { projects, loading, createProject, deleteProject, userRoles }
}
