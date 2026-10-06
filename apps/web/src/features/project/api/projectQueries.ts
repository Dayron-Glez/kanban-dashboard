import { queryOptions, useQuery, type QueryClient } from "@tanstack/react-query"
import type { ApiClient } from "@repo/api-client"
import type { ProjectSummary } from "@repo/contracts"
import { queryKeys, useApi } from "@/shared/api"

const myProjectsQuery = (api: ApiClient) =>
  queryOptions({
    queryKey: queryKeys.projects.mine(),
    queryFn: () => api.projects.listMine(),
  })

export const useProjects = () => {
  const api = useApi()
  return useQuery(myProjectsQuery(api))
}

export const useProject = (id: string | undefined) => {
  const api = useApi()
  return useQuery({
    ...myProjectsQuery(api),
    select: (projects) => projects.find((project) => project.id === id),
  })
}

export const patchProject = (
  queryClient: QueryClient,
  id: string,
  patch: Partial<ProjectSummary>
) =>
  queryClient.setQueryData<ProjectSummary[]>(queryKeys.projects.mine(), (projects) =>
    projects?.map((project) => (project.id === id ? { ...project, ...patch } : project))
  )
