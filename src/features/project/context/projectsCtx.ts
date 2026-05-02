import { createContext, useContext } from "react"
import type { MemberRole, Project } from "@/shared/supabase"
import type { ProjectFormValues } from "../schemas/project.schema"

export interface ProjectsContextValue {
  projects: Project[]
  loading: boolean
  userRoles: Record<string, MemberRole>
  createProject: (values: ProjectFormValues) => Promise<Project | null>
  deleteProject: (id: string) => Promise<void>
}

export const ProjectsContext = createContext<ProjectsContextValue | null>(null)

export const useProjectsContext = (): ProjectsContextValue => {
  const ctx = useContext(ProjectsContext)
  if (!ctx) throw new Error("useProjectsContext debe usarse dentro de ProjectsProvider")
  return ctx
}
