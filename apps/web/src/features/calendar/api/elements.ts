import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { DatePoint, SetElementRuleInput, UpdateElementPlanInput } from "@repo/contracts"
import { queryKeys, useApi } from "@/shared/api"

export const usePlan = (projectId: string) => {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.projects.plan(projectId),
    queryFn: () => api.elements.getPlan(projectId),
    enabled: projectId !== "",
  })
}

export const useGenerateFromTemplate = (projectId: string) => {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.elements.generateFromTemplate(projectId),
    // Devuelve los elementos, pero no las dependencias: el plan se vuelve a pedir.
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.plan(projectId) }),
    meta: { errorMessage: "No se pudo generar el calendario" },
  })
}

interface UpdatePlanVariables {
  elementId: string
  input: UpdateElementPlanInput
}

// Pesimista: un cambio puede mover muchas fechas, y solo el servidor las calcula.
export const useUpdatePlan = (projectId: string) => {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ elementId, input }: UpdatePlanVariables) =>
      api.elements.updatePlan(elementId, input),
    onSuccess: (plan) => queryClient.setQueryData(queryKeys.projects.plan(projectId), plan),
    meta: { errorMessage: "No se pudo guardar el cambio" },
  })
}

interface SetRuleVariables {
  elementId: string
  point: DatePoint
  input: SetElementRuleInput
}

export const useSetRule = (projectId: string) => {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ elementId, point, input }: SetRuleVariables) =>
      api.elements.setRule(elementId, point, input),
    onSuccess: (plan) => queryClient.setQueryData(queryKeys.projects.plan(projectId), plan),
    meta: { errorMessage: "No se pudo guardar la regla" },
  })
}

export const useRemoveRule = (projectId: string) => {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ elementId, point }: Omit<SetRuleVariables, "input">) =>
      api.elements.removeRule(elementId, point),
    onSuccess: (plan) => queryClient.setQueryData(queryKeys.projects.plan(projectId), plan),
    meta: { errorMessage: "No se pudo quitar la regla" },
  })
}
