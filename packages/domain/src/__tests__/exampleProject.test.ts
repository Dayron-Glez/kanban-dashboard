import { describe, expect, it } from "vitest"
import { buildCalendarTemplate, buildTemplateDependencies } from "../calendarTemplate"
import { EXAMPLE_PROJECT, withExampleRules } from "../exampleProject"
import { fromIsoDate, toIsoDate } from "../planDates"
import { computeSchedule } from "../schedule"

// La plantilla de cine con las duraciones, las dos fechas y las reglas propias
// del proyecto de ejemplo: así se prueban a la vez el motor y la plantilla.
const schedule = (fixedStarts = EXAMPLE_PROJECT.fixedStarts) => {
  const elements = buildCalendarTemplate("film")
  return computeSchedule(
    elements.map((element) => {
      const duration = EXAMPLE_PROJECT.durations[element.key]
      const fixed = fixedStarts[element.key]
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
}

const isoDates = (result: ReturnType<typeof computeSchedule>, id: string) => {
  const { start, end } = result.get(id)!
  return [start == null ? null : toIsoDate(start), end == null ? null : toIsoDate(end)]
}

describe("aceptación: el proyecto de ejemplo del productor", () => {
  const result = schedule()

  it.each(Object.entries(EXAMPLE_PROJECT.expectedDates))(
    "%s sale con las mismas fechas que su prototipo",
    (id, expected) => {
      expect(isoDates(result, id)).toEqual(expected)
      expect(result.get(id)!.issue).toBeNull()
    }
  )

  it("Explotación, sin duración, ya sabe cuándo empieza (el prototipo la dejaba vacía)", () => {
    expect(isoDates(result, "explotacion")).toEqual(["2027-11-01", null])
    expect(result.get("explotacion")!.issue).toEqual({ code: "missing-duration" })
  })

  it("mover el rodaje mueve todo lo que cuelga de él, y Desarrollo, fijado, no se mueve", () => {
    const moved = schedule({ ...EXAMPLE_PROJECT.fixedStarts, rodaje: "2027-05-03" })
    expect(isoDates(moved, "desarrollo")).toEqual(EXAMPLE_PROJECT.expectedDates.desarrollo)
    expect(isoDates(moved, "preparacion")).toEqual(["2027-03-01", "2027-05-02"])
    expect(isoDates(moved, "postproduccion.vfx.render")).toEqual(["2027-09-29", "2027-10-01"])
  })

  it("las reglas propias sustituyen a las de la plantilla, sin duplicar extremos", () => {
    const dependencies = withExampleRules(buildTemplateDependencies(buildCalendarTemplate("film")))
    const vfxStart = dependencies.filter(
      (dependency) =>
        dependency.successorKey === "postproduccion.vfx" && dependency.successorPoint === "start"
    )
    expect(vfxStart).toEqual([EXAMPLE_PROJECT.rules[0]])
  })
})
