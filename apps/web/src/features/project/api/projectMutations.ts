import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { CreateProjectInput, ProjectSummary } from "@repo/contracts"
import { queryKeys, useApi } from "@/shared/api"
import { patchProject } from "./projectQueries"

// Todas comparten clave: así se sabe si queda otra en vuelo antes de recargar.
const mutationKey = queryKeys.projects.all

const useRefetchWhenIdle = () => {
  const queryClient = useQueryClient()
  // Recargar con otra mutación en curso pisaría su cambio optimista.
  return () =>
    queryClient.isMutating({ mutationKey }) === 1
      ? queryClient.invalidateQueries({ queryKey: queryKeys.projects.mine() })
      : undefined
}

export const useCreateProject = () => {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey,
    mutationFn: (input: CreateProjectInput) => api.projects.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.mine() }),
    meta: { errorMessage: "No se pudo crear el proyecto" },
  })
}

export const useDeleteProject = () => {
  const api = useApi()
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey,
    mutationFn: (id: string) => api.projects.remove(id),
    onSuccess: (_data, id) =>
      queryClient.setQueryData<ProjectSummary[]>(queryKeys.projects.mine(), (projects) =>
        projects?.filter((project) => project.id !== id)
      ),
    meta: { errorMessage: "No se pudo eliminar el proyecto" },
  })
}

interface RenameVariables {
  id: string
  name: string
}

export const useRenameProject = () => {
  const api = useApi()
  const queryClient = useQueryClient()
  const refetchWhenIdle = useRefetchWhenIdle()
  return useMutation({
    mutationKey,
    mutationFn: ({ id, name }: RenameVariables) => api.projects.rename(id, name),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.mine() })
      const previous = queryClient
        .getQueryData<ProjectSummary[]>(queryKeys.projects.mine())
        ?.find((project) => project.id === id)?.name
      patchProject(queryClient, id, { name })
      return { previous }
    },
    // Se deshace solo este cambio, no se restaura una foto de toda la lista:
    // eso se llevaría por delante otras mutaciones que hayan terminado bien.
    onError: (_error, { id }, context) => {
      if (context?.previous !== undefined) patchProject(queryClient, id, { name: context.previous })
    },
    onSettled: refetchWhenIdle,
    meta: { errorMessage: "No se pudo renombrar el proyecto" },
  })
}

interface FavoriteVariables {
  projectId: string
  isFavorite: boolean
}

export const useToggleFavorite = () => {
  const api = useApi()
  const queryClient = useQueryClient()
  const refetchWhenIdle = useRefetchWhenIdle()
  return useMutation({
    mutationKey,
    mutationFn: ({ projectId, isFavorite }: FavoriteVariables) =>
      api.projects.setFavorite(projectId, isFavorite),
    onMutate: async ({ projectId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.projects.mine() })
      patchProject(queryClient, projectId, { isFavorite })
    },
    onError: (_error, { projectId, isFavorite }) =>
      patchProject(queryClient, projectId, { isFavorite: !isFavorite }),
    onSettled: refetchWhenIdle,
    meta: { errorMessage: "No se pudo actualizar el favorito" },
  })
}
