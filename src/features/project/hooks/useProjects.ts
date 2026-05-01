import { useEffect, useState } from "react"
import { supabase } from "@/shared/supabase"
import type { Project } from "@/shared/supabase"
import { useAuth } from "@/features/auth"
import type { ProjectFormValues } from "../schemas/project.schema"

export const useProjects = () => {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled) return
        setProjects(data ?? [])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [user?.id])

  const createProject = async (values: ProjectFormValues): Promise<Project | null> => {
    if (!user) return null
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...values, owner_id: user.id })
      .select()
      .single()
    if (error || !data) return null

    const defaultColumns = ["Backlog", "Ready", "In Progress", "In Review", "Done"]
    await supabase.from("columns").insert(
      defaultColumns.map((title, position) => ({ project_id: data.id, title, position })),
    )

    setProjects((prev) => [data, ...prev])
    return data
  }

  const deleteProject = async (id: string) => {
    await supabase.from("projects").delete().eq("id", id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  return { projects, loading, createProject, deleteProject }
}
