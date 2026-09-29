import { describe, expect, it } from "vitest"
import { buildRows, filterRows, sortRows, type TaskRow } from "../lib/taskTable"
import type { ColumnType, Task } from "../types/board.types"

const columns: ColumnType[] = [
  { id: "c1", title: "En curso", project_id: "p", position: 0 },
  { id: "c2", title: "Aprobado", project_id: "p", position: 1 },
]

const task = (over: Partial<Task> = {}): Task => ({
  id: "t",
  content: "Tarea",
  priority: "p2",
  size: "m",
  due_date: null,
  columnId: "c1",
  project_id: "p",
  position: 0,
  assignee_id: null,
  assigneeProfile: null,
  ...over,
})

const row = (over: Partial<TaskRow> = {}): TaskRow => ({
  id: "t",
  content: "Tarea",
  columnId: "c1",
  columnTitle: "En curso",
  columnPosition: 0,
  priority: "p2",
  size: "m",
  assignee: null,
  dueDate: null,
  ...over,
})

const ids = (rows: TaskRow[]) => rows.map((r) => r.id)

describe("buildRows", () => {
  it("resuelve el título y la posición de la columna", () => {
    const [r] = buildRows([task({ columnId: "c2" })], columns)
    expect(r).toMatchObject({ columnTitle: "Aprobado", columnPosition: 1 })
  })

  it("prefiere el nombre del asignado y cae al email", () => {
    const conNombre = buildRows(
      [task({ assigneeProfile: { full_name: "Ana Ruiz", email: "a@b.c", avatar_url: null } })],
      columns
    )
    expect(conNombre[0].assignee).toBe("Ana Ruiz")

    const soloEmail = buildRows(
      [task({ assigneeProfile: { full_name: null, email: "a@b.c", avatar_url: null } })],
      columns
    )
    expect(soloEmail[0].assignee).toBe("a@b.c")
  })

  it("deja el asignado en null cuando no hay nadie", () => {
    expect(buildRows([task()], columns)[0].assignee).toBeNull()
  })

  it("no se rompe si la tarea apunta a una columna que ya no existe", () => {
    const [r] = buildRows([task({ columnId: "fantasma" })], columns)
    expect(r.columnTitle).toBe("")
    expect(r.columnPosition).toBe(Number.MAX_SAFE_INTEGER)
  })
})

describe("sortRows", () => {
  it("ordena por prioridad, no alfabéticamente", () => {
    const rows = [row({ id: "b", priority: "p2" }), row({ id: "a", priority: "p0" })]
    expect(ids(sortRows(rows, "priority", "asc"))).toEqual(["a", "b"])
    expect(ids(sortRows(rows, "priority", "desc"))).toEqual(["b", "a"])
  })

  it("ordena los tamaños de menor a mayor, no por letra", () => {
    const rows = [row({ id: "xl", size: "xl" }), row({ id: "xs", size: "xs" })]
    expect(ids(sortRows(rows, "size", "asc"))).toEqual(["xs", "xl"])
  })

  it("ordena las columnas por su sitio en el tablero", () => {
    // "Aprobado" es alfabéticamente antes, pero va después en el tablero.
    const rows = [
      row({ id: "aprobado", columnTitle: "Aprobado", columnPosition: 1 }),
      row({ id: "curso", columnTitle: "En curso", columnPosition: 0 }),
    ]
    expect(ids(sortRows(rows, "column", "asc"))).toEqual(["curso", "aprobado"])
  })

  it("ordena las fechas cronológicamente", () => {
    const rows = [
      row({ id: "tarde", dueDate: "2026-12-01" }),
      row({ id: "pronto", dueDate: "2026-09-01" }),
    ]
    expect(ids(sortRows(rows, "dueDate", "asc"))).toEqual(["pronto", "tarde"])
    expect(ids(sortRows(rows, "dueDate", "desc"))).toEqual(["tarde", "pronto"])
  })

  it("deja las tareas sin fecha al final en los dos sentidos", () => {
    const rows = [
      row({ id: "sin" }),
      row({ id: "tarde", dueDate: "2026-12-01" }),
      row({ id: "pronto", dueDate: "2026-09-01" }),
    ]
    expect(ids(sortRows(rows, "dueDate", "asc"))).toEqual(["pronto", "tarde", "sin"])
    expect(ids(sortRows(rows, "dueDate", "desc"))).toEqual(["tarde", "pronto", "sin"])
  })

  it("deja las tareas sin asignar al final en los dos sentidos", () => {
    const rows = [
      row({ id: "sin" }),
      row({ id: "ana", assignee: "Ana" }),
      row({ id: "zoe", assignee: "Zoe" }),
    ]
    expect(ids(sortRows(rows, "assignee", "asc"))).toEqual(["ana", "zoe", "sin"])
    expect(ids(sortRows(rows, "assignee", "desc"))).toEqual(["zoe", "ana", "sin"])
  })

  it("conserva el orden de entrada en los empates", () => {
    const rows = [row({ id: "1" }), row({ id: "2" }), row({ id: "3" })]
    expect(ids(sortRows(rows, "priority", "asc"))).toEqual(["1", "2", "3"])
  })

  it("no modifica el array recibido", () => {
    const rows = [row({ id: "b", priority: "p2" }), row({ id: "a", priority: "p0" })]
    sortRows(rows, "priority", "asc")
    expect(ids(rows)).toEqual(["b", "a"])
  })

  it("compara el contenido respetando los acentos", () => {
    const rows = [row({ id: "z", content: "Zapato" }), row({ id: "a", content: "Ábaco" })]
    expect(ids(sortRows(rows, "content", "asc"))).toEqual(["a", "z"])
  })
})

describe("filterRows", () => {
  it("filtra por contenido sin distinguir mayúsculas", () => {
    const rows = [
      row({ id: "a", content: "Migrar formularios" }),
      row({ id: "b", content: "Otra cosa" }),
    ]
    expect(ids(filterRows(rows, "MIGRAR"))).toEqual(["a"])
  })

  it("devuelve todo con el filtro vacío", () => {
    const rows = [row({ id: "a" }), row({ id: "b" })]
    expect(filterRows(rows, "   ")).toBe(rows)
  })
})
