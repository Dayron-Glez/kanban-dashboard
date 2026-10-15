import { beforeEach, describe, expect, it } from "vitest"
import {
  DEFAULT_GANTT_FIELDS,
  loadGanttFields,
  saveGanttFields,
  loadNameWidth,
  NAME_WIDTH,
  saveNameWidth,
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

  it("la tabla crece con cada columna que se enseña, y con el ancho de «Elemento»", () => {
    expect(tableLayout(DEFAULT_GANTT_FIELDS)).toEqual({
      gridTemplateColumns: "minmax(0,1fr) 6.5rem",
      width: "calc(280px + 6.5rem)",
    })
    expect(tableLayout({ ...DEFAULT_GANTT_FIELDS, start: true, end: true }, 360)).toEqual({
      gridTemplateColumns: "minmax(0,1fr) 6.5rem 7rem 7rem",
      width: "calc(360px + 20.5rem)",
    })
  })

  it("el ancho de «Elemento» se recuerda, sin salirse de sus límites", () => {
    expect(loadNameWidth()).toBe(NAME_WIDTH.initial)
    saveNameWidth(400)
    expect(loadNameWidth()).toBe(400)
    localStorage.setItem("cauce.gantt.anchoElemento", "9000")
    expect(loadNameWidth()).toBe(NAME_WIDTH.max)
    localStorage.setItem("cauce.gantt.anchoElemento", "roto")
    expect(loadNameWidth()).toBe(NAME_WIDTH.initial)
  })
})
