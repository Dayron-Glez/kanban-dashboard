import { renderHook, waitFor } from "@testing-library/react"
import type { Column, Task, TaskHistoryEntry } from "@repo/contracts"
import { beforeEach, describe, expect, it } from "vitest"
import { createFakeApi, createWrapper } from "@/shared/api/testing"
import { useAnalytics } from "../hooks/useAnalytics"

const PROJECT_ID = "p1"

const column = (id: string, title: string, position: number): Column => ({
  id,
  projectId: PROJECT_ID,
  title,
  position,
})

const task = (id: string, columnId: string, priority: Task["priority"]): Task => ({
  id,
  projectId: PROJECT_ID,
  columnId,
  content: id,
  priority,
  size: "m",
  dueDate: null,
  position: 0,
  assigneeId: null,
})

const moved = (id: string, toColumnId: string, fromColumnId: string | null): TaskHistoryEntry => ({
  id,
  taskId: "t1",
  taskContent: "Localizar exteriores",
  fromColumnId,
  toColumnId,
  movedAt: new Date().toISOString(),
})

let api: ReturnType<typeof createFakeApi>

beforeEach(() => {
  api = createFakeApi()
  api.columns.listByProject.mockResolvedValue([
    column("todo", "Backlog", 0),
    column("done", "Done", 1),
  ])
  api.tasks.listByProject.mockResolvedValue([
    task("t1", "done", "p0"),
    task("t2", "todo", "p0"),
    task("t3", "todo", "p2"),
  ])
  api.history.listByProject.mockResolvedValue([
    moved("h2", "done", "todo"),
    moved("h1", "todo", null),
  ])
})

describe("useAnalytics", () => {
  it("pide el historial del proyecto, no el de todos", async () => {
    const { result } = renderHook(() => useAnalytics(PROJECT_ID), { wrapper: createWrapper(api) })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(api.history.listByProject).toHaveBeenCalledWith(PROJECT_ID)
  })

  it("calcula el progreso y las prioridades a partir de tareas y columnas", async () => {
    const { result } = renderHook(() => useAnalytics(PROJECT_ID), { wrapper: createWrapper(api) })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.stats).toEqual({
      totalTasks: 3,
      doneTasks: 1,
      progressPercent: 33,
      totalMoved: 2,
    })
    expect(result.current.priorityData).toEqual([
      { prioridad: "Urgente", tareas: 2 },
      { prioridad: "Normal", tareas: 0 },
      { prioridad: "Baja", tareas: 1 },
    ])
  })

  it("traduce los movimientos a títulos de columna para la actividad", async () => {
    const { result } = renderHook(() => useAnalytics(PROJECT_ID), { wrapper: createWrapper(api) })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.activityItems.map((a) => [a.fromColumnTitle, a.toColumnTitle])).toEqual([
      ["Backlog", "Done"],
      [null, "Backlog"],
    ])
  })

  it("cuenta en la semana actual lo que llegó a la columna terminada", async () => {
    const { result } = renderHook(() => useAnalytics(PROJECT_ID), { wrapper: createWrapper(api) })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.velocityData).toHaveLength(8)
    expect(result.current.velocityData.at(-1)?.tareas).toBe(1)
  })
})
