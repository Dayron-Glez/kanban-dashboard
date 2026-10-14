import { beforeEach, describe, expect, it } from "vitest"
import { DEFAULT_LEGEND, loadLegend, saveLegend } from "../lib/ganttLegend"

beforeEach(() => localStorage.clear())

describe("leyenda del Gantt", () => {
  it("de serie se ve entera, y lo elegido se recuerda", () => {
    expect(loadLegend()).toEqual(DEFAULT_LEGEND)
    saveLegend({ ...DEFAULT_LEGEND, visible: false, today: false })
    expect(loadLegend()).toEqual({ ...DEFAULT_LEGEND, visible: false, today: false })
  })
})
