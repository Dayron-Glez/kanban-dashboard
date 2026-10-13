import type { CalendarElement, ElementDependency } from "@repo/contracts"
import { fromIsoDate } from "@repo/domain"
import { describe, expect, it } from "vitest"
import { barDragModes, buildTimeline, dragDays, dragTarget, scrollLeftFor } from "../lib/timeline"

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

describe("buildTimeline", () => {
  // Rodaje del 5 al 18 de abril de 2027; hoy, el 13 de octubre de 2026.
  const timeline = buildTimeline([element("rodaje")], new Date(2026, 9, 13))!

  it("una columna de 28 px por día, desde la semana de hoy hasta 14 días tras el final", () => {
    expect(timeline.pxPerDay).toBe(28)
    expect(timeline.range.start).toBe(fromIsoDate("2026-10-12"))
    expect(timeline.range.end).toBe(fromIsoDate("2027-05-02"))
    expect(timeline.width).toBe(timeline.days.length * 28)
    expect(timeline.today).toBe(fromIsoDate("2026-10-13"))
  })

  it("las semanas cuentan desde la del rodaje", () => {
    expect(timeline.shootWeek).toBe(fromIsoDate("2027-04-05"))
    const shoot = timeline.weeks.find((week) => week.start === fromIsoDate("2027-04-05"))
    expect(shoot?.number).toBe(1)
  })
})

describe("scrollLeftFor", () => {
  const timeline = buildTimeline([element("rodaje")], new Date(2026, 9, 13))!

  it("deja el día a un tercio del ancho visible, y nunca antes del principio", () => {
    // El 5 de abril de 2027 está 175 días después del primer día de la rejilla.
    expect(scrollLeftFor(fromIsoDate("2027-04-05"), timeline, 900)).toBe(175 * 28 + 14 - 300)
    expect(scrollLeftFor(timeline.today, timeline, 900)).toBe(0)
  })
})

describe("dragDays", () => {
  const timeline = buildTimeline([element("rodaje")], new Date(2026, 9, 13))!

  it("los píxeles arrastrados, en días enteros", () => {
    expect(dragDays(20, timeline)).toBe(1)
    expect(dragDays(13, timeline)).toBe(0)
    expect(dragDays(-60, timeline)).toBe(-2)
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
