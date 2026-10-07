import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys, useApi } from "@/shared/api"

export const useInvitationPreview = (token: string | undefined, enabled: boolean) => {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.invitations.byToken(token ?? ""),
    queryFn: () => api.invitations.findByToken(token ?? ""),
    enabled: enabled && Boolean(token),
  })
}

export const useAcceptInvitation = () => {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (token: string) => api.invitations.accept(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.mine() }),
    meta: { errorMessage: "No se pudo aceptar la invitación" },
  })
}
