import { describe, expect, it } from "vitest"
import { buildCalendarTemplate, buildTemplateDependencies } from "../calendarTemplate"
import { EXAMPLE_PROJECT, withExampleRules } from "../exampleProject"
import {
  describePhaseViolation,
  phaseRuleViolations,
  phaseSpansOf,
  type PhaseSpan,
} from "../phaseOrder"
import { fromIsoDate } from "../planDates"
import { computeSchedule } from "../schedule"

const span = (id: string, start: string | null, end: string | null): PhaseSpan => ({
  id,
  start: start ? fromIsoDate(start) : null,
  end: end ? fromIsoDate(end) : null,
})

const names: Record<string, string> = {
  desarrollo: "Desarrollo",
  softpre: "SoftPre",
  preparacion: "Preparación",
  rodaje: "Rodaje",
  post: "Postproducción",
}
const nameOf = (id: string) => names[id] ?? id

// Rodaje dura 6 semanas (42 días): una fase puede meterse en él 10 días como mucho.
const plan = (preparacionEnd = "2027-04-04", preparacionStart = "2027-02-01") => [
  span("softpre", "2026-10-05", "2027-01-31"),
  span("preparacion", preparacionStart, preparacionEnd),
  span("rodaje", "2027-04-05", "2027-05-16"),
  span("post", "2027-04-05", "2027-10-31"),
]

describe("phaseRuleViolations", () => {
  it("el plan en su orden, sin solapes grandes, cumple", () => {
    expect(phaseRuleViolations(plan())).toEqual([])
  })

  it("empezar el mismo día que la anterior vale, y meterse hasta el 25 % también", () => {
    // Rodaje (42 días) se mete en Postproducción (210 días) un 20 %.
    expect(phaseRuleViolations(plan())).toEqual([])
    // 10 días de 42 = 23,8 %: vale.
    expect(phaseRuleViolations(plan("2027-04-14"))).toEqual([])
  })

  it("meterse más del 25 % en la siguiente no vale, y dice cuánto", () => {
    // 11 días de 42 = 26,2 %.
    const violations = phaseRuleViolations(plan("2027-04-15"))
    expect(violations).toEqual([
      { kind: "overlap", phaseId: "preparacion", nextId: "rodaje", days: 11, nextDays: 42 },
    ])
    expect(describePhaseViolation(violations[0]!, nameOf)).toBe(
      "Preparación se metería un 27 % en Rodaje; el máximo es un 25 %"
    )
  })

  it("una fase no puede quedar por delante de la anterior", () => {
    const violations = phaseRuleViolations([
      span("desarrollo", "2027-05-27", "2027-08-26"),
      span("softpre", "2026-10-05", "2027-01-31"),
    ])
    expect(violations).toEqual([{ kind: "order", phaseId: "desarrollo", nextId: "softpre" }])
    expect(describePhaseViolation(violations[0]!, nameOf)).toBe(
      "SoftPre empezaría antes que Desarrollo"
    )
  })

  it("las fases sin fecha no cuentan: se compara con la siguiente que la tenga", () => {
    expect(
      phaseRuleViolations([
        span("desarrollo", "2027-05-27", "2027-08-26"),
        span("softpre", null, null),
        span("preparacion", "2027-02-01", "2027-04-04"),
      ])
    ).toEqual([{ kind: "order", phaseId: "desarrollo", nextId: "preparacion" }])
  })

  it("sin fin no se puede medir el solape: no cuenta", () => {
    expect(
      phaseRuleViolations([
        span("post", "2027-04-05", null),
        span("explotacion", "2027-11-01", null),
      ])
    ).toEqual([])
  })

  it("el proyecto de ejemplo del productor cumple la regla", () => {
    const elements = buildCalendarTemplate("film")
    const dates = computeSchedule(
      elements.map((element) => {
        const duration = EXAMPLE_PROJECT.durations[element.key]
        const fixed = EXAMPLE_PROJECT.fixedStarts[element.key]
        return {
          id: element.key,
          durationAmount: duration?.amount ?? null,
          durationUnit: duration?.unit ?? null,
          isAnchor: element.isAnchor,
          isPinned: element.isPinned,
          fixedStart: fixed ? fromIsoDate(fixed) : null,
        }
      }),
      withExampleRules(buildTemplateDependencies(elements)).map((dependency) => ({
        ...dependency,
        predecessorId: dependency.predecessorKey,
        successorId: dependency.successorKey,
      }))
    )
    const phases = elements
      .filter((element) => element.parentKey == null)
      .sort((a, b) => a.position - b.position)
      .map((element) => ({ id: element.key, ...dates.get(element.key)! }))

    expect(phaseRuleViolations(phases)).toEqual([])
  })
})

describe("phaseSpansOf", () => {
  it("toma las fases (sin padre) en su orden, con sus fechas", () => {
    const element = (id: string, parentId: string | null, position: number) => ({
      id,
      parentId,
      position,
      startsOn: "2027-04-05",
      endsOn: null,
    })
    expect(
      phaseSpansOf([element("b", null, 1), element("hijo", "a", 0), element("a", null, 0)])
    ).toEqual([
      { id: "a", start: fromIsoDate("2027-04-05"), end: null },
      { id: "b", start: fromIsoDate("2027-04-05"), end: null },
    ])
  })
})
