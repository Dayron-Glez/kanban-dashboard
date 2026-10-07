import { useQuery } from "@tanstack/react-query"
import { queryKeys, useApi } from "@/shared/api"

export const useTaskHistory = (projectId: string) => {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.projects.history(projectId),
    queryFn: () => api.history.listByProject(projectId),
    enabled: projectId !== "",
  })
}
