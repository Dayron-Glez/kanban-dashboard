import { beforeEach, describe, expect, it } from "vitest"
import { DEFAULT_LEGEND, loadLegend, saveLegend, toggleAllParts } from "../lib/ganttLegend"

beforeEach(() => localStorage.clear())

describe("leyenda del Gantt", () => {
  it("de serie se ve entera, y lo elegido se recuerda", () => {
    expect(loadLegend()).toEqual(DEFAULT_LEGEND)
    saveLegend({ ...DEFAULT_LEGEND, visible: false, today: false })
    expect(loadLegend()).toEqual({ ...DEFAULT_LEGEND, visible: false, today: false })
  })

  it("«Ver todo» enciende lo que falta; con todo encendido, lo apaga", () => {
    const someOff = { ...DEFAULT_LEGEND, bars: false }
    expect(toggleAllParts(someOff)).toEqual(DEFAULT_LEGEND)
    expect(toggleAllParts(DEFAULT_LEGEND)).toEqual({
      visible: true,
      today: false,
      week1: false,
      weekends: false,
      bars: false,
      marks: false,
    })
  })
})
