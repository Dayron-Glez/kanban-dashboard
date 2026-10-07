import { act, renderHook, waitFor } from "@testing-library/react"
import { ApiError } from "@repo/api-client"
import type { Column, Task } from "@repo/contracts"
import { beforeEach, describe, expect, it } from "vitest"
import { queryKeys } from "@/shared/api"
import { createFakeApi, createTestQueryClient, createWrapper } from "@/shared/api/testing"
import { useDeleteColumn, useReorderColumns } from "../api/columns"
import { useMoveTask, useUpdateTask } from "../api/tasks"

const PROJECT_ID = "p1"

const task = (id: string, columnId: string, position: number): Task => ({
  id,
  projectId: PROJECT_ID,
  columnId,
  content: id,
  priority: "p2",
  size: "m",
  dueDate: null,
  position,
  assigneeId: null,
})

const column = (id: string, position: number): Column => ({
  id,
  projectId: PROJECT_ID,
  title: id,
  position,
})

const deferred = () => {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const tasksKey = queryKeys.projects.tasks(PROJECT_ID)
const columnsKey = queryKeys.projects.columns(PROJECT_ID)

let api: ReturnType<typeof createFakeApi>
let queryClient: ReturnType<typeof createTestQueryClient>
let wrapper: ReturnType<typeof createWrapper>

const inColumn = (columnId: string) =>
  (queryClient.getQueryData<Task[]>(tasksKey) ?? [])
    .filter((t) => t.columnId === columnId)
    .sort((a, b) => a.position - b.position)
    .map((t) => t.id)

const invalidated = () => queryClient.getQueryState(tasksKey)?.isInvalidated

beforeEach(() => {
  api = createFakeApi()
  queryClient = createTestQueryClient()
  wrapper = createWrapper(api, queryClient)
  queryClient.setQueryData(tasksKey, [task("a1", "A", 0), task("a2", "A", 1), task("b1", "B", 0)])
  queryClient.setQueryData(columnsKey, [column("A", 0), column("B", 1)])
})

describe("useMoveTask", () => {
  it("mueve la tarea en pantalla antes de que responda el servidor", async () => {
    const request = deferred()
    api.tasks.move.mockReturnValue(request.promise)
    const { result } = renderHook(() => useMoveTask(PROJECT_ID), { wrapper })

    act(() =>
      result.current.mutate({ taskId: "a1", toColumnId: "B", orderedTaskIds: ["b1", "a1"] })
    )

    await waitFor(() => expect(inColumn("B")).toEqual(["b1", "a1"]))
    expect(inColumn("A")).toEqual(["a2"])
    request.resolve()
  })

  it("si falla un arrastre aislado, la tarea vuelve a su sitio", async () => {
    api.tasks.move.mockRejectedValue(new ApiError("network", "fetch failed"))
    const { result } = renderHook(() => useMoveTask(PROJECT_ID), { wrapper })

    await act(() =>
      result.current
        .mutateAsync({ taskId: "a1", toColumnId: "B", orderedTaskIds: ["a1", "b1"] })
        .catch(() => {})
    )

    expect(inColumn("A")).toEqual(["a1", "a2"])
    expect(inColumn("B")).toEqual(["b1"])
  })

  it("con dos arrastres seguidos, el fallo del primero no deshace el segundo y solo recarga al final", async () => {
    const first = deferred()
    const second = deferred()
    api.tasks.move.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { result } = renderHook(() => useMoveTask(PROJECT_ID), { wrapper })

    act(() =>
      result.current.mutate({ taskId: "a1", toColumnId: "B", orderedTaskIds: ["a1", "b1"] })
    )
    act(() =>
      result.current.mutate({ taskId: "a2", toColumnId: "B", orderedTaskIds: ["a1", "b1", "a2"] })
    )
    await waitFor(() => expect(inColumn("B")).toEqual(["a1", "b1", "a2"]))

    await act(async () => first.reject(new ApiError("network", "fetch failed")))
    expect(inColumn("B")).toEqual(["a1", "b1", "a2"])
    expect(invalidated()).toBe(false)

    await act(async () => second.resolve())
    await waitFor(() => expect(invalidated()).toBe(true))
  })
})

describe("useUpdateTask", () => {
  it("una edición que termina con un arrastre en vuelo no recarga y pisa el arrastre", async () => {
    const move = deferred()
    api.tasks.move.mockReturnValue(move.promise)
    api.tasks.update.mockResolvedValue()
    const { result: moveHook } = renderHook(() => useMoveTask(PROJECT_ID), { wrapper })
    const { result: updateHook } = renderHook(() => useUpdateTask(PROJECT_ID), { wrapper })

    act(() =>
      moveHook.current.mutate({ taskId: "a1", toColumnId: "B", orderedTaskIds: ["a1", "b1"] })
    )
    await act(() =>
      updateHook.current.mutateAsync({
        id: "b1",
        draft: { content: "Editada", priority: "p0", size: "s" },
      })
    )

    expect(invalidated()).toBe(false)
    expect(inColumn("B")).toEqual(["a1", "b1"])
    move.resolve()
  })
})

describe("useDeleteColumn", () => {
  it("quita la columna y sus tareas, y las devuelve si el servidor falla", async () => {
    const request = deferred()
    api.columns.remove.mockReturnValue(request.promise)
    const { result } = renderHook(() => useDeleteColumn(PROJECT_ID), { wrapper })

    act(() => result.current.mutate("A"))
    await waitFor(() => expect(inColumn("A")).toEqual([]))
    expect(queryClient.getQueryData<Column[]>(columnsKey)?.map((c) => c.id)).toEqual(["B"])

    await act(async () => request.reject(new ApiError("forbidden", "0 filas")))

    await waitFor(() =>
      expect(queryClient.getQueryData<Column[]>(columnsKey)?.map((c) => c.id)).toEqual(["A", "B"])
    )
    expect(inColumn("A")).toEqual(["a1", "a2"])
  })
})

describe("useReorderColumns", () => {
  it("reordena en pantalla y llama a la RPC con el orden completo", async () => {
    api.columns.reorder.mockResolvedValue()
    const { result } = renderHook(() => useReorderColumns(PROJECT_ID), { wrapper })

    await act(() => result.current.mutateAsync(["B", "A"]))

    expect(api.columns.reorder).toHaveBeenCalledWith(PROJECT_ID, ["B", "A"])
    expect(queryClient.getQueryData<Column[]>(columnsKey)).toEqual([column("B", 0), column("A", 1)])
  })
})
