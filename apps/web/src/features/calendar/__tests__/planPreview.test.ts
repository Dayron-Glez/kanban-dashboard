import type { CalendarElement, CalendarPlan, ElementDependency } from "@repo/contracts"
import { fromIsoDate } from "@repo/domain"
import { describe, expect, it } from "vitest"
import {
  changeForEdit,
  describeChange,
  describeMove,
  describeShift,
  editContext,
  inverseOf,
  previewChange,
  summarizeMoves,
} from "../lib/planPreview"

const element = (
  id: string,
  parentId: string | null,
  overrides: Partial<CalendarElement> = {}
): CalendarElement => ({
  id,
  projectId: "p",
  kind: parentId ? "process" : "phase",
  parentId,
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

const rule = (
  predecessorId: string,
  predecessorPoint: ElementDependency["predecessorPoint"],
  successorId: string,
  successorPoint: ElementDependency["successorPoint"],
  amount: number
): ElementDependency => ({
  id: `${predecessorId}-${successorId}`,
  predecessorId,
  predecessorPoint,
  successorId,
  successorPoint,
  lag: { amount, unit: "days" },
})

// Rodaje (ancla) con su Shooting dentro, y Preparación justo antes.
const plan: CalendarPlan = {
  elements: [
    element("preparacion", null, {
      duration: { amount: 9, unit: "weeks" },
      startsOn: "2027-02-01",
      endsOn: "2027-04-04",
    }),
    element("rodaje", null, {
      isAnchor: true,
      duration: { amount: 6, unit: "weeks" },
      startsOn: "2027-04-05",
      endsOn: "2027-05-16",
    }),
    element("shooting", "rodaje", {
      duration: { amount: 2, unit: "weeks" },
      startsOn: "2027-04-05",
      endsOn: "2027-04-18",
    }),
  ],
  dependencies: [
    rule("rodaje", "start", "preparacion", "end", -1),
    rule("rodaje", "start", "shooting", "start", 0),
  ],
}

describe("previewChange", () => {
  it("mover el rodaje lista lo que se mueve con él, sin el propio rodaje", () => {
    const preview = previewChange(plan, {
      type: "update",
      elementId: "rodaje",
      input: { fixedStart: "2027-04-12" },
    })

    expect(preview).toMatchObject({
      leavesParent: false,
      moved: [
        { id: "preparacion", startShift: 7, endShift: 7 },
        { id: "shooting", startShift: 7, endShift: 7 },
      ],
    })
  })

  it("un cambio que no mueve nada más no tiene nada que enseñar", () => {
    expect(
      previewChange(plan, {
        type: "update",
        elementId: "shooting",
        input: { duration: { amount: 3, unit: "weeks" } },
      })
    ).toEqual({ moved: [], leavesParent: false })
  })

  it("ganar fechas que no se tenían no cuenta como moverse", () => {
    const empty: CalendarPlan = {
      ...plan,
      elements: plan.elements.map((item) => ({ ...item, startsOn: null, endsOn: null })),
    }
    const preview = previewChange(empty, {
      type: "update",
      elementId: "rodaje",
      input: { fixedStart: "2027-04-05" },
    })

    expect(preview).toEqual({ moved: [], leavesParent: false })
  })

  it("avisa si el propio elemento pasa a empezar fuera de su fase", () => {
    const preview = previewChange(plan, {
      type: "set-rule",
      elementId: "shooting",
      point: "start",
      input: { predecessorId: "rodaje", predecessorPoint: "end", lag: { amount: 7, unit: "days" } },
    })

    expect(preview).toMatchObject({ leavesParent: true, moved: [] })
  })

  it("una regla que cerraría un ciclo devuelve el camino", () => {
    // Que Rodaje acabe con su Shooting, que empieza con Rodaje.
    const preview = previewChange(plan, {
      type: "set-rule",
      elementId: "rodaje",
      point: "end",
      input: {
        predecessorId: "shooting",
        predecessorPoint: "end",
        lag: { amount: 0, unit: "days" },
      },
    })

    expect(preview).toEqual({ cycle: ["rodaje", "shooting", "rodaje"] })
  })
})

describe("changeForEdit", () => {
  it("un desfase reescrito conserva de qué depende la regla", () => {
    expect(
      changeForEdit(plan, "preparacion", {
        kind: "lag",
        point: "end",
        lag: { amount: -8, unit: "days" },
      })
    ).toEqual({
      type: "set-rule",
      elementId: "preparacion",
      point: "end",
      input: {
        predecessorId: "rodaje",
        predecessorPoint: "start",
        lag: { amount: -8, unit: "days" },
      },
    })
  })

  it("fijar un elemento manda la fecha en YYYY-MM-DD", () => {
    expect(
      changeForEdit(plan, "shooting", { kind: "pin", date: fromIsoDate("2027-04-07") })
    ).toEqual({
      type: "update",
      elementId: "shooting",
      input: { isPinned: true, fixedStart: "2027-04-07" },
    })
  })

  it("editContext da al motor las fechas guardadas", () => {
    expect(editContext(plan, "preparacion").dates.get("rodaje")?.start).toBe(
      fromIsoDate("2027-04-05")
    )
  })
})

describe("describeShift", () => {
  it("días, semanas, y semanas con días", () => {
    expect(describeShift(3)).toBe("3 días")
    expect(describeShift(-7)).toBe("1 semana")
    expect(describeShift(17)).toBe("2 semanas y 3 días")
  })
})

describe("describeMove y summarizeMoves", () => {
  const change = (
    before: [number | null, number | null],
    after: [number | null, number | null]
  ) => ({
    id: "x",
    before: { start: before[0], end: before[1] },
    after: { start: after[0], end: after[1] },
    startShift: before[0] != null && after[0] != null ? after[0] - before[0] : null,
    endShift: before[1] != null && after[1] != null ? after[1] - before[1] : null,
    leavesParent: false,
  })

  it("lo que nunca tuvo fin se describe por su inicio", () => {
    expect(describeMove(change([10, null], [17, null]))).toBe("se retrasa 1 semana")
  })

  it("distingue retrasar, adelantar, cambiar solo un extremo y quedarse sin fin", () => {
    expect(describeMove(change([10, 20], [3, 13]))).toBe("se adelanta 1 semana")
    expect(describeMove(change([10, 20], [10, 23]))).toBe("inicio igual, fin +3 días")
    expect(describeMove(change([10, 20], [10, null]))).toBe("se queda sin fin")
  })

  it("resume por fases: un solo desfase si todo se mueve igual", () => {
    const summary = summarizeMoves(
      [
        { ...change([10, 20], [17, 27]), id: "rodaje" },
        { ...change([10, 20], [17, 27]), id: "shooting" },
        { ...change([10, null], [17, null]), id: "rodaje" },
      ],
      plan
    )

    expect(summary.headline).toBe("+1 semana")
    expect(summary.groups).toEqual([
      { phaseId: "rodaje", name: "rodaje", color: null, count: 3, label: "+1 semana" },
    ])
  })

  it("sin un desfase común no hay titular, y cada fase dice el suyo", () => {
    const summary = summarizeMoves(
      [
        { ...change([10, 20], [17, 27]), id: "preparacion" },
        { ...change([10, 20], [10, 23]), id: "shooting" },
      ],
      plan
    )

    expect(summary.headline).toBeNull()
    expect(summary.groups.map((group) => group.label)).toEqual([
      "+1 semana",
      "inicio igual, fin +3 días",
    ])
  })
})

describe("describeChange", () => {
  it("nombra el cambio que se va a aplicar", () => {
    expect(
      describeChange(plan, {
        type: "update",
        elementId: "rodaje",
        input: { fixedStart: "2027-04-12" },
      })
    ).toBe("Mover rodaje al 12 abr 2027")
    expect(
      describeChange(plan, {
        type: "update",
        elementId: "preparacion",
        input: { duration: null },
      })
    ).toBe("Cambiar la duración de preparacion")
    expect(
      describeChange(plan, { type: "remove-rule", elementId: "shooting", point: "start" })
    ).toBe("Quitar una regla de shooting")
  })
})

describe("inverseOf", () => {
  it("deshacer una duración vuelve a la que había, también si no había", () => {
    expect(
      inverseOf(plan, { type: "update", elementId: "preparacion", input: { duration: null } })
    ).toEqual({
      type: "update",
      elementId: "preparacion",
      input: { duration: { amount: 9, unit: "weeks" } },
    })
    const sinDuracion = {
      ...plan,
      elements: plan.elements.map((item) => ({ ...item, duration: null })),
    }
    expect(
      inverseOf(sinDuracion, {
        type: "update",
        elementId: "preparacion",
        input: { duration: { amount: 3, unit: "weeks" } },
      })
    ).toEqual({ type: "update", elementId: "preparacion", input: { duration: null } })
  })

  it("deshacer la fecha del ancla vuelve a la de antes", () => {
    expect(
      inverseOf(plan, { type: "update", elementId: "rodaje", input: { fixedStart: "2027-05-03" } })
    ).toEqual({ type: "update", elementId: "rodaje", input: { fixedStart: "2027-04-05" } })
  })

  it("deshacer fijar un elemento lo vuelve a soltar", () => {
    expect(
      inverseOf(plan, {
        type: "update",
        elementId: "shooting",
        input: { isPinned: true, fixedStart: "2027-04-07" },
      })
    ).toEqual({ type: "update", elementId: "shooting", input: { isPinned: false } })
  })

  it("deshacer una regla devuelve la que había en ese extremo, o la quita si no había", () => {
    const setStart = {
      type: "set-rule" as const,
      elementId: "shooting",
      point: "start" as const,
      input: {
        predecessorId: "rodaje",
        predecessorPoint: "end" as const,
        lag: { amount: 1, unit: "days" as const },
      },
    }
    expect(inverseOf(plan, setStart)).toEqual({
      type: "set-rule",
      elementId: "shooting",
      point: "start",
      input: {
        predecessorId: "rodaje",
        predecessorPoint: "start",
        lag: { amount: 0, unit: "days" },
      },
    })
    expect(inverseOf(plan, { ...setStart, point: "end" })).toEqual({
      type: "remove-rule",
      elementId: "shooting",
      point: "end",
    })
  })
})
