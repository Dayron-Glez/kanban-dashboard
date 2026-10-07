import { describe, expect, it } from "vitest"
import {
  columnPositions,
  dropAtColumnEnd,
  dropNextToTask,
  moveTaskToColumn,
  reorderWithinColumn,
  tasksInColumn,
  type Placeable,
} from "../reorder"

type Task = Placeable

const task = (id: string, columnId: string): Task => ({ id, columnId })

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
    // Sin cambio, sin array nuevo: el tablero no escribe en la base de datos.
    const tasks = board()
    expect(moveTaskToColumn(tasks, "a1", "A", 2)).toBe(tasks)
  })

  it("es idempotente: repetir el movimiento no vuelve a tocar el array", () => {
    // Solo el movimiento que cambia de columna produce un array nuevo; repetirlo
    // no, y es esa referencia la que dice al tablero si hay algo que guardar.
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

describe("dropNextToTask", () => {
  it("coloca encima de la tarjeta al soltar por su borde superior", () => {
    expect(ids(dropNextToTask(board(), "a3", "a1", "top"), "A")).toEqual(["a3", "a1", "a2"])
  })

  it("coloca debajo de la tarjeta al soltar por su borde inferior", () => {
    expect(ids(dropNextToTask(board(), "a1", "a2", "bottom"), "A")).toEqual(["a2", "a1", "a3"])
  })

  it("baja hasta el final al soltar bajo la última tarjeta", () => {
    expect(ids(dropNextToTask(board(), "a1", "a3", "bottom"), "A")).toEqual(["a2", "a3", "a1"])
  })

  it("no cambia nada al soltar en el hueco que ya ocupa", () => {
    // Bajo la tarjeta anterior y sobre la siguiente es el mismo sitio.
    const tasks = board()
    expect(dropNextToTask(tasks, "a2", "a1", "bottom")).toBe(tasks)
    expect(dropNextToTask(tasks, "a2", "a3", "top")).toBe(tasks)
  })

  it("no cambia nada al soltar una tarea sobre sí misma", () => {
    const tasks = board()
    expect(dropNextToTask(tasks, "a1", "a1", "top")).toBe(tasks)
  })

  it("inserta encima en otra columna", () => {
    const next = dropNextToTask(board(), "a1", "b2", "top")
    expect(ids(next, "B")).toEqual(["b1", "a1", "b2", "b3"])
    expect(ids(next, "A")).toEqual(["a2", "a3"])
  })

  it("inserta debajo en otra columna", () => {
    expect(ids(dropNextToTask(board(), "a1", "b3", "bottom"), "B")).toEqual([
      "b1",
      "b2",
      "b3",
      "a1",
    ])
  })

  it("ignora ids inexistentes", () => {
    const tasks = board()
    expect(dropNextToTask(tasks, "nope", "a1", "top")).toBe(tasks)
    expect(dropNextToTask(tasks, "a1", "nope", "top")).toBe(tasks)
  })
})

describe("dropAtColumnEnd", () => {
  it("añade al final de otra columna", () => {
    expect(ids(dropAtColumnEnd(board(), "a1", "B"), "B")).toEqual(["b1", "b2", "b3", "a1"])
  })

  it("lleva al final dentro de la propia columna", () => {
    expect(ids(dropAtColumnEnd(board(), "a1", "A"), "A")).toEqual(["a2", "a3", "a1"])
  })

  it("no cambia nada si ya es la última de su columna", () => {
    const tasks = board()
    expect(dropAtColumnEnd(tasks, "a3", "A")).toBe(tasks)
  })

  it("acepta una columna vacía", () => {
    expect(ids(dropAtColumnEnd(board(), "a1", "C"), "C")).toEqual(["a1"])
  })
})

describe("columnPositions", () => {
  it("numera las posiciones densamente en el orden visible", () => {
    const next = moveTaskToColumn(board(), "a1", "B", 1)
    expect(columnPositions(next, "B").map(({ task, position }) => [task.id, position])).toEqual([
      ["b1", 0],
      ["a1", 1],
      ["b2", 2],
      ["b3", 3],
    ])
  })

  it("lleva la columna de destino en las tareas movidas", () => {
    const next = moveTaskToColumn(board(), "a1", "B", 0)
    expect(columnPositions(next, "B")[0]).toEqual({
      task: { id: "a1", columnId: "B" },
      position: 0,
    })
  })
})
