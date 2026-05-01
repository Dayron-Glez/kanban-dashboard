import { createContext, useContext } from "react"
import type { ProjectFormValues } from "../schemas/project.schema"
import type { Project } from "@/shared/supabase"

export interface ProjectsContextValue {
  projects: Project[]
  loading: boolean
  createProject: (values: ProjectFormValues) => Promise<Project | null>
  deleteProject: (id: string) => Promise<void>
}

export const ProjectsContext = createContext<ProjectsContextValue | null>(null)

export const useProjectsContext = (): ProjectsContextValue => {
  const ctx = useContext(ProjectsContext)
  if (!ctx) throw new Error("useProjectsContext debe usarse dentro de ProjectsProvider")
  return ctx
}
