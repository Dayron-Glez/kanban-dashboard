import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { queryKeys, useApi } from "@/shared/api"

export const useElements = (projectId: string) => {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.projects.elements(projectId),
    queryFn: () => api.elements.listByProject(projectId),
    enabled: projectId !== "",
  })
}

export const useGenerateFromTemplate = (projectId: string) => {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.elements.generateFromTemplate(projectId),
    onSuccess: (elements) =>
      queryClient.setQueryData(queryKeys.projects.elements(projectId), elements),
    meta: { errorMessage: "No se pudo generar el calendario" },
  })
}
