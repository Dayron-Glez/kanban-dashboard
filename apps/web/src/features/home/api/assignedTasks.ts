import { useQuery } from "@tanstack/react-query"
import { queryKeys, useApi } from "@/shared/api"

export const useAssignedTasks = () => {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.tasks.assignedToMe(),
    queryFn: () => api.tasks.listAssignedToMe(),
  })
}
