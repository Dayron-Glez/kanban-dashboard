import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  DUE_STATE_ORDER,
  formatDueFull,
  formatDueLabel,
  getDueState,
  groupByDueState,
} from "../lib/dueDate"

/**
 * Todo se mide contra un "hoy" fijo. Sin congelar el reloj, un test que hoy
 * pasa fallaría el día que la fecha elegida quede a otra distancia.
 */
const HOY = new Date(2026, 8, 8, 13, 30) // 8 de septiembre de 2026, media tarde

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(HOY)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("getDueState", () => {
  it("clasifica una fecha pasada como atrasada", () => {
    expect(getDueState("2026-09-07")).toBe("overdue")
  })

  it("clasifica la fecha de hoy como hoy, aunque ya sea por la tarde", () => {
    // Se compara por días de calendario: a las 13:30 la tarea de hoy no está
    // atrasada todavía.
    expect(getDueState("2026-09-08")).toBe("today")
  })

  it("clasifica los próximos siete días como esta semana", () => {
    expect(getDueState("2026-09-09")).toBe("soon")
    expect(getDueState("2026-09-15")).toBe("soon")
  })

  it("clasifica a partir del octavo día como más adelante", () => {
    expect(getDueState("2026-09-16")).toBe("later")
  })

  it("trata la ausencia de fecha como sin fecha", () => {
    expect(getDueState(null)).toBe("none")
    expect(getDueState(undefined)).toBe("none")
    expect(getDueState("")).toBe("none")
  })

  it("cruza el cambio de mes sin equivocarse", () => {
    vi.setSystemTime(new Date(2026, 8, 30, 23, 0)) // 30 de septiembre
    expect(getDueState("2026-10-01")).toBe("soon")
    expect(getDueState("2026-09-29")).toBe("overdue")
  })

  it("cruza el cambio de año sin equivocarse", () => {
    vi.setSystemTime(new Date(2026, 11, 31, 10, 0)) // 31 de diciembre
    expect(getDueState("2027-01-01")).toBe("soon")
    expect(getDueState("2026-12-31")).toBe("today")
    expect(getDueState("2026-12-30")).toBe("overdue")
  })
})

describe("formatDueLabel", () => {
  it("usa palabras para los días cercanos", () => {
    expect(formatDueLabel("2026-09-08")).toBe("Hoy")
    expect(formatDueLabel("2026-09-09")).toBe("Mañana")
    expect(formatDueLabel("2026-09-07")).toBe("Ayer")
  })

  it("cuenta los días en ambos sentidos", () => {
    expect(formatDueLabel("2026-09-11")).toBe("En 3 días")
    expect(formatDueLabel("2026-09-05")).toBe("Hace 3 días")
  })

  it("cae a fecha corta cuando queda lejos", () => {
    expect(formatDueLabel("2026-10-20")).toBe("20 oct")
  })

  it("dice «Sin fecha» cuando no hay ninguna", () => {
    expect(formatDueLabel(null)).toBe("Sin fecha")
  })
})

describe("formatDueFull", () => {
  it("escribe la fecha completa en español", () => {
    expect(formatDueFull("2026-09-08")).toBe("8 de septiembre de 2026")
  })
})

describe("groupByDueState", () => {
  const tareas = [
    { id: "lejana", due_date: "2026-12-01" },
    { id: "atrasada", due_date: "2026-09-01" },
    { id: "sin-fecha", due_date: null },
    { id: "hoy", due_date: "2026-09-08" },
    { id: "semana", due_date: "2026-09-10" },
  ]

  it("agrupa en el orden de urgencia, no en el de entrada", () => {
    expect(groupByDueState(tareas).map((g) => g.state)).toEqual(DUE_STATE_ORDER)
  })

  it("mete cada tarea en su grupo", () => {
    const porEstado = Object.fromEntries(
      groupByDueState(tareas).map((g) => [g.state, g.items.map((i) => i.id)])
    )
    expect(porEstado).toEqual({
      overdue: ["atrasada"],
      today: ["hoy"],
      soon: ["semana"],
      later: ["lejana"],
      none: ["sin-fecha"],
    })
  })

  it("conserva el orden de entrada dentro de cada grupo", () => {
    const dos = [
      { id: "b", due_date: "2026-09-12" },
      { id: "a", due_date: "2026-09-10" },
    ]
    expect(groupByDueState(dos)[0].items.map((i) => i.id)).toEqual(["b", "a"])
  })

  it("omite los grupos vacíos", () => {
    const solo = [{ id: "x", due_date: null }]
    expect(groupByDueState(solo).map((g) => g.state)).toEqual(["none"])
  })

  it("devuelve una lista vacía sin tareas", () => {
    expect(groupByDueState([])).toEqual([])
  })
})
