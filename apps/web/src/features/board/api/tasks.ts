import { useMemo } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { MoveTaskInput, Task, TaskInput } from "@repo/contracts"
import { applyMove, withAssignees } from "@repo/domain"
import { queryKeys, removeOptimistically, restoreRemoved, useApi } from "@/shared/api"
import { useMembers } from "@/features/project"
import type { TaskDraft } from "../types/board.types"
import { useBoardSync } from "./boardSync"

interface CreateTaskVariables {
  columnId: string
  draft: TaskDraft
}

interface UpdateTaskVariables {
  id: string
  draft: TaskDraft
}

export const useTasks = (projectId: string) => {
  const api = useApi()
  return useQuery({
    queryKey: queryKeys.projects.tasks(projectId),
    queryFn: () => api.tasks.listByProject(projectId),
    enabled: projectId !== "",
  })
}

/** Las tareas tal como las pinta el tablero: con el perfil de quien las tiene asignadas. */
export const useBoardTasks = (projectId: string) => {
  const tasks = useTasks(projectId)
  const { data: members = [] } = useMembers(projectId)
  const data = useMemo(
    () => (tasks.data ? withAssignees(tasks.data, members) : undefined),
    [tasks.data, members]
  )
  return { ...tasks, data }
}

const toInput = (draft: TaskDraft): TaskInput => ({
  content: draft.content,
  priority: draft.priority,
  size: draft.size,
  dueDate: draft.dueDate || null,
  assigneeId: draft.assigneeId ?? null,
})

export const useCreateTask = (projectId: string) => {
  const api = useApi()
  const queryClient = useQueryClient()
  const { mutationKey } = useBoardSync(projectId)
  return useMutation({
    mutationKey,
    mutationFn: ({ columnId, draft }: CreateTaskVariables) =>
      api.tasks.create({ projectId, columnId, ...toInput(draft) }),
    onSuccess: (task) =>
      queryClient.setQueryData<Task[]>(queryKeys.projects.tasks(projectId), (tasks) =>
        tasks ? [...tasks, task] : [task]
      ),
    meta: { errorMessage: "No se pudo crear la tarea" },
  })
}

export const useUpdateTask = (projectId: string) => {
  const api = useApi()
  const queryClient = useQueryClient()
  const { mutationKey, refetchWhenIdle } = useBoardSync(projectId)
  const queryKey = queryKeys.projects.tasks(projectId)
  const replace = (task: Task) =>
    queryClient.setQueryData<Task[]>(queryKey, (tasks) =>
      tasks?.map((candidate) => (candidate.id === task.id ? task : candidate))
    )
  return useMutation({
    mutationKey,
    mutationFn: ({ id, draft }: UpdateTaskVariables) => api.tasks.update(id, toInput(draft)),
    onMutate: async ({ id, draft }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Task[]>(queryKey)?.find((task) => task.id === id)
      if (previous) replace({ ...previous, ...toInput(draft) })
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) replace(context.previous)
    },
    onSettled: refetchWhenIdle,
    meta: { errorMessage: "No se pudo guardar la tarea" },
  })
}

export const useDeleteTask = (projectId: string) => {
  const api = useApi()
  const queryClient = useQueryClient()
  const { mutationKey, refetchWhenIdle } = useBoardSync(projectId)
  const queryKey = queryKeys.projects.tasks(projectId)
  return useMutation({
    mutationKey,
    mutationFn: (id: string) => api.tasks.remove(id),
    onMutate: (id) => removeOptimistically<Task>(queryClient, queryKey, id),
    onError: (_error, _id, context) => restoreRemoved(queryClient, queryKey, context?.removed),
    onSettled: refetchWhenIdle,
    meta: { errorMessage: "No se pudo eliminar la tarea" },
  })
}

export const useMoveTask = (projectId: string) => {
  const api = useApi()
  const queryClient = useQueryClient()
  const { mutationKey, isLastInFlight, refetchWhenIdle } = useBoardSync(projectId)
  const queryKey = queryKeys.projects.tasks(projectId)
  return useMutation({
    mutationKey,
    mutationFn: (move: MoveTaskInput) => api.tasks.move(move),
    onMutate: async (move) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<Task[]>(queryKey)
      queryClient.setQueryData<Task[]>(queryKey, (tasks) =>
        tasks ? applyMove(tasks, move) : tasks
      )
      return { previous }
    },
    // Con otro arrastre en vuelo, volver a la foto previa lo desharía también:
    // se espera a que termine el último y se recarga.
    onError: (_error, _move, context) => {
      if (isLastInFlight()) queryClient.setQueryData(queryKey, context?.previous)
    },
    onSettled: refetchWhenIdle,
    meta: { errorMessage: "No se pudo mover la tarea" },
  })
}
