import type { CalendarElement, ElementDependency } from "@repo/contracts"
import { describe, expect, it } from "vitest"
import {
  describeIssue,
  describeRule,
  formatDuration,
  formatPlanDate,
  countDependents,
  durationSuggestions,
  setupSteps,
  summarizePlan,
} from "../lib/planFormat"

const element = (id: string, overrides: Partial<CalendarElement> = {}): CalendarElement => ({
  id,
  projectId: "p",
  kind: "process",
  parentId: "padre",
  position: 0,
  name: id,
  color: null,
  templateKey: id,
  duration: null,
  startsOn: null,
  endsOn: null,
  isAnchor: false,
  isPinned: false,
  issue: null,
  ...overrides,
})

const dep = (
  predecessorId: string,
  predecessorPoint: ElementDependency["predecessorPoint"],
  successorId: string,
  successorPoint: ElementDependency["successorPoint"],
  amount = 0,
  unit: ElementDependency["lag"]["unit"] = "days"
): ElementDependency => ({
  id: `${predecessorId}-${successorId}-${successorPoint}`,
  predecessorId,
  predecessorPoint,
  successorId,
  successorPoint,
  lag: { amount, unit },
})

const names: Record<string, string> = {
  rodaje: "Rodaje",
  edicion: "Edición",
  postproduccion: "Postproducción",
  shooting: "Shooting",
}
const nameOf = (id: string) => names[id] ?? id

describe("formatDuration y formatPlanDate", () => {
  it("singular, plural y decimales con coma", () => {
    expect(formatDuration({ amount: 6, unit: "weeks" })).toBe("6 semanas")
    expect(formatDuration({ amount: 1, unit: "months" })).toBe("1 mes")
    expect(formatDuration({ amount: 2.5, unit: "weeks" })).toBe("2,5 semanas")
    expect(formatDuration({ amount: 3.85, unit: "months" })).toBe("3,85 meses")
  })

  it("fecha corta en español", () => {
    expect(formatPlanDate("2027-04-05")).toBe("5 abr 2027")
  })
})

describe("describeRule", () => {
  it("el ancla y los fijados", () => {
    expect(describeRule(element("rodaje", { isAnchor: true }), [], nameOf)).toBe("Fecha clave")
    expect(describeRule(element("desarrollo", { isPinned: true }), [], nameOf)).toBe("Fecha fija")
  })

  it("empezar con el padre no se dice: es lo esperado", () => {
    expect(
      describeRule(element("musica"), [dep("padre", "start", "musica", "start")], nameOf)
    ).toBeNull()
  })

  it("las reglas de la plantilla, con las palabras del productor", () => {
    const deps = [
      dep("rodaje", "start", "preparacion", "end", -1),
      dep("rodaje", "start", "postproduccion", "start"),
      dep("postproduccion", "end", "explotacion", "start", 1),
      dep("rodaje", "start", "shooting", "start"),
      dep("rodaje", "end", "shooting", "end"),
    ]
    expect(describeRule(element("preparacion"), deps, nameOf)).toBe("Antes del inicio de Rodaje")
    expect(describeRule(element("postproduccion"), deps, nameOf)).toBe("Con el inicio de Rodaje")
    expect(describeRule(element("explotacion"), deps, nameOf)).toBe("Tras el fin de Postproducción")
    expect(describeRule(element("shooting"), deps, nameOf)).toBe("Ocupa lo mismo que Rodaje")
  })

  it("un desfase cualquiera, como las fórmulas del prototipo", () => {
    const deps = [dep("edicion", "end", "vfx", "start", -4, "weeks")]
    expect(describeRule(element("vfx"), deps, nameOf)).toBe("−4 semanas fin de Edición")
  })

  it("sin dependencias ni ancla, no hay regla que contar", () => {
    expect(describeRule(element("suelto"), [], nameOf)).toBeNull()
  })
})

