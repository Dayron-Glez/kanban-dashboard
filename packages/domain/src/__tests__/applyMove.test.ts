import { describe, expect, it } from "vitest"
import { applyColumnOrder, applyMove, type Positioned } from "../applyMove"

const t = (id: string, columnId: string, position: number): Positioned => ({
  id,
  columnId,
  position,
})

const board = (): Positioned[] => [
  t("a1", "A", 0),
  t("a2", "A", 1),
  t("a3", "A", 2),
  t("b1", "B", 0),
  t("b2", "B", 1),
]

const column = (tasks: Positioned[], columnId: string) =>
  tasks
    .filter((task) => task.columnId === columnId)
    .sort((x, y) => x.position - y.position)
    .map((task) => `${task.id}:${task.position}`)

describe("applyMove", () => {
  it("mueve a otra columna en el orden indicado y renumera el origen sin huecos", () => {
    const next = applyMove(board(), {
      taskId: "a1",
      toColumnId: "B",
      orderedTaskIds: ["b1", "a1", "b2"],
    })

    expect(column(next, "B")).toEqual(["b1:0", "a1:1", "b2:2"])
    expect(column(next, "A")).toEqual(["a2:0", "a3:1"])
  })

  it("reordena dentro de la misma columna", () => {
    const next = applyMove(board(), {
      taskId: "a3",
      toColumnId: "A",
      orderedTaskIds: ["a3", "a1", "a2"],
    })

    expect(column(next, "A")).toEqual(["a3:0", "a1:1", "a2:2"])
    expect(column(next, "B")).toEqual(["b1:0", "b2:1"])
  })

  it("deja detrás, en su orden, las tareas de destino que no vienen en la lista", () => {
    const next = applyMove(board(), { taskId: "a1", toColumnId: "B", orderedTaskIds: ["a1"] })

    expect(column(next, "B")).toEqual(["a1:0", "b1:1", "b2:2"])
  })

  it("ignora los ids de la lista que no son de la columna de destino", () => {
    const next = applyMove(board(), {
      taskId: "a1",
      toColumnId: "B",
      orderedTaskIds: ["a2", "a1", "b1", "b2"],
    })

    expect(column(next, "B")).toEqual(["a1:0", "b1:1", "b2:2"])
    expect(column(next, "A")).toEqual(["a2:0", "a3:1"])
  })

  it("devuelve el mismo array si la tarea no existe", () => {
    const tasks = board()
    expect(applyMove(tasks, { taskId: "x", toColumnId: "B", orderedTaskIds: [] })).toBe(tasks)
  })

  it("en el array, cada columna queda en su orden visible", () => {
    const next = applyMove(board(), {
      taskId: "b2",
      toColumnId: "A",
      orderedTaskIds: ["a1", "b2", "a2", "a3"],
    })

    expect(next.filter((task) => task.columnId === "A").map((task) => task.id)).toEqual([
      "a1",
      "b2",
      "a2",
      "a3",
    ])
  })
})

describe("applyColumnOrder", () => {
  it("ordena y renumera las columnas", () => {
    const columns = [
      { id: "c1", position: 0 },
      { id: "c2", position: 1 },
      { id: "c3", position: 2 },
    ]

    expect(applyColumnOrder(columns, ["c3", "c1", "c2"])).toEqual([
      { id: "c3", position: 0 },
      { id: "c1", position: 1 },
      { id: "c2", position: 2 },
    ])
  })
})
