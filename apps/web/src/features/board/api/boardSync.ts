import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/shared/api"

export const useBoardSync = (projectId: string) => {
  const queryClient = useQueryClient()
  const mutationKey = queryKeys.projects.board(projectId)

  const isLastInFlight = () => queryClient.isMutating({ mutationKey }) === 1

  const refetchWhenIdle = async () => {
    if (!isLastInFlight()) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.columns(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.tasks(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.history(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.assignedToMe() }),
    ])
  }

  return { mutationKey, isLastInFlight, refetchWhenIdle }
}
