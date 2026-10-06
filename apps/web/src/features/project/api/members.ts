import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ProjectMember } from "@repo/contracts"
import { queryKeys, removeOptimistically, restoreRemoved, useApi } from "@/shared/api"

export const useMembers = (projectId: string) => {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.projects.members(projectId),
    queryFn: () => api.members.listByProject(projectId),
  })
}

export const useRemoveMember = (projectId: string) => {
  const api = useApi()
  const queryClient = useQueryClient()
  const queryKey = queryKeys.projects.members(projectId)
  return useMutation({
    mutationFn: (memberId: string) => api.members.remove(memberId),
    onMutate: (memberId) => removeOptimistically<ProjectMember>(queryClient, queryKey, memberId),
    onError: (_error, _memberId, context) =>
      restoreRemoved(queryClient, queryKey, context?.removed),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
    meta: { errorMessage: "No se pudo eliminar al miembro" },
  })
}
