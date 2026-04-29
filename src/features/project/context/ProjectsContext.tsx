import { createContext, useContext, type ReactNode } from "react"
import { useProjects } from "../hooks/useProjects"
import type { ProjectFormValues } from "../schemas/project.schema"
import type { Project } from "@/shared/supabase"

interface ProjectsContextValue {
  projects: Project[]
  loading: boolean
  createProject: (values: ProjectFormValues) => Promise<Project | null>
  deleteProject: (id: string) => Promise<void>
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null)

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const value = useProjects()
  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

export function useProjectsContext(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext)
  if (!ctx) throw new Error("useProjectsContext debe usarse dentro de ProjectsProvider")
  return ctx
}
