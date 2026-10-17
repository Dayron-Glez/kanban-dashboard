import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { CreateCrewMemberInput, CrewMember } from "@repo/contracts"
import { queryKeys, useApi } from "@/shared/api"

export const useCrew = (projectId: string) => {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.projects.crew(projectId),
    queryFn: () => api.crew.listByProject(projectId),
    enabled: projectId !== "",
  })
}

export const useDepartments = (projectId: string) => {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.projects.departments(projectId),
    queryFn: () => api.departments.listByProject(projectId),
    enabled: projectId !== "",
  })
}

// Pesimista: hace falta el id del servidor para asignarla.
export const useCreateCrewMember = (projectId: string) => {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCrewMemberInput) => api.crew.create(projectId, input),
    onSuccess: (member) =>
      queryClient.setQueryData<CrewMember[]>(queryKeys.projects.crew(projectId), (crew) => [
        ...(crew ?? []),
        member,
      ]),
    meta: { errorMessage: "No se pudo añadir al equipo" },
  })
}
