import { beforeEach, describe, expect, it } from "vitest"
import {
  DEFAULT_GANTT_FIELDS,
  loadGanttFields,
  saveGanttFields,
  tableLayout,
} from "../lib/ganttFields"

beforeEach(() => localStorage.clear())

describe("campos visibles del Gantt", () => {
  it("de serie: las tres filas de la cabecera y la duración", () => {
    expect(loadGanttFields()).toEqual(DEFAULT_GANTT_FIELDS)
  })

  it("se recuerda lo elegido, y lo que falte se completa con lo de serie", () => {
    saveGanttFields({ ...DEFAULT_GANTT_FIELDS, start: true, month: false })
    expect(loadGanttFields()).toEqual({ ...DEFAULT_GANTT_FIELDS, start: true, month: false })

    localStorage.setItem("cauce.gantt.campos", JSON.stringify({ end: true }))
    expect(loadGanttFields()).toEqual({ ...DEFAULT_GANTT_FIELDS, end: true })
  })

  it("si lo guardado no se puede leer, vuelve a lo de serie", () => {
    localStorage.setItem("cauce.gantt.campos", "{roto")
    expect(loadGanttFields()).toEqual(DEFAULT_GANTT_FIELDS)
  })

  it("la tabla crece con cada columna que se enseña", () => {
    expect(tableLayout(DEFAULT_GANTT_FIELDS)).toEqual({
      gridTemplateColumns: "minmax(0,1fr) 6.5rem",
      width: "24rem",
    })
    expect(tableLayout({ ...DEFAULT_GANTT_FIELDS, start: true, end: true })).toEqual({
      gridTemplateColumns: "minmax(0,1fr) 6.5rem 7rem 7rem",
      width: "38rem",
    })
  })
})
