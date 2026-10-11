import { describe, expect, it } from "vitest"
import { fromIsoDate, toIsoDate } from "../planDates"
import {
  computeSchedule,
  ScheduleCycleError,
  type ScheduleDependency,
  type ScheduleElement,
} from "../schedule"

const element = (id: string, overrides: Partial<ScheduleElement> = {}): ScheduleElement => ({
  id,
  durationAmount: null,
  durationUnit: null,
  isAnchor: false,
  isPinned: false,
  fixedStart: null,
  ...overrides,
})

const lasts = (amount: number, unit: ScheduleElement["durationUnit"]) => ({
  durationAmount: amount,
  durationUnit: unit,
})

const anchor = (id: string, start: string, amount: number, unit: ScheduleElement["durationUnit"]) =>
  element(id, { isAnchor: true, fixedStart: fromIsoDate(start), ...lasts(amount, unit) })

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

const datesOf = (result: ReturnType<typeof computeSchedule>, id: string) => {
  const { start, end } = result.get(id)!
  return [start == null ? null : toIsoDate(start), end == null ? null : toIsoDate(end)]
}

describe("computeSchedule", () => {
  it("el ancla da sus dos fechas con su duración", () => {
    const result = computeSchedule([anchor("rodaje", "2027-04-05", 6, "weeks")], [])
    expect(datesOf(result, "rodaje")).toEqual(["2027-04-05", "2027-05-16"])
    expect(result.get("rodaje")!.issue).toBeNull()
  })

  it("los cuatro pares de puntos, con desfase literal", () => {
    const result = computeSchedule(
      [
        anchor("rodaje", "2027-04-05", 6, "weeks"),
        element("con-inicio", lasts(3, "days")),
        element("tras-fin", lasts(2, "weeks")),
        element("antes", lasts(9, "weeks")),
        element("acaba-con", lasts(5, "days")),
      ],
      [
        dep("rodaje", "start", "con-inicio", "start"),
        dep("rodaje", "end", "tras-fin", "start", 1),
        dep("rodaje", "start", "antes", "end", -1),
        dep("rodaje", "end", "acaba-con", "end"),
      ]
    )
    expect(datesOf(result, "con-inicio")).toEqual(["2027-04-05", "2027-04-07"])
    expect(datesOf(result, "tras-fin")).toEqual(["2027-05-17", "2027-05-30"])
    expect(datesOf(result, "antes")).toEqual(["2027-02-01", "2027-04-04"])
    expect(datesOf(result, "acaba-con")).toEqual(["2027-05-12", "2027-05-16"])
  })

  it("«−4 semanas fin de Edición»: 28 días antes, sin días implícitos", () => {
    const result = computeSchedule(
      [anchor("edicion", "2027-04-05", 20, "weeks"), element("vfx", lasts(5, "weeks"))],
      [dep("edicion", "end", "vfx", "start", -4, "weeks")]
    )
    expect(datesOf(result, "edicion")[1]).toBe("2027-08-22")
    expect(datesOf(result, "vfx")).toEqual(["2027-07-25", "2027-08-28"])
  })

  it("con dependencia de inicio y de fin, las fechas salen de ellas y la duración no cuenta", () => {
    const result = computeSchedule(
      [anchor("rodaje", "2027-04-05", 6, "weeks"), element("shooting", lasts(1, "days"))],
      [dep("rodaje", "start", "shooting", "start"), dep("rodaje", "end", "shooting", "end")]
    )
    expect(datesOf(result, "shooting")).toEqual(["2027-04-05", "2027-05-16"])
  })

  it("una cadena se resuelve en orden aunque llegue desordenada", () => {
    const result = computeSchedule(
      [
        element("c", lasts(1, "days")),
        element("b", lasts(1, "days")),
        anchor("a", "2027-01-01", 1, "days"),
      ],
      [dep("b", "end", "c", "start", 1), dep("a", "end", "b", "start", 1)]
    )
    expect(datesOf(result, "c")).toEqual(["2027-01-03", "2027-01-03"])
  })

  it("sin duración se calcula el inicio y el fin queda vacío, con el motivo", () => {
    const result = computeSchedule(
      [anchor("postproduccion", "2027-04-05", 30, "weeks"), element("musica")],
      [dep("postproduccion", "start", "musica", "start")]
    )
    expect(datesOf(result, "musica")).toEqual(["2027-04-05", null])
    expect(result.get("musica")!.issue).toEqual({ code: "missing-duration" })
  })

  it("una duración de 0 cuenta como sin duración", () => {
    const result = computeSchedule([anchor("a", "2027-01-01", 0, "days")], [])
    expect(result.get("a")!.issue).toEqual({ code: "missing-duration" })
  })

  it("si depende del fin de algo sin fin, se queda sin fechas y dice de qué", () => {
    const result = computeSchedule(
      [anchor("a", "2027-01-01", 0, "days"), element("b", lasts(2, "days"))],
      [dep("a", "end", "b", "start", 1)]
    )
    expect(datesOf(result, "b")).toEqual([null, null])
    expect(result.get("b")!.issue).toEqual({ code: "missing-dependency", elementId: "a" })
  })

  it("sin fecha de ancla, todo lo que cuelga de ella queda vacío", () => {
    const result = computeSchedule(
      [
        element("rodaje", { isAnchor: true, ...lasts(6, "weeks") }),
        element("wrap", lasts(2, "weeks")),
      ],
      [dep("rodaje", "end", "wrap", "start", 1)]
    )
    expect(result.get("rodaje")!.issue).toEqual({ code: "missing-date" })
    expect(result.get("wrap")!.issue).toEqual({ code: "missing-dependency", elementId: "rodaje" })
  })

  it("un fijado no se mueve aunque tenga dependencias", () => {
    const result = computeSchedule(
      [
        anchor("rodaje", "2027-04-05", 6, "weeks"),
        element("desarrollo", {
          isPinned: true,
          fixedStart: fromIsoDate("2026-01-01"),
          ...lasts(3, "months"),
        }),
      ],
      [dep("rodaje", "start", "desarrollo", "end", -1)]
    )
    expect(datesOf(result, "desarrollo")).toEqual(["2026-01-01", "2026-03-31"])
  })

  it("sin ancla, fijado ni dependencias, no tiene de dónde sacar fechas", () => {
    const result = computeSchedule([element("suelto", lasts(3, "days"))], [])
    expect(result.get("suelto")).toEqual({ start: null, end: null, issue: { code: "unscheduled" } })
  })

  it("duración decimal: días enteros, y lo siguiente empieza al día siguiente", () => {
    const result = computeSchedule(
      [anchor("a", "2027-03-01", 2.5, "days"), element("b", lasts(1, "days"))],
      [dep("a", "end", "b", "start", 1)]
    )
    expect(datesOf(result, "a")).toEqual(["2027-03-01", "2027-03-02"])
    expect(datesOf(result, "b")[0]).toBe("2027-03-03")
  })

  it("mover el ancla mueve lo que depende de ella", () => {
    const elements = (start: string) => [
      anchor("rodaje", start, 6, "weeks"),
      element("prep", lasts(9, "weeks")),
    ]
    const deps = [dep("rodaje", "start", "prep", "end", -1)]
    expect(datesOf(computeSchedule(elements("2027-04-05"), deps), "prep")).toEqual([
      "2027-02-01",
      "2027-04-04",
    ])
    expect(datesOf(computeSchedule(elements("2027-09-06"), deps), "prep")).toEqual([
      "2027-07-05",
      "2027-09-05",
    ])
  })

  it("detecta un ciclo y dice qué elementos lo forman", () => {
    const run = () =>
      computeSchedule(
        [
          element("a", lasts(1, "days")),
          element("b", lasts(1, "days")),
          element("c", lasts(1, "days")),
        ],
        [
          dep("a", "end", "b", "start"),
          dep("b", "end", "c", "start"),
          dep("c", "end", "a", "start"),
        ]
      )
    expect(run).toThrow(ScheduleCycleError)
    expect(() => run()).toThrow(expect.objectContaining({ path: ["a", "b", "c", "a"] }))
  })

  it("rechaza dos dependencias sobre el mismo extremo", () => {
    expect(() =>
      computeSchedule(
        [
          anchor("a", "2027-01-01", 1, "days"),
          anchor("b", "2027-01-05", 1, "days"),
          element("c", lasts(1, "days")),
        ],
        [dep("a", "end", "c", "start", 1), dep("b", "end", "c", "start", 1)]
      )
    ).toThrow(/mismo extremo/)
  })

  it("ignora las dependencias hacia elementos que no están", () => {
    const result = computeSchedule(
      [anchor("a", "2027-01-01", 1, "days")],
      [dep("borrado", "end", "a", "start", 1)]
    )
    expect(datesOf(result, "a")).toEqual(["2027-01-01", "2027-01-01"])
  })
})
