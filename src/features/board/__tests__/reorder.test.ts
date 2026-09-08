import { describe, expect, it } from "vitest"
import {
  applyDrop,
  columnPositionRows,
  moveTaskToColumn,
  reorderWithinColumn,
  tasksInColumn,
} from "../lib/reorder"
import type { Task } from "../types/board.types"

/** Tarea mínima: la reordenación solo mira `id` y `columnId`. */
const task = (id: string, columnId: string): Task => ({
  id,
  content: id,
  priority: "p2",
  size: "m",
  columnId,
  project_id: "proj",
  position: 0,
  assignee_id: null,
  assigneeProfile: null,
})

/** Tablero de dos columnas: A con tres tareas, B con tres. */
const board = (): Task[] => [
  task("a1", "A"),
  task("a2", "A"),
  task("a3", "A"),
  task("b1", "B"),
  task("b2", "B"),
  task("b3", "B"),
]

const ids = (tasks: Task[], columnId: string): string[] =>
  tasksInColumn(tasks, columnId).map((t) => t.id)

describe("reorderWithinColumn", () => {
  it("mueve hacia abajo dejando la tarea en el hueco de la de destino", () => {
    expect(ids(reorderWithinColumn(board(), "a1", "a3"), "A")).toEqual(["a2", "a3", "a1"])
  })

  it("mueve hacia arriba dejando la tarea en el hueco de la de destino", () => {
    expect(ids(reorderWithinColumn(board(), "a3", "a1"), "A")).toEqual(["a3", "a1", "a2"])
  })

  it("no altera las otras columnas", () => {
    expect(ids(reorderWithinColumn(board(), "a1", "a3"), "B")).toEqual(["b1", "b2", "b3"])
  })

  it("devuelve el mismo array si la tarea ya está en su sitio", () => {
    const tasks = board()
    expect(reorderWithinColumn(tasks, "a1", "a1")).toBe(tasks)
  })

  it("ignora destinos de otra columna", () => {
    const tasks = board()
    expect(reorderWithinColumn(tasks, "a1", "b2")).toBe(tasks)
  })

  it("ignora ids inexistentes", () => {
    const tasks = board()
    expect(reorderWithinColumn(tasks, "nope", "a1")).toBe(tasks)
    expect(reorderWithinColumn(tasks, "a1", "nope")).toBe(tasks)
  })

  it("funciona con el array global desordenado por columnas", () => {
    // Tras varios movimientos entre columnas el array deja de estar agrupado.
    const tasks = [task("b1", "B"), task("a1", "A"), task("b2", "B"), task("a2", "A")]
    const next = reorderWithinColumn(tasks, "a1", "a2")
    expect(ids(next, "A")).toEqual(["a2", "a1"])
    expect(ids(next, "B")).toEqual(["b1", "b2"])
  })
})

describe("moveTaskToColumn", () => {
  it("inserta en la posición indicada, no al final", () => {
    // La regresión: arrastrar a1 sobre b3 la dejaba detrás de b3.
    const next = moveTaskToColumn(board(), "a1", "B", 2)
    expect(ids(next, "B")).toEqual(["b1", "b2", "a1", "b3"])
  })

  it("inserta al principio", () => {
    expect(ids(moveTaskToColumn(board(), "a1", "B", 0), "B")).toEqual(["a1", "b1", "b2", "b3"])
  })

  it("añade al final cuando la posición desborda la columna", () => {
    expect(ids(moveTaskToColumn(board(), "a1", "B", 99), "B")).toEqual(["b1", "b2", "b3", "a1"])
  })

  it("saca la tarea de su columna de origen sin tocar el resto", () => {
    const next = moveTaskToColumn(board(), "a2", "B", 1)
    expect(ids(next, "A")).toEqual(["a1", "a3"])
    expect(ids(next, "B")).toEqual(["b1", "a2", "b2", "b3"])
  })

  it("acepta una columna vacía", () => {
    const next = moveTaskToColumn(board(), "a1", "C", 0)
    expect(ids(next, "C")).toEqual(["a1"])
    expect(ids(next, "A")).toEqual(["a2", "a3"])
  })

  it("devuelve el mismo array si la tarea ya está en esa columna", () => {
    // Es lo que corta el bucle de onDragOver: sin cambio, sin render.
    const tasks = board()
    expect(moveTaskToColumn(tasks, "a1", "A", 2)).toBe(tasks)
  })

  it("es idempotente: repetir el movimiento no vuelve a tocar el array", () => {
    // La invariante que impide el bucle de renders. onDragOver se dispara en
    // cada movimiento del puntero, y solo el primero, el que cambia de
    // columna, puede devolver un array nuevo. Si alguno más lo hiciera, el DOM
    // se reordenaría, dnd-kit recalcularía colisiones y volvería a entrar.
    const first = moveTaskToColumn(board(), "a1", "B", 1)
    expect(moveTaskToColumn(first, "a1", "B", 1)).toBe(first)
    expect(moveTaskToColumn(first, "a1", "B", 99)).toBe(first)
  })

  it("ignora ids inexistentes", () => {
    const tasks = board()
    expect(moveTaskToColumn(tasks, "nope", "B", 0)).toBe(tasks)
  })

  it("no pierde ni duplica tareas", () => {
    const next = moveTaskToColumn(board(), "a2", "B", 1)
    expect(next).toHaveLength(6)
    expect(new Set(next.map((t) => t.id)).size).toBe(6)
  })
})

describe("applyDrop", () => {
  it("reordena cuando se suelta sobre una tarea de la misma columna", () => {
    expect(ids(applyDrop(board(), "a1", "a3", true), "A")).toEqual(["a2", "a3", "a1"])
  })

  it("coloca en el hueco cuando se suelta sobre una tarea de otra columna", () => {
    // onDragOver no llegó a mover la tarea antes del pointerup.
    const next = applyDrop(board(), "a1", "b2", true)
    expect(ids(next, "B")).toEqual(["b1", "a1", "b2", "b3"])
    expect(ids(next, "A")).toEqual(["a2", "a3"])
  })

  it("añade al final cuando se suelta sobre el cuerpo de una columna", () => {
    expect(ids(applyDrop(board(), "a1", "B", false), "B")).toEqual(["b1", "b2", "b3", "a1"])
  })

  it("no cambia nada al soltar sobre la propia columna", () => {
    const tasks = board()
    expect(applyDrop(tasks, "a1", "A", false)).toBe(tasks)
  })

  it("no cambia nada al soltar una tarea sobre sí misma", () => {
    const tasks = board()
    expect(applyDrop(tasks, "a1", "a1", true)).toBe(tasks)
  })
})

describe("columnPositionRows", () => {
  it("numera las posiciones densamente en el orden visible", () => {
    const next = moveTaskToColumn(board(), "a1", "B", 1)
    expect(columnPositionRows(next, "B").map((row) => [row.id, row.position])).toEqual([
      ["b1", 0],
      ["a1", 1],
      ["b2", 2],
      ["b3", 3],
    ])
  })

  it("persiste la columna de destino en las filas movidas", () => {
    const next = moveTaskToColumn(board(), "a1", "B", 0)
    expect(columnPositionRows(next, "B")[0]).toMatchObject({ id: "a1", column_id: "B" })
  })
})
