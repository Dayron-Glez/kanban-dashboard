import { describe, expect, it } from "vitest"
import { fromIsoDate } from "../planDates"
import { moveEnd, moveStart, type PlanEditContext } from "../planEdits"
import type { ScheduleDependency, ScheduledDates, ScheduleElement } from "../schedule"

const d = fromIsoDate

const element = (id: string, overrides: Partial<ScheduleElement> = {}): ScheduleElement => ({
  id,
  durationAmount: null,
  durationUnit: null,
  isAnchor: false,
  isPinned: false,
  fixedStart: null,
  ...overrides,
})

const dep = (
  predecessorId: string,
  predecessorPoint: ScheduleDependency["predecessorPoint"],
  successorId: string,
  successorPoint: ScheduleDependency["successorPoint"],
  lagAmount = 0,
  lagUnit: ScheduleDependency["lagUnit"] = "days"
): ScheduleDependency => ({
  predecessorId,
  predecessorPoint,
  successorId,
  successorPoint,
  lagAmount,
  lagUnit,
})

const dates = (entries: Record<string, [string | null, string | null]>) =>
  new Map<string, ScheduledDates>(
    Object.entries(entries).map(([id, [start, end]]) => [
      id,
      { start: start ? d(start) : null, end: end ? d(end) : null, issue: null },
    ])
  )

// Las fechas del proyecto de ejemplo.
const example = dates({
  rodaje: ["2027-04-05", "2027-05-16"],
  preparacion: ["2027-02-01", "2027-04-04"],
  softpre: ["2026-10-05", "2027-01-31"],
  "rodaje.shooting": ["2027-04-05", "2027-05-16"],
  "rodaje.wrap": ["2027-05-17", "2027-05-30"],
  "postproduccion.edicion": ["2027-04-05", "2027-08-22"],
  "postproduccion.vfx": ["2027-07-25", "2027-08-28"],
})

const context = (
  target: ScheduleElement,
  dependencies: ScheduleDependency[] = []
): PlanEditContext => ({ element: target, dependencies, dates: example })

describe("moveStart", () => {
  const softpre = element("softpre", { durationAmount: 3.85, durationUnit: "months" })
  const softpreRule = [dep("preparacion", "start", "softpre", "end", -1)]

  it("SoftPre al 5 de octubre: 17 semanas, no 3,85 meses", () => {
    expect(moveStart(context(softpre, softpreRule), d("2026-10-05"))).toEqual({
      edit: { kind: "duration", duration: { amount: 17, unit: "weeks" } },
    })
  })

  it("conserva la unidad que había si la cantidad sale entera", () => {
    expect(moveStart(context(softpre, softpreRule), d("2026-11-01"))).toEqual({
      edit: { kind: "duration", duration: { amount: 3, unit: "months" } },
    })
  })

  it("si no salen meses ni semanas enteros, días", () => {
    expect(moveStart(context(softpre, softpreRule), d("2026-10-08"))).toEqual({
      edit: { kind: "duration", duration: { amount: 116, unit: "days" } },
    })
  })

  it("con dependencia de inicio, reescribe su desfase: VFX de −4 a −3 semanas", () => {
    const vfx = element("postproduccion.vfx", { durationAmount: 5, durationUnit: "weeks" })
    const rule = [dep("postproduccion.edicion", "end", "postproduccion.vfx", "start", -4, "weeks")]

    expect(moveStart(context(vfx, rule), d("2027-08-01"))).toEqual({
      edit: { kind: "lag", point: "start", lag: { amount: -3, unit: "weeks" } },
    })
  })

  it("llevarlo justo a la fecha de la que parte deja el desfase en 0", () => {
    const vfx = element("postproduccion.vfx")
    const rule = [dep("postproduccion.edicion", "end", "postproduccion.vfx", "start", -4, "weeks")]

    expect(moveStart(context(vfx, rule), d("2027-08-22"))).toEqual({
      edit: { kind: "lag", point: "start", lag: { amount: 0, unit: "weeks" } },
    })
  })

  it("el ancla y los fijados cambian su fecha", () => {
    const rodaje = element("rodaje", { isAnchor: true, fixedStart: d("2027-04-05") })
    expect(moveStart(context(rodaje), d("2027-05-03"))).toEqual({
      edit: { kind: "fixed-start", date: d("2027-05-03") },
    })
  })

  it("sin dependencias, pasa a ser un fijado", () => {
    expect(moveStart(context(element("suelto")), d("2027-01-01"))).toEqual({
      edit: { kind: "pin", date: d("2027-01-01") },
    })
  })

  it("no puede partir de algo sin fecha", () => {
    const rule = [dep("sin-fecha", "end", "x", "start", 1)]
    expect(moveStart(context(element("x"), rule), d("2027-01-01"))).toEqual({
      error: "missing-reference",
    })
  })

  it("contando hacia atrás, el inicio no puede quedar después del fin", () => {
    expect(moveStart(context(softpre, softpreRule), d("2027-02-15"))).toEqual({
      error: "inverted",
    })
  })
})

describe("moveEnd", () => {
  it("sin dependencia de fin, reescribe la duración en la unidad que había", () => {
    const wrap = element("rodaje.wrap", { durationAmount: 2, durationUnit: "weeks" })
    const rule = [dep("rodaje.shooting", "end", "rodaje.wrap", "start", 1)]

    expect(moveEnd(context(wrap, rule), d("2027-06-06"))).toEqual({
      edit: { kind: "duration", duration: { amount: 3, unit: "weeks" } },
    })
    expect(moveEnd(context(wrap, rule), d("2027-06-02"))).toEqual({
      edit: { kind: "duration", duration: { amount: 17, unit: "days" } },
    })
  })

  it("con dependencia de fin, reescribe su desfase: el Shooting acaba 3 días después de Rodaje", () => {
    const shooting = element("rodaje.shooting")
    const rules = [
      dep("rodaje", "start", "rodaje.shooting", "start"),
      dep("rodaje", "end", "rodaje.shooting", "end"),
    ]

    expect(moveEnd(context(shooting, rules), d("2027-05-19"))).toEqual({
      edit: { kind: "lag", point: "end", lag: { amount: 3, unit: "days" } },
    })
  })

  it("el ancla también cambia su duración al mover el fin", () => {
    const rodaje = element("rodaje", {
      isAnchor: true,
      fixedStart: d("2027-04-05"),
      durationAmount: 6,
      durationUnit: "weeks",
    })
    expect(moveEnd(context(rodaje), d("2027-05-23"))).toEqual({
      edit: { kind: "duration", duration: { amount: 7, unit: "weeks" } },
    })
  })

  it("el fin no puede quedar antes del inicio, ni moverse sin inicio", () => {
    const wrap = element("rodaje.wrap", { durationAmount: 2, durationUnit: "weeks" })
    expect(moveEnd(context(wrap), d("2027-05-10"))).toEqual({ error: "inverted" })
    expect(moveEnd(context(element("sin-fechas")), d("2027-05-10"))).toEqual({
      error: "missing-reference",
    })
  })
})
