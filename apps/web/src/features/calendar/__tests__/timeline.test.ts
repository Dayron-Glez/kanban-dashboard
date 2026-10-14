import type { CalendarElement, ElementDependency } from "@repo/contracts"
import { fromIsoDate } from "@repo/domain"
import { describe, expect, it } from "vitest"
import {
  barDragModes,
  buildTimeline,
  cellAt,
  cellAtX,
  cellSpan,
  cellStep,
  dragDays,
  dragTarget,
  scrollLeftFor,
  trackBackground,
} from "../lib/timeline"

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

  it("una columna de 48 px por día, desde la semana de hoy hasta 14 días tras el final", () => {
    expect(timeline.pxPerDay).toBe(48)
    expect(timeline.range.start).toBe(fromIsoDate("2026-10-12"))
    expect(timeline.range.end).toBe(fromIsoDate("2027-05-02"))
    expect(timeline.width).toBe(timeline.days.length * 48)
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
    expect(scrollLeftFor(fromIsoDate("2027-04-05"), timeline, 900)).toBe(175 * 48 + 24 - 300)
    expect(scrollLeftFor(timeline.today, timeline, 900)).toBe(0)
  })
})

describe("trackBackground", () => {
  const timeline = buildTimeline([element("rodaje")], new Date(2026, 9, 13))!

  it("pinta hoy, la semana 1 y los fines de semana, y la leyenda puede apagarlos", () => {
    expect(trackBackground(timeline).backgroundImage?.split("gradient(")).toHaveLength(5)
    expect(
      trackBackground(timeline, { today: false, week1: false, weekends: true }).backgroundImage
    ).toMatch(/^repeating-linear-gradient/)
  })

  it("las líneas entre celdas no se apagan: una por día", () => {
    expect(trackBackground(timeline, { today: false, week1: false, weekends: false })).toEqual({
      backgroundImage: "linear-gradient(90deg, var(--grid-cell) 1px, transparent 1px)",
      backgroundSize: "48px 100%",
      backgroundPosition: "0 0",
      backgroundRepeat: "repeat-x",
    })
  })
})

describe("el zoom", () => {
  const rodaje = [element("rodaje", { startsOn: "2027-04-05", endsOn: "2027-05-16" })]
  const at = (zoom: "dia" | "semana" | "mes") => buildTimeline(rodaje, new Date(2026, 9, 13), zoom)!

  it("una columna por día (48 px), por semana (56 px) o por mes (unos 90 px)", () => {
    expect(at("dia").pxPerDay * 7).toBe(336)
    expect(at("semana").pxPerDay * 7).toBe(56)
    expect(at("mes").pxPerDay * 30).toBe(90)
  })

  it("con semana y mes, el arrastre se ajusta a semanas", () => {
    expect(dragDays(30, at("semana"))).toBe(7)
    expect(dragDays(20, at("semana"))).toBe(0)
    expect(dragDays(-70, at("mes"))).toBe(-21)
  })

  it("los años de la rejilla, para la cabecera de semana y mes", () => {
    expect(at("mes").years.map(({ year }) => year)).toEqual([2026, 2027])
    const days = at("mes").years.reduce((total, year) => total + year.days, 0)
    expect(days).toBe(at("mes").range.days)
  })

  it("los fines de semana solo se sombrean con día", () => {
    expect(trackBackground(at("dia")).backgroundImage).toMatch(/repeating-linear-gradient/)
    expect(trackBackground(at("semana")).backgroundImage).not.toMatch(/repeating-linear-gradient/)
  })
})

describe("las celdas", () => {
  const rodaje = [element("rodaje", { startsOn: "2027-04-05", endsOn: "2027-05-16" })]
  const at = (zoom: "dia" | "semana" | "mes") => buildTimeline(rodaje, new Date(2026, 9, 13), zoom)!
  const day = fromIsoDate("2026-10-15")

  it("una celda es un día, una semana desde el lunes o un mes", () => {
    expect(cellAt(at("dia"), day)).toEqual({ start: day, days: 1 })
    expect(cellAt(at("semana"), day)).toEqual({ start: fromIsoDate("2026-10-12"), days: 7 })
    // El primer mes empieza con la rejilla, el lunes 12.
    expect(cellAt(at("mes"), day)).toEqual({ start: fromIsoDate("2026-10-12"), days: 20 })
    expect(cellAt(at("mes"), fromIsoDate("2026-11-20"))).toEqual({
      start: fromIsoDate("2026-11-01"),
      days: 30,
    })
  })

  it("la celda bajo un punto, sin salirse de la rejilla", () => {
    expect(cellAtX(at("dia"), 3 * 48 + 5).start).toBe(day)
    expect(cellAtX(at("dia"), -40).start).toBe(at("dia").range.start)
    expect(cellAtX(at("dia"), 1e7).start).toBe(at("dia").range.end)
  })

  it("la celda de al lado, sin salir de la rejilla", () => {
    const week = at("semana")
    expect(cellStep(week, cellAt(week, day), 1).start).toBe(fromIsoDate("2026-10-19"))
    expect(cellStep(week, cellAt(week, day), -1)).toEqual(cellAt(week, day))
    const month = at("mes")
    expect(cellStep(month, cellAt(month, day), 1)).toEqual({
      start: fromIsoDate("2026-11-01"),
      days: 30,
    })
  })

  it("un tramo de celdas, en cualquier orden", () => {
    const tramo = { start: fromIsoDate("2026-10-12"), days: 14 }
    expect(cellSpan(at("semana"), fromIsoDate("2026-10-20"), day)).toEqual(tramo)
    expect(cellSpan(at("dia"), day, day - 2)).toEqual({ start: day - 2, days: 3 })
  })

  it("con semana y mes, las líneas van por semana o al empezar cada mes", () => {
    const none = { today: false, week1: false, weekends: false }
    expect(trackBackground(at("semana"), none).backgroundSize).toBe("56px 100%")
    const months = trackBackground(at("mes"), none)
    expect(months.backgroundRepeat?.split(", ")).toHaveLength(at("mes").months.length)
  })
})

describe("dragDays", () => {
  const timeline = buildTimeline([element("rodaje")], new Date(2026, 9, 13))!

  it("los píxeles arrastrados, en días enteros", () => {
    expect(dragDays(25, timeline)).toBe(1)
    expect(dragDays(19, timeline)).toBe(0)
    expect(dragDays(-90, timeline)).toBe(-2)
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
