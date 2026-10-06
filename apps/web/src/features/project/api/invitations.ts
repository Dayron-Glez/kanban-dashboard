import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Invitation } from "@repo/contracts"
import { queryKeys, removeOptimistically, restoreRemoved, useApi } from "@/shared/api"

export const usePendingInvitations = (projectId: string) => {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.projects.invitations(projectId),
    queryFn: () => api.invitations.listPending(projectId),
  })
}

export const useInviteMember = (projectId: string) => {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => api.invitations.create({ projectId, email }),
    onSuccess: (invitation) =>
      queryClient.setQueryData<Invitation[]>(queryKeys.projects.invitations(projectId), (list) =>
        list ? [invitation, ...list] : [invitation]
      ),
    meta: { errorMessage: "No se pudo crear la invitación" },
  })
}

export const useCancelInvitation = (projectId: string) => {
  const api = useApi()
  const queryClient = useQueryClient()
  const queryKey = queryKeys.projects.invitations(projectId)
  return useMutation({
    mutationFn: (id: string) => api.invitations.cancel(id),
    onMutate: (id) => removeOptimistically<Invitation>(queryClient, queryKey, id),
    onError: (_error, _id, context) => restoreRemoved(queryClient, queryKey, context?.removed),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
    meta: { errorMessage: "No se pudo cancelar la invitación" },
  })
}
