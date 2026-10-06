import type { ReactNode } from "react"
import { useProjects } from "../hooks/useProjects"
import { ProjectsContext } from "./projectsCtx"

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const value = useProjects()
  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}
