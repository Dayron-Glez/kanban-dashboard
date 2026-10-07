import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Column, Task } from "@repo/contracts"
import { applyColumnOrder } from "@repo/domain"
import { queryKeys, useApi } from "@/shared/api"
import { useBoardSync } from "./boardSync"

interface RenameColumnVariables {
  id: string
  title: string
}

export const useColumns = (projectId: string) => {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.projects.columns(projectId),
    queryFn: () => api.columns.listByProject(projectId),
    enabled: projectId !== "",
  })
}

export const useCreateColumn = (projectId: string) => {
  const api = useApi()
  const queryClient = useQueryClient()
  const { mutationKey } = useBoardSync(projectId)
  return useMutation({
    mutationKey,
    mutationFn: (title: string) => api.columns.create({ projectId, title }),
    onSuccess: (column) =>
      queryClient.setQueryData<Column[]>(queryKeys.projects.columns(projectId), (columns) =>
        columns ? [...columns, column] : [column]
      ),
    meta: { errorMessage: "No se pudo crear la columna" },
  })
}

export const useRenameColumn = (projectId: string) => {
  const api = useApi()
  const queryClient = useQueryClient()
  const { mutationKey, refetchWhenIdle } = useBoardSync(projectId)
  const queryKey = queryKeys.projects.columns(projectId)
  const setTitle = (id: string, title: string) =>
    queryClient.setQueryData<Column[]>(queryKey, (columns) =>
      columns?.map((column) => (column.id === id ? { ...column, title } : column))
    )
  return useMutation({
    mutationKey,
    mutationFn: ({ id, title }: RenameColumnVariables) => api.columns.rename(id, title),
    onMutate: async ({ id, title }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient
        .getQueryData<Column[]>(queryKey)
        ?.find((column) => column.id === id)?.title
      setTitle(id, title)
      return { previous }
    },
    onError: (_error, { id }, context) => {
      if (context?.previous !== undefined) setTitle(id, context.previous)
    },
    onSettled: refetchWhenIdle,
    meta: { errorMessage: "No se pudo renombrar la columna" },
  })
}

export const useDeleteColumn = (projectId: string) => {
  const api = useApi()
  const queryClient = useQueryClient()
  const { mutationKey, refetchWhenIdle } = useBoardSync(projectId)
  const columnsKey = queryKeys.projects.columns(projectId)
  const tasksKey = queryKeys.projects.tasks(projectId)
  return useMutation({
    mutationKey,
    mutationFn: (id: string) => api.columns.remove(id),
    // La base borra las tareas en cascada: la pantalla también las quita.
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: columnsKey }),
        queryClient.cancelQueries({ queryKey: tasksKey }),
      ])
      const column = queryClient.getQueryData<Column[]>(columnsKey)?.find((c) => c.id === id)
      const tasks = queryClient.getQueryData<Task[]>(tasksKey)?.filter((t) => t.columnId === id)
      queryClient.setQueryData<Column[]>(columnsKey, (list) => list?.filter((c) => c.id !== id))
      queryClient.setQueryData<Task[]>(tasksKey, (list) => list?.filter((t) => t.columnId !== id))
      return { column, tasks }
    },
    onError: (_error, _id, context) => {
      const { column, tasks = [] } = context ?? {}
      if (column) {
        queryClient.setQueryData<Column[]>(columnsKey, (list) =>
          list && !list.some((c) => c.id === column.id)
            ? [...list, column].sort((a, b) => a.position - b.position)
            : list
        )
      }
      queryClient.setQueryData<Task[]>(tasksKey, (list) =>
        list ? [...list, ...tasks.filter((t) => !list.some((other) => other.id === t.id))] : list
      )
    },
    onSettled: refetchWhenIdle,
    meta: { errorMessage: "No se pudo eliminar la columna" },
  })
}

export const useReorderColumns = (projectId: string) => {
  const api = useApi()
  const queryClient = useQueryClient()
  const { mutationKey, isLastInFlight, refetchWhenIdle } = useBoardSync(projectId)
  const queryKey = queryKeys.projects.columns(projectId)
  return useMutation({
    mutationKey,
    mutationFn: (orderedColumnIds: string[]) => api.columns.reorder(projectId, orderedColumnIds),
    onMutate: async (orderedColumnIds) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Column[]>(queryKey)
      queryClient.setQueryData<Column[]>(queryKey, (columns) =>
        columns ? applyColumnOrder(columns, orderedColumnIds) : columns
      )
      return { previous }
    },
    // Con otro cambio en vuelo, volver a la foto previa lo desharía también:
    // se espera a que termine el último y se recarga.
    onError: (_error, _ids, context) => {
      if (isLastInFlight()) queryClient.setQueryData(queryKey, context?.previous)
    },
    onSettled: refetchWhenIdle,
    meta: { errorMessage: "No se pudo guardar el orden de las columnas" },
  })
}