describe("describeIssue", () => {
  it("dice de qué falta la fecha", () => {
    expect(describeIssue({ code: "missing-dependency", elementId: "rodaje" }, nameOf)).toBe(
      "Falta la fecha de Rodaje"
    )
    expect(describeIssue({ code: "missing-duration" }, nameOf)).toBe("Falta la duración")
  })
})

describe("setupSteps", () => {
  const plan = [
    element("desarrollo", { kind: "phase", parentId: null, name: "Desarrollo", isPinned: true }),
    element("softpre", { kind: "phase", parentId: null, name: "SoftPre" }),
    element("preparacion", { kind: "phase", parentId: null, name: "Preparación" }),
    element("rodaje", { kind: "phase", parentId: null, name: "Rodaje", isAnchor: true }),
    element("postproduccion", { kind: "phase", parentId: null, name: "Postproducción" }),
  ]

  it("empieza por el rodaje y sigue por las fases", () => {
    expect(
      setupSteps(plan)
        .filter((step) => !step.done)
        .map((step) => step.label)
    ).toEqual([
      "Fecha de inicio de Rodaje",
      "Duración de Rodaje",
      "Duración de Preparación",
      "Duración de SoftPre",
      "Duración de Postproducción",
      "Fecha de inicio de Desarrollo",
      "Duración de Desarrollo",
    ])
  })

  it("lo que ya está escrito queda marcado como hecho", () => {
    const written = plan.map((candidate) => ({
      ...candidate,
      duration: { amount: 1, unit: "weeks" as const },
      startsOn: "2027-04-05",
    }))
    expect(setupSteps(written).every((step) => step.done)).toBe(true)
  })
})

describe("summarizePlan", () => {
  const element = (id: string, overrides: Partial<CalendarElement>): CalendarElement => ({
    id,
    projectId: "p",
    kind: "phase",
    parentId: null,
    position: 0,
    name: id,
    color: null,
    templateKey: id,
    duration: null,
    startsOn: null,
    endsOn: null,
    isAnchor: false,
    isPinned: false,
    issue: null,
    ...overrides,
  })

  it("el ancla, de dónde a dónde va el plan y cuántas fases no tienen duración", () => {
    const summary = summarizePlan([
      element("desarrollo", {
        startsOn: "2026-01-01",
        endsOn: "2026-03-31",
        duration: { amount: 3, unit: "months" },
      }),
      element("rodaje", {
        isAnchor: true,
        startsOn: "2027-04-05",
        endsOn: "2027-05-16",
        duration: { amount: 6, unit: "weeks" },
      }),
      element("explotacion", { startsOn: "2027-11-01" }),
      element("shooting", { kind: "process", parentId: "rodaje" }),
    ])

    expect(summary.anchor?.id).toBe("rodaje")
    expect(summary.span).toEqual({ start: "2026-01-01", end: "2027-11-01", months: 22 })
    expect(summary.phasesWithoutDuration).toBe(1)
  })

  it("sin fechas, no hay rango", () => {
    expect(summarizePlan([element("rodaje", { isAnchor: true })]).span).toBeNull()
  })
})

describe("durationSuggestions y countDependents", () => {
  it("sugiere según el tipo: meses para una fase, semanas para un proceso, días para una acción", () => {
    expect(durationSuggestions(element("x", { kind: "phase" }))[1]).toEqual({
      amount: 3,
      unit: "months",
    })
    expect(durationSuggestions(element("x", { kind: "process" }))[0]).toEqual({
      amount: 1,
      unit: "weeks",
    })
    expect(durationSuggestions(element("x", { kind: "task" }))[0]).toEqual({
      amount: 1,
      unit: "days",
    })
  })

  it("cuenta lo que se mueve en cadena, sin repetir", () => {
    const deps = [
      dep("rodaje", "start", "preparacion", "end", -1),
      dep("preparacion", "start", "softpre", "end", -1),
      dep("rodaje", "start", "postproduccion", "start"),
      dep("postproduccion", "start", "edicion", "start"),
      dep("rodaje", "end", "edicion", "end"),
    ]
    expect(countDependents(deps, "rodaje")).toBe(4)
    expect(countDependents(deps, "softpre")).toBe(0)
  })
})
