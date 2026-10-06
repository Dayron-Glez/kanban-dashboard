import type { CreateProjectInput, Project, ProjectSummary } from "@repo/contracts"

export interface ProjectsRepository {
  listMine(): Promise<ProjectSummary[]>
  create(input: CreateProjectInput): Promise<Project>
  rename(id: string, name: string): Promise<void>
  remove(id: string): Promise<void>
  setFavorite(projectId: string, isFavorite: boolean): Promise<void>
}

export interface ApiClient {
  projects: ProjectsRepository
}
