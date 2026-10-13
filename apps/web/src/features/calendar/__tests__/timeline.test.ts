import type { CalendarElement, ElementDependency } from "@repo/contracts"
import { fromIsoDate } from "@repo/domain"
import { describe, expect, it } from "vitest"
import { barDragModes, buildTimeline, dragDays, dragTarget } from "../lib/timeline"

const element = (id: string, overrides: Partial<CalendarElement> = {}): CalendarElement => ({
  id,
  projectId: "p",
  kind: "phase",
  parentId: null,
  position: 0,
  name: id,
  color: null,
  templateKey: id,
  duration: { amount: 2, unit: "weeks" },
  startsOn: "2027-04-05",
  endsOn: "2027-04-18",
  isAnchor: false,
  isPinned: false,
  issue: null,
  ...overrides,
})

const rule = (
  successorId: string,
  successorPoint: ElementDependency["successorPoint"],
  predecessorId = "rodaje"
): ElementDependency => ({
  id: `${predecessorId}-${successorId}-${successorPoint}`,
  predecessorId,
  predecessorPoint: successorPoint,
  successorId,
  successorPoint,
  lag: { amount: 0, unit: "days" },
})

describe("dragDays", () => {
  const elements = [element("rodaje")]

  it("ajusta a días con «semanas» y a semanas con «meses»", () => {
    const weeks = buildTimeline(elements, "semanas")!
    const months = buildTimeline(elements, "meses")!

    expect(dragDays(20, weeks)).toBe(3)
    expect(dragDays(20, months)).toBe(7)
    expect(dragDays(6, months)).toBe(0)
    expect(dragDays(-30, months)).toBe(-14)
  })
})

describe("barDragModes", () => {
  it("con las dos fechas atadas a otros no se arrastra, y dice de quién depende", () => {
    const shooting = element("shooting")
    expect(barDragModes(shooting, [rule("shooting", "start"), rule("shooting", "end")])).toEqual({
      locked: true,
      by: ["rodaje"],
    })
  })

  it("el borde del inicio solo se ofrece si el fin se queda donde está", () => {
    expect(barDragModes(element("vfx"), [rule("vfx", "start")])).toEqual({
      locked: false,
      start: false,
      end: true,
    })
    expect(barDragModes(element("softpre"), [rule("softpre", "end")])).toEqual({
      locked: false,
      start: true,
      end: true,
    })
    expect(barDragModes(element("rodaje", { isAnchor: true }), [])).toEqual({
      locked: false,
      start: false,
      end: true,
    })
  })

  it("sin fin no hay borde del fin", () => {
    expect(barDragModes(element("creacion", { endsOn: null }), [])).toMatchObject({ end: false })
  })
})

describe("dragTarget", () => {
  it("mover entera una barra escribe el inicio, salvo si cuelga solo de su fin", () => {
    expect(dragTarget(element("vfx"), [rule("vfx", "start")], "move", 7)).toEqual({
      point: "start",
      date: fromIsoDate("2027-04-12"),
    })
    expect(dragTarget(element("softpre"), [rule("softpre", "end")], "move", -7)).toEqual({
      point: "end",
      date: fromIsoDate("2027-04-11"),
    })
  })

  it("los bordes escriben su fecha", () => {
    expect(dragTarget(element("vfx"), [], "end", 3)).toEqual({
      point: "end",
      date: fromIsoDate("2027-04-21"),
    })
    expect(dragTarget(element("softpre"), [rule("softpre", "end")], "start", -7)).toEqual({
      point: "start",
      date: fromIsoDate("2027-03-29"),
    })
  })
})
