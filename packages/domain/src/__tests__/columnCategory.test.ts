import type { Column, Task, TaskHistoryEntry } from "@repo/contracts"
import { describe, expect, it } from "vitest"
import { computeAnalytics } from "../analytics"
import { applyCategory, doneColumnId } from "../columnCategory"

const column = (id: string, category: Column["category"], position = 0): Column => ({
  id,
  projectId: "p",
  title: id,
  position,
  category,
})

const task = (id: string, columnId: string, priority: Task["priority"] = "p2"): Task => ({
  id,
  projectId: "p",
  columnId,
  content: id,
  priority,
  size: "m",
  dueDate: null,
  position: 0,
  assigneeId: null,
})

const moved = (id: string, toColumnId: string, movedAt: string): TaskHistoryEntry => ({
  id,
  taskId: "t1",
  taskContent: "Rodar plano 12",
  fromColumnId: null,
  toColumnId,
  movedAt,
})

describe("doneColumnId", () => {
  it("devuelve la columna terminada", () => {
    expect(doneColumnId([column("a", "todo"), column("b", "done")])).toBe("b")
  })

  it("no depende del título: «Publicado» cuenta si su categoría es done", () => {
    const publicado: Column = { ...column("x", "done"), title: "Publicado" }
    expect(doneColumnId([publicado])).toBe("x")
  })

  it("devuelve undefined si no hay ninguna", () => {
    expect(doneColumnId([column("a", "todo")])).toBeUndefined()
  })
})

describe("applyCategory", () => {
  it("cambia la categoría de la columna indicada", () => {
    const next = applyCategory([column("a", "todo"), column("b", "doing")], "a", "blocked")
    expect(next.map((c) => c.category)).toEqual(["blocked", "doing"])
  })

  it("al marcar otra como hecha, la anterior pasa a en curso", () => {
    const next = applyCategory([column("a", "doing"), column("b", "done")], "a", "done")
    expect(next.map((c) => c.category)).toEqual(["done", "doing"])
  })

  it("quitar la hecha deja el proyecto sin ninguna", () => {
    const next = applyCategory([column("a", "todo"), column("b", "done")], "b", "doing")
    expect(doneColumnId(next)).toBeUndefined()
  })
})

describe("computeAnalytics", () => {
  const now = new Date("2026-10-07T12:00:00Z")
  const columns = [column("todo", "todo", 0), { ...column("pub", "done", 1), title: "Publicado" }]

  it("mide el progreso con la columna de categoría done, se llame como se llame", () => {
    const result = computeAnalytics(
      columns,
      [task("t1", "pub"), task("t2", "todo"), task("t3", "todo")],
      [],
      now
    )

    expect(result.hasDoneColumn).toBe(true)
    expect(result.stats).toMatchObject({ totalTasks: 3, doneTasks: 1, progressPercent: 33 })
  })

  it("avisa de que no se puede medir si no hay columna terminada", () => {
    const result = computeAnalytics([column("todo", "todo")], [task("t1", "todo")], [], now)

    expect(result.hasDoneColumn).toBe(false)
    expect(result.stats.progressPercent).toBe(0)
  })

  it("cuenta la velocidad por semana con lo que llegó a la columna terminada", () => {
    const result = computeAnalytics(
      columns,
      [],
      [
        moved("h1", "pub", "2026-10-06T10:00:00Z"),
        moved("h2", "todo", "2026-10-06T11:00:00Z"),
        moved("h3", "pub", "2026-09-29T10:00:00Z"),
      ],
      now
    )

    expect(result.velocityData).toHaveLength(8)
    expect(result.velocityData.at(-1)).toEqual({ week: "Sem 41", tareas: 1 })
    expect(result.velocityData.at(-2)).toEqual({ week: "Sem 40", tareas: 1 })
  })

  it("agrupa las tareas por prioridad", () => {
    const result = computeAnalytics(
      columns,
      [task("t1", "todo", "p0"), task("t2", "todo", "p0"), task("t3", "todo", "p2")],
      [],
      now
    )

    expect(result.priorityData).toEqual([
      { prioridad: "Urgente", tareas: 2 },
      { prioridad: "Normal", tareas: 0 },
      { prioridad: "Baja", tareas: 1 },
    ])
  })

  it("traduce los movimientos a títulos y fecha relativa", () => {
    const result = computeAnalytics(columns, [], [moved("h1", "pub", "2026-10-07T11:00:00Z")], now)

    expect(result.activityItems[0]).toMatchObject({
      toColumnTitle: "Publicado",
      fromColumnTitle: null,
      movedAtRelative: "hace alrededor de 1 hora",
    })
  })
})
