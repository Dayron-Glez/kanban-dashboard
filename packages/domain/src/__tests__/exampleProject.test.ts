import { describe, expect, it } from "vitest"
import { fromIsoDate, toIsoDate } from "../planDates"
import { computeSchedule } from "../schedule"
import {
  exampleDependencies,
  exampleElements,
  exampleExpectedDates,
} from "./fixtures/exampleProject"

const isoDates = (result: ReturnType<typeof computeSchedule>, id: string) => {
  const { start, end } = result.get(id)!
  return [start == null ? null : toIsoDate(start), end == null ? null : toIsoDate(end)]
}

describe("aceptación: el proyecto de ejemplo del productor", () => {
  const result = computeSchedule(exampleElements, exampleDependencies)

  it.each(Object.entries(exampleExpectedDates))(
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
    const moved = computeSchedule(
      exampleElements.map((element) =>
        element.id === "rodaje" ? { ...element, fixedStart: fromIsoDate("2027-05-03") } : element
      ),
      exampleDependencies
    )
    expect(isoDates(moved, "desarrollo")).toEqual(exampleExpectedDates.desarrollo)
    expect(isoDates(moved, "preparacion")).toEqual(["2027-03-01", "2027-05-02"])
    expect(isoDates(moved, "postproduccion.vfx.render")).toEqual(["2027-09-29", "2027-10-01"])
  })
})
