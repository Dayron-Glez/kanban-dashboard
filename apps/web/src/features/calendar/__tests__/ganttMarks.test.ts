import { beforeEach, describe, expect, it } from "vitest"
import { DEFAULT_MARKS, loadMarks, saveMarks } from "../lib/ganttMarks"

beforeEach(() => localStorage.clear())

describe("marcas del tiempo del Gantt", () => {
  it("de serie se ven todas, y lo elegido se recuerda", () => {
    expect(loadMarks()).toEqual(DEFAULT_MARKS)
    saveMarks({ ...DEFAULT_MARKS, today: false })
    expect(loadMarks()).toEqual({ ...DEFAULT_MARKS, today: false })
  })

  it("conserva lo elegido cuando eran partes de la leyenda", () => {
    localStorage.setItem(
      "cauce.gantt.leyenda",
      JSON.stringify({ visible: false, today: true, week1: false, bars: false })
    )
    expect(loadMarks()).toEqual({ today: true, week1: false, weekends: true })
  })
})
